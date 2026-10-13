import { FileCheck2 } from "lucide-react";

import { cn } from "@/lib/utils";

// the public reference cue — a count of published off-platform referrals under
// its own label. deliberately NOT a pill/badge: it must never read like the
// Verified badge or the review star, so it is a plain muted metadata line in the
// same voice as the worker's other profile details. renders nothing at zero
type ReferenceCountProps = {
	count: number;
	className?: string;
};

const ReferenceCount = ({ count, className }: ReferenceCountProps) => {
	if (count <= 0) return null;

	return (
		<span
			className={cn(
				"text-muted-foreground inline-flex items-center gap-1.5 text-sm",
				className,
			)}
		>
			<FileCheck2 className="size-4" />
			{count} {count === 1 ? "reference" : "references"}
		</span>
	);
};

export { ReferenceCount };
