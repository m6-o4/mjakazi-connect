import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink } from "lucide-react";

interface DocumentViewCardProps {
	label: string;
	documentId: string;
}

// maps internal document type keys to display labels; kept here for fallback rendering in isolation
const documentTypeLabel: Record<string, string> = {
	national_id: "National ID",
	good_conduct: "Certificate of Good Conduct",
	qualification: "Qualification",
	other: "Other Document",
};

// displays a single vault document with a link that opens it through the secure proxy route,
// so the raw storage URL is never exposed to the browser
const DocumentViewCard = ({ label, documentId }: DocumentViewCardProps) => {
	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div>
				<p className="text-muted-foreground text-sm font-semibold">{label}</p>
				<p className="text-muted-foreground text-sm">
					Securely stored document on your profile.
				</p>
			</div>

			{/* confirmation badge — indicates a document is on record for this type */}
			<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
				<CheckCircle2 className="text-accent size-5 shrink-0" />
				<div className="flex-1">
					<p className="text-accent text-sm font-semibold">Document on record</p>
					<p className="text-muted-foreground text-xs">
						Uploaded and verified by the platform.
					</p>
				</div>
			</div>

			{/* opens the file via the vault proxy; target=_blank so the current page stays open */}
			<Button variant="outline" size="sm" className="w-full gap-2 text-xs" asChild>
				<a
					href={`/apis/vault/mjakazi/${documentId}`}
					target="_blank"
					rel="noopener noreferrer"
				>
					<ExternalLink className="size-3.5" />
					View Document
				</a>
			</Button>
		</div>
	);
};

export { DocumentViewCard };
