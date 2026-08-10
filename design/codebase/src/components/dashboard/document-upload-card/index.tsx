"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, RefreshCw, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface DocumentUploadCardProps {
	documentType: "national_id" | "good_conduct" | "qualification" | "other";
	label: string;
	alreadyUploaded?: boolean;
	existingDocumentId?: string | null;
}

const DocumentUploadCard = ({
	documentType,
	label,
	alreadyUploaded = false,
	existingDocumentId = null,
}: DocumentUploadCardProps) => {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [isImage, setIsImage] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [replacing, setReplacing] = useState(false);

	// unifies the persisted state (from server props) and the just-uploaded state
	// so both render the same confirmed view without a page reload
	const isUploaded = (alreadyUploaded || success) && !replacing;

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files?.[0] ?? null;

		if (!selected) return;

		// mirror the server-side 5 MB guard to give immediate feedback
		if (selected.size > 5 * 1024 * 1024) {
			setError("File must be under 5MB.");
			return;
		}

		setError(null);
		setFile(selected);

		// images get an inline thumbnail; pdfs show a filename + icon instead
		const fileIsImage = selected.type.startsWith("image/");
		setIsImage(fileIsImage);

		if (fileIsImage) {
			setPreview(URL.createObjectURL(selected));
		} else {
			setPreview(null);
		}
	};

	const handleUpload = async () => {
		if (!file) return;
		setUploading(true);
		setError(null);

		const formData = new FormData();
		formData.append("file", file);
		formData.append("documentType", documentType);

		// sending the existing id lets the server atomically delete the old
		// vault record and s3 object before writing the replacement
		if (existingDocumentId) {
			formData.append("existingDocumentId", existingDocumentId);
		}

		try {
			const res = await fetch("/apis/verification/uploads", {
				method: "POST",
				body: formData,
			});

			if (res.ok) {
				setSuccess(true);
				setReplacing(false);
				setFile(null);
				setPreview(null);
				// router.refresh re-runs server component data fetching so sibling
				// cards reflect the updated vault state without a full navigation
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Upload failed. Please try again.");
			}
		} catch {
			setError("Network error. Please check your connection.");
		} finally {
			setUploading(false);
		}
	};

	const handleStartReplace = () => {
		setReplacing(true);
		setFile(null);
		setPreview(null);
		setError(null);
	};

	const handleCancelReplace = () => {
		setReplacing(false);
		setFile(null);
		setPreview(null);
		setError(null);
	};

	// confirmed state — document is on record; replace action re-enters the form
	if (isUploaded) {
		return (
			<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
				<div>
					<p className="text-muted-foreground text-sm font-semibold">{label}</p>
					<p className="text-muted-foreground text-sm">
						Upload a clear image or PDF document.
					</p>
				</div>
				<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
					<CheckCircle2 className="text-accent size-5 shrink-0" />
					<div className="flex-1">
						<p className="text-accent text-sm font-semibold">Document uploaded</p>
						<p className="text-muted-foreground text-xs">
							Your {label.toLowerCase()} has been received.
						</p>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleStartReplace}
					className="w-full gap-2 text-xs"
				>
					<RefreshCw className="size-3.5" />
					Replace Document
				</Button>
			</div>
		);
	}

	// upload / replace form — used for both first-time uploads and replacements
	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div className="flex items-start justify-between gap-2">
				<div>
					<p className="text-muted-foreground text-sm font-semibold">{label}</p>
					<p className="text-muted-foreground text-sm">
						Upload a clear image or PDF document.
					</p>
				</div>
				{replacing && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleCancelReplace}
						className="text-muted-foreground h-7 px-2 text-xs"
					>
						Cancel
					</Button>
				)}
			</div>

			<div className="flex flex-col gap-3">
				{/* clicking anywhere in the drop zone triggers the hidden file input */}
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="border-border bg-muted/40 hover:bg-muted/70 group relative flex min-h-30 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed px-4 py-5 text-center transition-colors"
				>
					{file ? (
						isImage && preview ? (
							// object url preview for images — revoked on unmount by the browser
							<>
								<img
									src={preview}
									alt="Document preview"
									className="max-h-50 w-full rounded object-contain"
								/>
								<span className="text-muted-foreground text-xs">{file.name}</span>
							</>
						) : (
							// pdfs and other non-image files get a name + size summary instead
							<>
								<div className="bg-primary/10 flex size-12 items-center justify-center rounded-lg">
									<FileText className="text-primary size-6" />
								</div>
								<span className="text-foreground text-sm font-medium">{file.name}</span>
								<span className="text-muted-foreground text-xs">
									{(file.size / 1024).toFixed(0)} KB · PDF
								</span>
							</>
						)
					) : (
						// prompt shown before a file is selected
						<>
							<UploadCloud className="text-muted-foreground size-6" />
							<span className="text-muted-foreground text-sm">
								Click to choose a file
							</span>
							<span className="text-muted-foreground/60 text-xs">
								JPG, PNG or PDF · Max 5MB
							</span>
						</>
					)}
				</button>

				{/* visually hidden; the drop zone button acts as the trigger */}
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*,application/pdf"
					className="sr-only"
					onChange={handleFileChange}
				/>

				<Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
					{uploading ? "Uploading..." : replacing ? "Upload Replacement" : "Upload"}
				</Button>
			</div>

			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
};

export { DocumentUploadCard };
