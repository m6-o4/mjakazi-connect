"use client";

import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

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
import { notifySuccess } from "@/lib/notify";
import {
	DOCUMENT_SLOTS,
	documentSideLabel,
	documentSlotKey,
	documentSlotLabel,
	isDocumentSetComplete,
} from "@/lib/vault";

type DocumentInfo = {
	id: string;
	documentType: string;
	side: string;
	filename: string | null;
};

type DocumentNextStep = {
	href: string;
	label: string;
	description: string;
};

type DocumentVaultProps = {
	documents: DocumentInfo[];
	isVerified?: boolean;
	// the next step once every required slot is uploaded, resolved by the server
	// page from the verification state. it is passed ungated on purpose: the
	// render that supplies it happens before the upload that completes the set,
	// so gating it here would be gating it on a stale list. completeness is
	// decided from the live client state below
	nextStep?: DocumentNextStep | null;
};

// one card per document, one slot per side of it. uploading persists
// immediately, re-uploading a slot replaces only that slot, and removal is
// guarded by a confirmation. documents are only ever opened through the audited
// /api/actions/vault/{id} route
const DocumentVault = ({
	documents,
	isVerified = false,
	nextStep = null,
}: DocumentVaultProps) => {
	const [docs, setDocs] = useState<DocumentInfo[]>(documents);
	const [uploading, setUploading] = useState<string | null>(null);
	const [removing, setRemoving] = useState<string | null>(null);
	const [confirmingSlot, setConfirmingSlot] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

	// fire documents_uploaded and the "you're done" toast once, on the transition
	// to every required slot being present. the side effects live in an effect
	// rather than inside the setDocs updater: an updater must stay pure, and
	// react double-invokes it in development, which fired the event twice
	const firedComplete = useRef(isDocumentSetComplete(docs));
	const complete = isDocumentSetComplete(docs);

	useEffect(() => {
		if (!isDocumentSetComplete(docs) || firedComplete.current) return;
		firedComplete.current = true;
		posthog.capture("documents_uploaded");
		notifySuccess("Documents complete", {
			id: "documents-complete",
			description: nextStep
				? `All required documents are uploaded. Next: ${nextStep.label.toLowerCase()}.`
				: "All required documents are uploaded.",
		});
	}, [docs, nextStep]);

	const upload = async (documentType: string, side: string, file: File) => {
		const key = documentSlotKey(documentType, side);
		setUploading(key);
		setErrors((prev) => ({ ...prev, [key]: "" }));
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("documentType", documentType);
			formData.append("side", side);

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
					[key]: result.error ?? "Could not upload the document.",
				}));
				return;
			}

			const uploaded = result.document;
			// the merge runs inside the updater so two slots uploaded in quick
			// succession cannot read the same stale list and drop each other
			setDocs((prev) => [
				...prev.filter((doc) => documentSlotKey(doc.documentType, doc.side) !== key),
				uploaded,
			]);
		} catch {
			setErrors((prev) => ({ ...prev, [key]: "Could not upload the document." }));
		} finally {
			setUploading(null);
		}
	};

	const remove = async (documentType: string, side: string, id: string) => {
		const key = documentSlotKey(documentType, side);
		setRemoving(id);
		setErrors((prev) => ({ ...prev, [key]: "" }));
		try {
			const response = await fetch(`/api/actions/vault/${id}`, { method: "DELETE" });
			const result = (await response.json()) as { success: boolean; error?: string };

			if (!result.success) {
				setErrors((prev) => ({
					...prev,
					[key]: result.error ?? "Could not remove the document.",
				}));
				return;
			}

			setDocs((prev) => prev.filter((doc) => doc.id !== id));
		} catch {
			setErrors((prev) => ({ ...prev, [key]: "Could not remove the document." }));
		} finally {
			setRemoving(null);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 md:grid-cols-2">
				{DOCUMENT_SLOTS.map((document) => (
					<Card key={document.value}>
						<CardHeader>
							<CardTitle>{document.label}</CardTitle>
							<CardDescription>{document.description}</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							<p className="text-muted-foreground text-xs">
								JPG, PNG, WebP or PDF, up to 5MB.
							</p>

							{document.slots.map(({ side }) => {
								const key = documentSlotKey(document.value, side);
								const doc = docs.find(
									(entry) => documentSlotKey(entry.documentType, entry.side) === key,
								);
								const isUploading = uploading === key;
								const label = documentSlotLabel(document.value, side);
								const hasSides = document.slots.length > 1;

								return (
									<div
										key={key}
										className="border-border flex flex-col gap-3 rounded-lg border p-3"
									>
										<div className="flex items-center justify-between gap-2">
											{hasSides ? (
												<span className="text-foreground text-sm font-semibold">
													{documentSideLabel(side)}
												</span>
											) : (
												<span className="sr-only">{document.label}</span>
											)}
											{doc ? <Badge>Uploaded</Badge> : null}
										</div>

										{doc ? (
											<>
												<span className="text-muted-foreground truncate text-xs">
													{doc.filename ?? "Document"}
												</span>
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
														onClick={() => inputRefs.current[key]?.click()}
														disabled={isUploading || removing === doc.id}
													>
														Replace
													</Button>
													{!isVerified ? (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => setConfirmingSlot(key)}
															disabled={removing === doc.id}
														>
															Remove
														</Button>
													) : null}
												</div>
											</>
										) : (
											<div className="flex flex-wrap items-center justify-between gap-3">
												<div className="text-muted-foreground flex items-center gap-2">
													{document.value === "national_id" ? (
														<FileText className="size-4 shrink-0" />
													) : (
														<ShieldCheck className="size-4 shrink-0" />
													)}
													<p className="text-sm">Not uploaded yet</p>
												</div>
												<Button
													type="button"
													size="sm"
													onClick={() => inputRefs.current[key]?.click()}
													disabled={isUploading}
												>
													{isUploading ? "Uploading..." : "Upload"}
												</Button>
											</div>
										)}

										{errors[key] && (
											<p className="text-destructive text-xs">{errors[key]}</p>
										)}

										<input
											ref={(el) => {
												inputRefs.current[key] = el;
											}}
											type="file"
											accept="application/pdf,image/jpeg,image/png,image/webp"
											className="hidden"
											onChange={(event) => {
												const file = event.target.files?.[0];
												if (file) void upload(document.value, side, file);
												event.target.value = "";
											}}
										/>

										<AlertDialog
											open={confirmingSlot === key}
											onOpenChange={(open) => {
												if (!open) setConfirmingSlot(null);
											}}
										>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Remove {label}?</AlertDialogTitle>
													<AlertDialogDescription>
														This deletes the document. You can upload a new one at any
														time.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancel</AlertDialogCancel>
													<AlertDialogAction
														variant="destructive"
														onClick={() => {
															if (doc) void remove(document.value, side, doc.id);
															setConfirmingSlot(null);
														}}
													>
														Remove
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								);
							})}
						</CardContent>
					</Card>
				))}
			</div>

			{complete && nextStep ? (
				<div className="border-success/40 bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-2">
						<CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
						<div className="flex flex-col gap-1">
							<span className="text-heading font-semibold">
								All required documents uploaded
							</span>
							<span className="text-muted-foreground text-sm">
								{nextStep.description}
							</span>
						</div>
					</div>
					<Link href={nextStep.href} className={buttonVariants()}>
						{nextStep.label}
						<ArrowRight className="size-4" />
					</Link>
				</div>
			) : null}
		</div>
	);
};

export { DocumentVault };
export type { DocumentNextStep };
