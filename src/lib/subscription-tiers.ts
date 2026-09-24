// the mwajiri plan list is deliberately bounded: the owner must not be able to
// overwhelm a mwajiri with plan options, so at least one plan and at most four
// may be configured. these bounds are the single source both the payload admin
// panel (via the array's minRows/maxRows) and the custom settings form enforce
const MIN_SUBSCRIPTION_TIERS = 1;
const MAX_SUBSCRIPTION_TIERS = 4;

export { MAX_SUBSCRIPTION_TIERS, MIN_SUBSCRIPTION_TIERS };
