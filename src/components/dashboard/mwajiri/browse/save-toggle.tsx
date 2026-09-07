"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { toggleSaveAction } from "@/app/actions/saved";
import { Button } from "@/components/ui/button";

type SaveToggleProps = {
	mjakaziId: string;
	initiallySaved: boolean;
};

// the save / unsave control on a browse detail. calls the server action, updates
// the local state, fires `profile_saved`, then refreshes so the server-rendered
// saved list stays in sync
const SaveToggle = ({ mjakaziId, initiallySaved }: SaveToggleProps) => {
	const router = useRouter();
	const [saved, setSaved] = useState(initiallySaved);
	const [busy, setBusy] = useState(false);

	const toggle = async () => {
		setBusy(true);
		try {
			const result = await toggleSaveAction({ mjakaziId });
			if (result.success) {
				const next = result.saved ?? !saved;
				setSaved(next);
				posthog.capture("profile_saved", { saved: next });
				router.refresh();
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<Button
			type="button"
			variant={saved ? "default" : "outline"}
			size="sm"
			onClick={toggle}
			disabled={busy}
			className="gap-1.5"
		>
			<Bookmark className={`size-4 ${saved ? "fill-current" : ""}`} />
			{saved ? "Saved" : "Save"}
		</Button>
	);
};

export { SaveToggle };
