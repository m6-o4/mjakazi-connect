import { ExternalLink, FileText } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/vault";

type ReviewDocument = {
	id: string;
	documentType: string;
	filename: string | null;
};

type DocumentViewerProps = {
	documents: ReviewDocument[];
};

// renders each identity document in an iframe pointed at the audited vault route
// (/api/actions/vault/{id}), which authorizes the viewer, writes the
// document_viewed audit entry, then redirects to a short-lived signed url. the
// document bytes never reach this page's payload
const DocumentViewer = ({ documents }: DocumentViewerProps) => {
	const slots = DOCUMENT_TYPE_OPTIONS.map((option) => ({
		label: option.label,
		document: documents.find((doc) => doc.documentType === option.value),
	}));

	return (
		<div className="grid gap-4 md:grid-cols-2">
			{slots.map(({ label, document }) => (
				<Card key={label}>
					<CardHeader>
						<CardTitle className="text-base">{label}</CardTitle>
						<CardDescription className="truncate">
							{document ? (document.filename ?? "Uploaded document") : "Not uploaded"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{document ? (
							<div className="flex flex-col gap-2">
								<div className="border-border overflow-hidden rounded-md border">
									<iframe
										title={label}
										src={`/api/actions/vault/${document.id}`}
										className="h-72 w-full"
									/>
								</div>
								<a
									href={`/api/actions/vault/${document.id}`}
									target="_blank"
									rel="noreferrer"
									className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
								>
									<ExternalLink className="size-3.5" />
									Open in new tab
								</a>
							</div>
						) : (
							<div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
								<FileText className="text-muted-foreground size-6" />
								<p className="text-muted-foreground text-sm">No document uploaded.</p>
							</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
};

export { DocumentViewer };
export type { ReviewDocument };
