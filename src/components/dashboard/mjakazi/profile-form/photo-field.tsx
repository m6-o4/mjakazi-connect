"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type PhotoFieldProps = {
	photoUrl: string | null;
	onUploaded: (
		photo: { id: string; url: string | null },
		profileComplete: boolean,
	) => void;
};

// uploads the profile photo independently of the rest of the form, so it can
// persist immediately with a preview rather than waiting for the save button
const PhotoField = ({ photoUrl, onUploaded }: PhotoFieldProps) => {
	const [preview, setPreview] = useState<string | null>(photoUrl);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const upload = async (file: File) => {
		setUploading(true);
		setError(null);
		try {
			const formData = new FormData();
			formData.append("file", file);

			const response = await fetch("/api/actions/profile/photo", {
				method: "POST",
				body: formData,
			});
			const result = (await response.json()) as {
				success: boolean;
				photo?: { id: string; url: string | null };
				profileComplete?: boolean;
				error?: string;
			};

			if (!result.success || !result.photo) {
				setError(result.error ?? "Could not upload the photo.");
				return;
			}

			setPreview(result.photo.url ?? URL.createObjectURL(file));
			onUploaded(result.photo, result.profileComplete ?? false);
		} catch {
			setError("Could not upload the photo.");
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			<Label>
				<span>
					Profile photo
					<span className="text-destructive" aria-hidden="true">
						{" "}
						*
					</span>
				</span>
			</Label>
			<div className="flex items-center gap-4">
				{preview ? (
					// eslint-disable-next-line @next/next/no-img-element -- the preview may be a blob URL, which next/image cannot optimize
					<img
						src={preview}
						alt="Profile photo"
						className="size-20 rounded-lg object-cover"
					/>
				) : (
					<div className="bg-muted text-muted-foreground flex size-20 items-center justify-center rounded-lg text-sm">
						No photo
					</div>
				)}
				<div className="flex flex-col gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => inputRef.current?.click()}
						disabled={uploading}
					>
						{uploading ? "Uploading..." : preview ? "Change photo" : "Upload photo"}
					</Button>
					<p className="text-muted-foreground text-xs">JPG, PNG or WebP, up to 5MB.</p>
				</div>
			</div>
			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) void upload(file);
					event.target.value = "";
				}}
			/>
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
};

export { PhotoField };
