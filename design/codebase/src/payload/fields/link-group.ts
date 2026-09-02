import type { ArrayField, Field } from "payload";

import { link } from "@/payload/fields/link";
import type { LinkAppearances } from "@/payload/fields/link";
import deepMerge from "@/payload/utilities/deep-merge";

type LinkGroupType = (options?: {
	appearances?: LinkAppearances[] | false;
	overrides?: Partial<ArrayField>;
}) => Field;

const linkGroup: LinkGroupType = ({ appearances, overrides = {} } = {}) => {
	const generatedLinkGroup: Field = {
		name: "links",
		type: "array",
		fields: [link({ appearances })],
		admin: { initCollapsed: true },
	};

	return deepMerge(generatedLinkGroup, overrides);
};

export { linkGroup };
