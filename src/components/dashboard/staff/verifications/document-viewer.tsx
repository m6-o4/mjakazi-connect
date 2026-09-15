import { ExternalLink, FileText } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DOCUMENT_SLOTS, documentSideLabel, normalizeDocumentSide } from "@/lib/vault";

type ReviewDocument = {
	id: string;
	documentType: string;
	side: string;
	filename: string | null;
};

type DocumentViewerProps = {
	documents: ReviewDocument[];
};

// renders every side of each identity document in an iframe pointed at the
// audited vault route (/api/actions/vault/{id}), which authorizes the viewer,
// writes the document_viewed audit entry, then redirects to a short-lived signed
// url. the document bytes never reach this page's payload
const DocumentViewer = ({ documents }: DocumentViewerProps) => {
	const groups = DOCUMENT_SLOTS.map((document) => ({
		label: document.label,
		sides: document.slots.map(({ side }) => ({
			side,
			sideLabel: document.slots.length > 1 ? documentSideLabel(side) : null,
			document: documents.find(
				(doc) =>
					doc.documentType === document.value && normalizeDocumentSide(doc.side) === side,
			),
		})),
	}));

	return (
		<div className="grid gap-4 md:grid-cols-2">
			{groups.map(({ label, sides }) => (
				<Card key={label}>
					<CardHeader>
						<CardTitle className="text-base">{label}</CardTitle>
						<CardDescription>
							{sides.filter((side) => side.document).length} of {sides.length} uploaded
						</CardDescription>
					</CardHeader>
					<CardContent className={cn("grid gap-4", sides.length > 1 && "sm:grid-cols-2")}>
						{sides.map(({ side, sideLabel, document }) => (
							<div key={side} className="flex flex-col gap-2">
								{sideLabel ? (
									<p className="text-foreground text-sm font-semibold">{sideLabel}</p>
								) : null}
								{document ? (
									<>
										<div className="border-border overflow-hidden rounded-md border">
											<iframe
												title={sideLabel ? `${label} — ${sideLabel}` : label}
												src={`/api/actions/vault/${document.id}`}
												className="h-72 w-full"
											/>
										</div>
										<span className="text-muted-foreground truncate text-xs">
											{document.filename ?? "Uploaded document"}
										</span>
										<a
											href={`/api/actions/vault/${document.id}`}
											target="_blank"
											rel="noreferrer"
											className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
										>
											<ExternalLink className="size-3.5" />
											Open in new tab
										</a>
									</>
								) : (
									<div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
										<FileText className="text-muted-foreground size-6" />
										<p className="text-muted-foreground text-sm">No document uploaded.</p>
									</div>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			))}
		</div>
	);
};

export { DocumentViewer };
export type { ReviewDocument };
