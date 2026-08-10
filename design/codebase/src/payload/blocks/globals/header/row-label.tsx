"use client";

import { RowLabelProps, useRowLabel } from "@payloadcms/ui";

// generates dynamic descriptive titles for navigation items in the admin dashboard
const RowLabel = (_props: RowLabelProps) => {
	// accesses the specific row data to pull contextual information for the label
	const data = useRowLabel<{ link?: { label?: string } }>();

	// falls back to a generic name if the user hasn't specified a link label yet
	const label = data?.data?.link?.label
		? `Navigation Item ${data.rowNumber !== undefined ? data.rowNumber + 1 : ""}: ${data?.data?.link?.label}`
		: `Navigation row`;

	return <div>{label}</div>;
};

export { RowLabel };
