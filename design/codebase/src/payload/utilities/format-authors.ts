import { Post } from "@/payload-types";

// converts an array of populated authors into a clean, human-readable string.
// handles proper english joining with commas and 'and' for the last item.
const formatAuthors = (
	authors: NonNullable<NonNullable<Post["populatedAuthors"]>[number]>[],
) => {
	// extract only author names, excluding any null or undefined entries
	const authorNames = authors.map((author) => author.name).filter(Boolean);

	// handle empty or single author cases
	if (authorNames.length === 0) return "";
	if (authorNames.length === 1) return authorNames[0];

	// handle two authors (no comma before 'and')
	if (authorNames.length === 2) return `${authorNames[0]} and ${authorNames[1]}`;

	// handle three or more authors with oxford-comma style joining
	return `${authorNames.slice(0, -1).join(", ")} and ${authorNames[authorNames.length - 1]}`;
};

export { formatAuthors };
