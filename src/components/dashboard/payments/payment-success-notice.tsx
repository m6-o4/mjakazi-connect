import { CheckCircle2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type PaymentSuccessNoticeProps = {
	title: string;
	description: string;
};

// explicit "payment received" confirmation. a neutral card with the success
// colour carried only by the icon and heading — per ui-rules, card surfaces
// stay neutral and colour lives inside the card
const PaymentSuccessNotice = ({ title, description }: PaymentSuccessNoticeProps) => (
	<Card className="border-success/40">
		<CardContent className="flex items-start gap-3 pt-(--card-spacing)">
			<CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" />
			<div className="flex flex-col gap-1">
				<span className="text-heading font-semibold">{title}</span>
				<span className="text-muted-foreground text-sm">{description}</span>
			</div>
		</CardContent>
	</Card>
);

export { PaymentSuccessNotice };
