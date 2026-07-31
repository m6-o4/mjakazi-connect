// formats a date string into a readable, user-friendly format.
// shows relative time for recent dates (e.g., "5 minutes ago")
// and full date format for older entries (e.g., "january 15, 2025").
const formatDate = (dateString?: string | null): string => {
	if (!dateString) return "Unknown date";

	const date = new Date(dateString);

	if (isNaN(date.getTime())) return "Invalid date";

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays < 1) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		// handle time differences under an hour
		if (diffHours < 1) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			return diffMinutes <= 1
				? "Just now"
				: `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
		}

		// return hours ago for same-day entries
		return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
	}

	// handle dates within the past week
	if (diffDays < 7) {
		return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
	}

	// fallback to full localized date format for older entries
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

export { formatDate };
