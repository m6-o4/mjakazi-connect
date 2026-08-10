import { Container } from "@/components/container";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import { ContentEditor } from "@/payload-types";

// map background variant selection to tailwind utility classes
const bgMap: Record<string, string> = { subtle: "bg-bg-subtle", white: "bg-bg-white" };

const ContentEditorBlock = ({
	backgroundVariant = "subtle",
	editor,
	headline,
	headlineDescription,
}: ContentEditor) => {
	// fallback to subtle background if variant is undefined or invalid
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-subtle";

	return (
		<section className={cn("", backgroundClass)}>
			<Container className="my-5">
				{/* render optional header section if headline or description exists */}
				{(headline || headlineDescription) && (
					<div className="mb-12 flex flex-col items-end justify-between md:flex-row">
						<div>
							{headline && (
								<h2 className="font-display text-text-default mb-4 text-3xl font-bold md:text-4xl">
									{headline}
								</h2>
							)}
							{headlineDescription && (
								<p className="text-muted-foreground">{headlineDescription}</p>
							)}
						</div>
					</div>
				)}

				{/* render rich text content with constrained width for readability */}
				{editor && (
					<RichText className="mx-auto max-w-4xl" data={editor} enableGutter={false} />
				)}
			</Container>
		</section>
	);
};

export { ContentEditorBlock };
