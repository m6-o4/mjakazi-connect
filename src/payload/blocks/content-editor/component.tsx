import { Container } from "@/components/container";
import { RichText } from "@/components/payload/rich-text";
import { cn } from "@/lib/utils";
import { ContentEditor } from "@/payload-types";

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

const ContentEditorBlock = ({
	backgroundVariant = "background",
	editor,
	headline,
	headlineDescription,
}: ContentEditor) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-background";

	return (
		<section className={cn("", backgroundClass)}>
			<Container className="my-5">
				{(headline || headlineDescription) && (
					<div className="mb-12 flex flex-col items-end justify-between md:flex-row">
						<div>
							{headline && (
								<h2 className="text-heading mb-4 text-3xl font-semibold md:text-4xl">
									{headline}
								</h2>
							)}
							{headlineDescription && (
								<p className="text-muted-foreground">{headlineDescription}</p>
							)}
						</div>
					</div>
				)}

				{editor && (
					<RichText className="mx-auto max-w-4xl" data={editor} enableGutter={false} />
				)}
			</Container>
		</section>
	);
};

export { ContentEditorBlock };
