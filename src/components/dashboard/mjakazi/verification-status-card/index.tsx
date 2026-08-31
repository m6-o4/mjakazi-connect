import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DocumentStatus = {
	label: string;
	uploaded: boolean;
};

type VerificationStatusCardProps = {
	documents: DocumentStatus[];
};

// the post-profile step of the verification journey. shows which documents are
// still missing and, once both are uploaded, that the worker is ready to be
// verified. the payment and review states slot in here as they land in later
// phases
const VerificationStatusCard = ({ documents }: VerificationStatusCardProps) => {
	const allUploaded = documents.every((document) => document.uploaded);

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{allUploaded ? "You're ready for verification" : "Upload your documents"}
				</CardTitle>
				<CardDescription>
					{allUploaded
						? "Your profile and documents are complete. You'll be able to submit them for verification soon."
						: "Your profile is complete. Add the two documents below so our team can verify you."}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<ul className="flex flex-col gap-1">
					{documents.map((document) => (
						<li key={document.label}>
							<Link
								href={document.uploaded ? "#" : "/dashboard/mjakazi/documents"}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
									document.uploaded ? "cursor-default" : "hover:bg-muted",
								)}
							>
								{document.uploaded ? (
									<CheckCircle2 className="text-accent size-4 shrink-0" />
								) : (
									<Circle className="text-muted-foreground size-4 shrink-0" />
								)}
								<span
									className={cn(
										document.uploaded
											? "text-muted-foreground line-through"
											: "text-foreground",
									)}
								>
									{document.label}
								</span>
								{!document.uploaded && (
									<ArrowRight className="text-muted-foreground ml-auto size-3.5" />
								)}
							</Link>
						</li>
					))}
				</ul>

				{!allUploaded && (
					<Link href="/dashboard/mjakazi/documents" className={buttonVariants()}>
						Upload documents
					</Link>
				)}
			</CardContent>
		</Card>
	);
};

export { VerificationStatusCard };
