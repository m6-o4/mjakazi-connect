"use client";

import { useState } from "react";
import { Briefcase, CheckCircle2, XCircle } from "lucide-react";

interface EoiEntry {
	id: string;
	mwajiriDisplayName: string;
	mwajiriOrganization: string | null;
	mwajiriEmail: string;
	status: "pending" | "interested" | "not_interested";
	createdAt: string;
}

interface EoiInboxProps {
	eois: EoiEntry[];
}

const EoiInbox = ({ eois: initialEois }: EoiInboxProps) => {
	const [eois, setEois] = useState<EoiEntry[]>(initialEois);
	const [loadingId, setLoadingId] = useState<string | null>(null);

	// process user response to eoi
	const handleResponse = async (
		eoiId: string,
		newStatus: "interested" | "not_interested",
	) => {
		setLoadingId(eoiId);

		try {
			const res = await fetch("/apis/eoi/respond", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ eoiId, status: newStatus }),
			});

			if (res.ok) {
				setEois((prev) =>
					prev.map((e) => (e.id === eoiId ? { ...e, status: newStatus } : e)),
				);
			}
		} catch {
			// silent fail — the ui reverts naturally on next page load
		} finally {
			setLoadingId(null);
		}
	};

	// render empty state when no eois
	if (eois.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
				<Briefcase className="text-muted-foreground/40 mb-3 size-10" />
				<p className="text-foreground text-sm font-semibold">
					No expressions of interest yet
				</p>
				<p className="text-muted-foreground mt-1 text-xs">
					When a Mwajiri sends you an expression of interest it will appear here.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-card border-border overflow-hidden rounded-xl border">
			<div className="border-border border-b px-6 py-4">
				<p className="text-foreground text-sm font-semibold">Expressions of Interest</p>
				<p className="text-muted-foreground mt-0.5 text-xs">
					{eois.length} employer{eois.length !== 1 ? "s" : ""} have expressed interest in
					hiring you.
				</p>
			</div>

			{/* render list of eoi entries */}
			<div className="divide-border divide-y">
				{eois.map((eoi) => {
					const isLoading = loadingId === eoi.id;
					const senderLine = eoi.mwajiriOrganization
						? `${eoi.mwajiriDisplayName} — ${eoi.mwajiriOrganization}`
						: eoi.mwajiriDisplayName;

					return (
						<div
							key={eoi.id}
							className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex flex-col gap-0.5">
								<p className="text-foreground text-sm font-semibold">{senderLine}</p>
								<p className="text-muted-foreground text-xs">{eoi.mwajiriEmail}</p>
								<p className="text-muted-foreground text-xs">
									{new Date(eoi.createdAt).toLocaleDateString("en-KE", {
										day: "numeric",
										month: "short",
										year: "numeric",
									})}
								</p>
							</div>

							<div className="flex shrink-0 items-center gap-2">
								{/* conditional rendering for interactive vs static state */}
								{eoi.status === "pending" ? (
									<>
										<button
											onClick={() => handleResponse(eoi.id, "interested")}
											disabled={isLoading}
											className="border-accent/30 text-accent hover:bg-accent/10 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
										>
											<CheckCircle2 className="size-3.5" />
											Interested
										</button>
										<button
											onClick={() => handleResponse(eoi.id, "not_interested")}
											disabled={isLoading}
											className="border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
										>
											<XCircle className="size-3.5" />
											Not Interested
										</button>
									</>
								) : (
									<span
										className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
											eoi.status === "interested"
												? "bg-accent/10 text-accent"
												: "bg-muted text-muted-foreground"
										}`}
									>
										{eoi.status === "interested" ? (
											<CheckCircle2 className="size-3" />
										) : (
											<XCircle className="size-3" />
										)}
										{eoi.status === "interested" ? "Interested" : "Not Interested"}
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export { EoiInbox };
