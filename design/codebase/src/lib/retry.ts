// provides a simple mechanism for retrying asynchronous operations that may fail due to transient issues
export async function retry<T>(
	fn: () => Promise<T>,
	retries = 6,
	delay = 300,
): Promise<T | null> {
	for (let i = 0; i < retries; i++) {
		const result = await fn();

		// returns the result immediately upon the first successful execution
		if (result) {
			return result;
		}

		// introduces a fixed delay between attempts to allow system state to stabilize
		await new Promise((resolve) => setTimeout(resolve, delay));
	}

	// returns null if the operation fails to produce a result within the specified number of attempts
	return null;
}
