import type { Page } from "@/payload-types";
import { CallToActionBlock } from "@/payload/blocks/call-to-action/component";
import { ContentEditorBlock } from "@/payload/blocks/content-editor/component";
import { FeaturesBlock } from "@/payload/blocks/features/component";
import { FormBlock } from "@/payload/blocks/forms/component";
import { HeroPrimaryBlock } from "@/payload/blocks/hero-primary/component";
import { HeroSecondaryBlock } from "@/payload/blocks/hero-secondary/component";
import { HowItWorksBlock } from "@/payload/blocks/how-it-works/component";
import { PostsArchiveBlock } from "@/payload/blocks/posts-archive/component";
import { PricingBlock } from "@/payload/blocks/pricing/component";
import { RegistrationBlock } from "@/payload/blocks/registration/component";
import { TestimonialsBlock } from "@/payload/blocks/testimonials/component";
import { WajakaziArchiveBlock } from "@/payload/blocks/wajakazi-archive/component";
import { ComponentType, Fragment } from "react";

// maps Payload block type slugs to their React components — add new block types here to make them renderable
const blockComponents = {
	callToAction: CallToActionBlock,
	contentEditor: ContentEditorBlock,
	features: FeaturesBlock,
	form: FormBlock,
	heroPrimary: HeroPrimaryBlock,
	heroSecondary: HeroSecondaryBlock,
	howItWorks: HowItWorksBlock,
	postsArchive: PostsArchiveBlock,
	pricing: PricingBlock,
	registration: RegistrationBlock,
	testimonials: TestimonialsBlock,
	wajakaziArchive: WajakaziArchiveBlock,
} as const;

type BlockKey = keyof typeof blockComponents;

// Payload returns null for empty relations; recursively converts nulls to undefined to keep prop contracts predictable
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

// iterates the page layout, resolves each block to its component, and renders them in order
export const RenderBlocks = ({ blocks }: RenderBlocksProps) => {
	if (!Array.isArray(blocks) || blocks.length === 0) return null;

	return (
		<Fragment>
			{blocks.map((block, index) => {
				const Component = blockComponents[block.blockType as BlockKey];
				if (!Component) return null;

				const normalized = normalizeBlock(block);

				// casting through unknown widens the discriminated union so TypeScript accepts generic prop spreading
				const safeProps = normalized as unknown as Record<string, unknown>;
				const TypedComponent = Component as unknown as ComponentType<
					Record<string, unknown>
				>;

				return <TypedComponent key={index} {...safeProps} />;
			})}
		</Fragment>
	);
};
