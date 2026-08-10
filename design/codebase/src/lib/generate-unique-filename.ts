const generateUniqueFilename = (originalName: string): string => {
	// find the last dot to correctly handle names like "my.report.pdf"
	const lastDot = originalName.lastIndexOf(".");
	const hasExtension = lastDot !== -1;

	const base = hasExtension ? originalName.slice(0, lastDot) : originalName;
	const ext = hasExtension ? originalName.slice(lastDot) : "";

	// base-36 gives a compact alphanumeric suffix; slicing off the leading "0."
	// and taking 6 chars balances collision resistance with readability
	const suffix = Math.random().toString(36).slice(2, 8);

	// suffix is inserted before the extension so the file type remains identifiable
	return `${base}-${suffix}${ext}`;
};

export { generateUniqueFilename };
