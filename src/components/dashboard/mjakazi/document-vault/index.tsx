"use client";

import { FileText, ShieldCheck } from "lucide-react";
import posthog from "posthog-js";
import { useRef, useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/vault";

type DocumentInfo = {
	id: string;
	documentType: string;
	filename: string | null;
};

type DocumentVaultProps = {
	documents: DocumentInfo[];
};

// the two document slots (national id + certificate of good conduct). uploading
// persists immediately, re-uploading a type replaces it, and removal is guarded
// by a confirmation. documents are only ever opened through the audited
// /api/actions/vault/{id} route
const DocumentVault = ({ documents }: DocumentVaultProps) => {
	const [docs, setDocs] = useState<DocumentInfo[]>(documents);
	const [uploading, setUploading] = useState<string | null>(null);
	const [removing, setRemoving] = useState<string | null>(null);
	const [confirmingType, setConfirmingType] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	const bothInitiallyPresent = DOCUMENT_TYPE_OPTIONS.every(({ value }) =>
		documents.some((doc) => doc.documentType === value),
	);
	const firedBoth = useRef(bothInitiallyPresent);

	const upload = async (documentType: string, file: File) => {
		setUploading(documentType);
		setErrors((prev) => ({ ...prev, [documentType]: "" }));
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("documentType", documentType);

			const response = await fetch("/api/actions/vault", {
				method: "POST",
				body: formData,
			});
			const result = (await response.json()) as {
				success: boolean;
				document?: DocumentInfo;
				error?: string;
			};

			if (!result.success || !result.document) {
				setErrors((prev) => ({
					...prev,
					[documentType]: result.error ?? "Could not upload the document.",
				}));
				return;
			}

			const next = [
				...docs.filter((doc) => doc.documentType !== documentType),
				result.document,
			];
			setDocs(next);

			// fire documents_uploaded once, on the transition to both present
			const hasBoth = DOCUMENT_TYPE_OPTIONS.every(({ value }) =>
				next.some((doc) => doc.documentType === value),
			);
			if (hasBoth && !firedBoth.current) {
				posthog.capture("documents_uploaded");
				firedBoth.current = true;
			}
		} catch {
			setErrors((prev) => ({
				...prev,
				[documentType]: "Could not upload the document.",
			}));
		} finally {
			setUploading(null);
		}
	};

	const remove = async (documentType: string, id: string) => {
		setRemoving(id);
		setErrors((prev) => ({ ...prev, [documentType]: "" }));
		try {
			const response = await fetch(`/api/actions/vault/${id}`, { method: "DELETE" });
			const result = (await response.json()) as { success: boolean; error?: string };

			if (!result.success) {
				setErrors((prev) => ({
					...prev,
					[documentType]: result.error ?? "Could not remove the document.",
				}));
				return;
			}

			setDocs((prev) => prev.filter((doc) => doc.id !== id));
		} catch {
			setErrors((prev) => ({
				...prev,
				[documentType]: "Could not remove the document.",
			}));
		} finally {
			setRemoving(null);
		}
	};

	return (
		<div className="grid gap-4 md:grid-cols-2">
			{DOCUMENT_TYPE_OPTIONS.map(({ value, label }) => {
				const doc = docs.find((d) => d.documentType === value);
				const isUploading = uploading === value;

				return (
					<Card key={value}>
						<CardHeader>
							<CardTitle>{label}</CardTitle>
							<CardDescription>
								{value === "national_id"
									? "Shown to our team to confirm your identity."
									: "Shown to our team to confirm your clean record."}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							{doc ? (
								<>
									<div className="flex items-center gap-2">
										<Badge>Uploaded</Badge>
										<span className="text-muted-foreground truncate text-xs">
											{doc.filename ?? "Document"}
										</span>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<a
											href={`/api/actions/vault/${doc.id}`}
											target="_blank"
											rel="noreferrer"
											className={buttonVariants({ variant: "outline", size: "sm" })}
										>
											View
										</a>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => inputRefs.current[value]?.click()}
											disabled={isUploading}
										>
											Replace
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setConfirmingType(value)}
											disabled={removing === doc.id}
										>
											Remove
										</Button>
									</div>
								</>
							) : (
								<div className="flex flex-col gap-3">
									<div className="text-muted-foreground flex items-center gap-2">
										{value === "national_id" ? (
											<FileText className="size-5 shrink-0" />
										) : (
											<ShieldCheck className="size-5 shrink-0" />
										)}
										<p className="text-sm">
											Upload a photo or PDF (JPG, PNG, WebP or PDF, up to 5MB).
										</p>
									</div>
									<div>
										<Button
											type="button"
											onClick={() => inputRefs.current[value]?.click()}
											disabled={isUploading}
										>
											{isUploading ? "Uploading..." : "Upload"}
										</Button>
									</div>
								</div>
							)}

							{errors[value] && (
								<p className="text-destructive text-xs">{errors[value]}</p>
							)}

							<input
								ref={(el) => {
									inputRefs.current[value] = el;
								}}
								type="file"
								accept="application/pdf,image/jpeg,image/png,image/webp"
								className="hidden"
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) void upload(value, file);
									event.target.value = "";
								}}
							/>

							<AlertDialog
								open={confirmingType === value}
								onOpenChange={(open) => {
									if (!open) setConfirmingType(null);
								}}
							>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Remove {label}?</AlertDialogTitle>
										<AlertDialogDescription>
											This deletes the document. You can upload a new one at any time.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											variant="destructive"
											onClick={() => {
												if (doc) void remove(value, doc.id);
												setConfirmingType(null);
											}}
										>
											Remove
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

export { DocumentVault };
