"use client";

import { Footer } from "@/payload-types";

import { RowLabelProps, useRowLabel } from "@payloadcms/ui";

// maps complex footer array items to a single type for label processing
type FooterItem =
	| NonNullable<NonNullable<Footer["waajiri"]>["mwajiriItems"]>[number]
	| NonNullable<NonNullable<Footer["wajakazi"]>["wajakaziItems"]>[number]
	| NonNullable<NonNullable<Footer["legal"]>["legalItems"]>[number];

// customizes the admin panel row display for clearer section identification
const RowLabel = (_props: RowLabelProps) => {
	const data = useRowLabel<FooterItem>();
	const sectionName = data.path.includes("mwaajiriItems")
		? "Mwajiri"
		: data.path.includes("wajakaziItems")
			? "Wajakazi"
			: data.path.includes("legalItems")
				? "Legal"
				: "Navigation";

	const label = data?.data?.link?.label
		? `${sectionName} Item ${data.rowNumber !== undefined ? data.rowNumber + 1 : ""}: ${data?.data?.link?.label}`
		: `${sectionName} row`;

	return <div>{label}</div>;
};

export { RowLabel };
