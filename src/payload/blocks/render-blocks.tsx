import { ComponentType, Fragment } from "react";
import type { Page } from "@/payload-types";
import { ArchiveBlock } from "@/payload/blocks/archive/component";

// defines which payload block types map to which react components.
// this acts as a registry that drives dynamic page rendering.
const blockComponents = { archive: ArchiveBlock } as const;

type BlockKey = keyof typeof blockComponents;

// sanitizes payload data by recursively replacing null values with undefined
// prevents react warnings and maintains predictable prop behavior
function normalizeBlock<T>(value: T): T {
	if (value === null) return undefined as unknown as T;

	if (Array.isArray(value)) return value.map(normalizeBlock) as unknown as T;

	if (typeof value === "object" && value !== undefined) {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, normalizeBlock(v)]),
		) as T;
	}

	return value;
}

interface RenderBlocksProps {
	blocks: NonNullable<Page["layout"]>;
}

// dynamically renders blocks defined in payload cms.
// each block type is matched to its component, normalized, and safely passed as props.
// casting through 'unknown' is intentional to satisfy typescript's strictness
// when widening discriminated unions into generic record props
const RenderBlocks = ({ blocks }: RenderBlocksProps) => {
	if (!Array.isArray(blocks) || blocks.length === 0) return null;

	return (
		<Fragment>
			{blocks.map((block, index) => {
				const Component = blockComponents[block.blockType as BlockKey];

				if (!Component) {
					if (process.env.NODE_ENV !== "production") {
						console.warn(
							`RenderBlocks: no component registered for block type "${(block as { blockType?: unknown }).blockType}". Add it to blockComponents in render-blocks.tsx.`,
						);
					}
					return null;
				}

				const normalized = normalizeBlock(block);

				// acknowledge and explicitly widen block data for runtime-safe prop spreading
				const {
					id: _id,
					blockType: _blockType,
					blockName: _blockName,
					...safeProps
				} = normalized as unknown as Record<string, unknown>;

				// safely cast component type to accept the widened props
				const TypedComponent = Component as unknown as ComponentType<
					Record<string, unknown>
				>;

				return (
					<TypedComponent
						key={
							typeof (block as { id?: unknown }).id === "string"
								? ((block as { id?: string }).id as string)
								: index
						}
						{...safeProps}
					/>
				);
			})}
		</Fragment>
	);
};

export { RenderBlocks };
