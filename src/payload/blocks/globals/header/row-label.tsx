"use client";

import { RowLabelProps, useRowLabel } from "@payloadcms/ui";

// generates dynamic descriptive titles for navigation items in the admin dashboard
const RowLabel = (_props: RowLabelProps) => {
	const data = useRowLabel<{ link?: { label?: string } }>();

	const label = data?.data?.link?.label
		? `Navigation Item ${data.rowNumber !== undefined ? data.rowNumber + 1 : ""}: ${data?.data?.link?.label}`
		: `Navigation row`;

	return <div>{label}</div>;
};

export { RowLabel };
