// kenyan phone number normalization. numbers are stored as 254 + nine digits
// beginning with 7 or 1 — number portability means the prefix no longer
// identifies the network, so nothing here infers a carrier

const KENYAN_PHONE_PATTERN = /^254[17]\d{8}$/;

// normalizes common input shapes to the canonical 254XXXXXXXXX form, or returns
// null when the input cannot be a valid kenyan mobile number
const normalizeKenyanPhone = (input: string): string | null => {
	const cleaned = input.replace(/[\s()-]/g, "");

	// strip a leading + and any leading zeros after an optional country code
	let digits = cleaned.replace(/^\+/, "");
	if (digits.startsWith("254")) {
		digits = `254${digits.slice(3).replace(/^0+/, "")}`;
	} else {
		digits = digits.replace(/^0+/, "");
	}

	if (digits.length === 9) {
		digits = `254${digits}`;
	}

	return KENYAN_PHONE_PATTERN.test(digits) ? digits : null;
};

const isValidKenyanPhone = (input: string): boolean =>
	normalizeKenyanPhone(input) !== null;

export { isValidKenyanPhone, normalizeKenyanPhone };
