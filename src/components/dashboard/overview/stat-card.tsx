import Link from "next/link";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type StatCardProps = {
	label: string;
	value: number;
	description?: string;
	href?: string;
};

// a single at-a-glance metric on a role's overview. optionally a link so the
// number doubles as a shortcut to the screen it describes
const StatCard = ({ label, value, description, href }: StatCardProps) => {
	const card = (
		<Card className="h-full">
			<CardHeader>
				<CardTitle className="text-base">{label}</CardTitle>
				{description ? <CardDescription>{description}</CardDescription> : null}
			</CardHeader>
			<CardContent>
				<p className="text-heading text-3xl font-semibold">{value}</p>
			</CardContent>
		</Card>
	);

	if (href) {
		return (
			<Link href={href} className="transition-opacity hover:opacity-80">
				{card}
			</Link>
		);
	}

	return card;
};

export { StatCard };
