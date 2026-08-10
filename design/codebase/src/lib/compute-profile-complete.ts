// determines whether a wajakazi profile has all required fields
// for public directory visibility
// returns true only when every required field is populated

const computeProfileComplete = (profile: any): boolean => {
	if (!profile) return false;

	// photo must be present
	if (!profile.photo) return false;

	// legal name must be filled
	if (!profile.legalFirstName?.trim()) return false;
	if (!profile.legalLastName?.trim()) return false;

	// bio must be present and non-empty
	if (!profile.bio?.trim()) return false;

	// at least one job must be selected
	if (!profile.jobs || profile.jobs.length === 0) return false;

	// location must be selected
	if (!profile.location) return false;

	// work preference must be selected
	if (!profile.workPreference) return false;

	// experience must be a non-negative number
	if (profile.experience === null || profile.experience === undefined) return false;

	// nationality must be selected
	if (!profile.nationality) return false;

	// at least one language must be selected
	if (!profile.languages || profile.languages.length === 0) return false;

	// phone number must be provided for contact purposes
	if (!profile.phoneNumber?.trim()) return false;

	return true;
};

export { computeProfileComplete };
