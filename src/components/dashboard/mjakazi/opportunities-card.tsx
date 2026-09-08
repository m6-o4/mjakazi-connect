import { Inbox } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type OpportunitiesCardProps = {
	pendingCount: number;
};

// the opportunities summary on the mjakazi overview — mirrors the verification
// box: a title, a one-line status, and a link into the full opportunities inbox.
// `pendingCount` is the number of expressions of interest awaiting a response.
const OpportunitiesCard = ({ pendingCount }: OpportunitiesCardProps) => {
	const hasPending = pendingCount > 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Inbox className="text-accent size-5 shrink-0" />
					Opportunities
				</CardTitle>
				<CardDescription>
					{hasPending
						? `You have ${pendingCount} ${pendingCount === 1 ? "interest" : "interests"} awaiting your response.`
						: "Waajiri interested in hiring you will appear here."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Link href="/dashboard/mjakazi/opportunities" className={buttonVariants()}>
					Review opportunities
				</Link>
			</CardContent>
		</Card>
	);
};

export { OpportunitiesCard };
