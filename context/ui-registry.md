# UI Registry

## Purpose

A living catalog of every UI component built in this project. Read this before creating
any new component to check for existing patterns to reuse or match. Updated after every
component is built (via the `/imprint` skill) so the registry never drifts from the actual
codebase.

## How to Use

- **Before building**: search this file for a similar existing component before creating a
  new one.
- **After building**: add an entry for the new component, following the format below.

## Component Entry Format

### `ComponentName`

- **Location**: `src/components/...`
- **Purpose**: what it's for
- **Props**: key props and their types
- **Visual pattern**: tokens/variants used, notable styling decisions
- **Used in**: pages/components that consume it

---

## Components

### `SignOutButton`

- **Location**: `src/components/dashboard/sign-out-button.tsx`
- **Purpose**: Graceful client-side sign-out for the authenticated dashboard
- **Props**: None
- **Visual pattern**: shadcn `Button` variant `ghost`; calls
  `useClerk().signOut({ redirectUrl: "/" })`
- **Used in**: `Topbar`

### `Sidebar`

- **Location**: `src/components/dashboard/sidebar.tsx`
- **Purpose**: Role-scoped dashboard navigation rail (desktop only — `hidden md:flex`)
- **Props**: `{ role: Role }`
- **Visual pattern**: `bg-card` + `border-border` right border, `text-heading` wordmark,
  `bg-primary/10 text-primary` active nav link; reads `getNavItems` from
  `lib/dashboard-nav.ts`
- **Used in**: `(saas)/dashboard/layout.tsx`

### `MobileNav`

- **Location**: `src/components/dashboard/mobile-nav.tsx`
- **Purpose**: Hamburger-triggered left `Sheet` holding the same nav as the sidebar, for
  `< md`
- **Props**: `{ role: Role }`
- **Visual pattern**: `Button` variant `ghost` size `icon` trigger (`md:hidden`),
  `SheetContent side="left"`, active link `bg-primary/10 text-primary`
- **Used in**: `Topbar`

### `Topbar`

- **Location**: `src/components/dashboard/topbar.tsx`
- **Purpose**: Dashboard header with the signed-in user's chip and sign-out
- **Props**: `{ user: User }`
- **Visual pattern**: `border-border` bottom border,
  `text-foreground`/`text-muted-foreground` name + email, hosts `MobileNav` (left) and
  `SignOutButton`; email hidden below `sm`
- **Used in**: `(saas)/dashboard/layout.tsx`

### `Toaster`

- **Location**: `src/components/ui/toast.tsx` (shadcn Base UI toast; pre-existing, mounted
  this session)
- **Purpose**: App-wide toast host for the SaaS group. Renders the `ToastProvider`,
  portal, viewport, and list for the module-scope `toast` manager, which any client
  component can call directly with
  `toast.add({ id, type, title, description, timeout, priority })`
- **Visual pattern**: `bg-popover` card, `rounded-2xl`, bottom-center on mobile and
  bottom-right on `sm`+ via `ToastViewport`; `ToastIcon` renders per `type` (success /
  info / warning / error / loading). Reuse a stable `id` per action so repeat toasts
  upsert instead of stacking. `ToastDescription` renders a `<div>` (not the default `<p>`)
  so a description can carry block content such as a bulleted `<ul>`. Prefer the
  `notifySuccess` / `notifyInfo` / `notifyError` helpers in `src/lib/notify.ts` over
  calling `toast.add` directly, so the defaults stay consistent
- **Used in**: `(saas)/layout.tsx` (wraps `<main>`); consumed so far by `ProfileForm`

### `ProfileCompletenessCard`

- **Location**: `src/components/dashboard/mjakazi/profile-completeness-card/index.tsx`
- **Purpose**: Progress bar + checklist of the 11 required profile fields; each incomplete
  item links to the profile form
- **Props**: `{ items: { label: string; complete: boolean; href: string }[] }`
- **Visual pattern**: shadcn `Card`; `bg-muted` track + `bg-primary` fill;
  `CheckCircle2`/`Circle` icons from lucide in `text-accent`/`text-muted-foreground`
- **Used in**: `(saas)/dashboard/mjakazi/page.tsx`

### `ProfileForm`

- **Location**: `src/components/dashboard/mjakazi/profile-form/index.tsx`
- **Purpose**: The mjakazi profile form (identity + professional + work sections) with
  react-hook-form + zod
- **Props**:
  `{ initialValues: ProfileFormValues; photo: { id: string; url: string | null } | null; initialProfileComplete: boolean }`
- **Visual pattern**: sectioned shadcn `Card`s; `grid gap-4 md:grid-cols-2` field layout;
  validates on blur and re-validates on change (`mode: "onTouched"`), and a failed submit
  focuses the first invalid field. Required asterisks derive from a single exported list
  (`PROFILE_UI_REQUIRED_FIELDS` = the completeness set + `displayName`), so they can never
  drift from the completeness checklist; the legend states these are needed for
  verification and that a partial profile can be saved. Partial saves are allowed (Model
  A), and save feedback is toast-only: success when complete, an info toast listing the
  still-missing fields from `PROFILE_REQUIRED_LABELS` when incomplete, and an error toast
  on failure (all with the shared `id: "profile-save"` so they upsert rather than stack).
  Fires `profile_completed` PostHog event on the first false→true completeness transition.
  The Professional card renders `EmploymentHistoryField` between the
  years-of-experience/education grid and the languages chips — employment history is
  optional, so it carries no asterisk and does not appear in the completeness checklist.
  The mobile phone `Input` (`type="tel"`, placeholder `0712 345 678`) is seeded by the
  page through `formatKenyanPhone`, so a stored canonical number reads in the local `0…`
  form the user actually types; the shared schema still accepts any form and normalises on
  save
- **Used in**: `(saas)/dashboard/mjakazi/profile/page.tsx`

### `FormSelect`

- **Location**: `src/components/dashboard/mjakazi/profile-form/form-select.tsx`
- **Purpose**: Bridges a single-select shadcn `Select` (Base UI) to react-hook-form
- **Props**:
  `{ name: SelectFieldName; label; options: readonly { label; value: string }[]; placeholder?; required? }`
  where `SelectFieldName` is the six top-level selects plus
  `employmentHistory.${number}.role`. The union is written explicitly rather than widened
  to `FieldPath`, which keeps the value typed and documents where the component may be
  used
- **Visual pattern**: `Label` + `Select`/`SelectTrigger`/`SelectContent`;
  `text-destructive` error line. Uses `useController` (not `Controller`) so the error
  comes from that field's own `fieldState` — a nested array path cannot be read out of
  `formState.errors` by indexing
- **Used in**: `ProfileForm`, `EmploymentHistoryField`

### `OptionChips`

- **Location**: `src/components/dashboard/mjakazi/profile-form/option-chips.tsx`
- **Purpose**: Tap-to-toggle chip multi-select for `jobsSkills` and `languages`
- **Props**: `{ name; label; options: readonly { label; value: string }[] }`
- **Visual pattern**: pill `button`s; selected =
  `border-primary bg-primary text-primary-foreground`, unselected =
  `border-border text-foreground hover:bg-muted`
- **Used in**: `ProfileForm`

### `PhotoField`

- **Location**: `src/components/dashboard/mjakazi/profile-form/photo-field.tsx`
- **Purpose**: Uploads the profile photo independently (persists immediately with preview)
  via `POST /api/actions/profile/photo`
- **Props**: `{ photoUrl: string | null; onUploaded: (photo, profileComplete) => void }`
- **Visual pattern**: `size-20` preview; `Button` variant `outline`;
  `text-muted-foreground` helper line
- **Used in**: `ProfileForm`

### `FormDatePicker`

- **Location**: `src/components/dashboard/mjakazi/profile-form/form-date-picker.tsx`
- **Purpose**: shadcn `Calendar` + `Popover` date picker bridged to react-hook-form;
  stores a `YYYY-MM-DD` string
- **Props**: `{ name: DateFieldName; label: string; placeholder? }` where `DateFieldName`
  is `dateOfBirth`, `availableFrom`, or `employmentHistory.${number}.startDate` /
  `.endDate`
- **Visual pattern**: `PopoverTrigger` styled with
  `buttonVariants({ variant: "outline" })`; `Calendar` `mode="single"`; `Clear` ghost
  button when set. Uses `useController` so the error comes from that field's own
  `fieldState`, which is what makes a nested array path work
- **Used in**: `ProfileForm`, `EmploymentHistoryField`

### `EmploymentHistoryField`

- **Location**:
  `src/components/dashboard/mjakazi/profile-form/employment-history-field.tsx`
- **Purpose**: The repeatable editor for up to 5 previous placements (`employer`, `role`,
  `startDate`, `endDate`). Optional display content — no asterisks, not part of
  `profileComplete`, and editing it never sends a verified worker back to `pending_review`
- **Props**: none — reads the form through `useFormContext`, driven by `useFieldArray` on
  `employmentHistory`
- **Visual pattern**: plain `border-border rounded-lg border p-4` block per row
  (deliberately not a `Card`, since it sits inside the Professional `Card`); "Placement N"
  label + ghost `Remove` button; `grid gap-4 md:grid-cols-2` with the employer `Input`
  spanning both columns and a helper line steering away from full names and contact
  details; `Plus` icon on an outline "Add placement" button, disabled at
  `MAX_EMPLOYMENT_ENTRIES` with a "maximum" hint; empty state is a muted one-liner. Remove
  has no `AlertDialog` because nothing persists until "Save profile". The employer value
  is published on the public profile, so the shared schema rejects phone numbers and email
  addresses in it — the rejection surfaces as that row's normal field error
- **Used in**: `ProfileForm` (Professional card, after years of experience + education
  level and before languages)

### `DocumentVault`

- **Location**: `src/components/dashboard/mjakazi/document-vault/index.tsx`
- **Purpose**: One card per identity document, with a slot per side — National ID and
  Certificate of Good Conduct both captured as front and back. Upload, replace, view and
  remove are per slot, and each remove is guarded by a confirmation
- **Props**:
  `{ documents: { id: string; documentType: string; side: string; filename: string | null }[]; isVerified?: boolean; locked?: boolean; nextStep?: DocumentNextStep | null }`
  where `DocumentNextStep` = `{ href, label, description }`, exported from the same file.
  `nextStep` is passed **ungated** on purpose: the server render that supplies it predates
  the upload that completes the set, so completeness is decided here, from the live client
  `docs` state — gating it on the server list would gate it on a stale one. `locked` is
  true while the profile is `pending_review`; the server refuses the write regardless, so
  it only turns failed clicks into a visible locked state (`View` stays enabled, the
  `upload`/`remove` handlers early-return, and both the file inputs and the upload,
  replace and remove buttons are disabled). The page banner above the vault says why.
- **Visual pattern**: a `flex flex-col gap-6` wrapper holding one shadcn `Card` per entry
  in `DOCUMENT_SLOTS` in a `grid gap-4 md:grid-cols-2`; each side is a
  `border-border rounded-lg border p-3` block holding a semibold side label (rendered only
  for a multi-sided document), a `Badge` "Uploaded" + truncated filename, and `Button`
  outline/ghost actions with a `buttonVariants`-styled "View" link; the empty state pairs
  a `FileText`/`ShieldCheck` lucide icon with "Not uploaded yet" and a small `Upload`
  button; per-slot `text-destructive` error line; remove is guarded by `AlertDialog` and
  hidden entirely while `isVerified` (only `Replace` shows). While `locked` every write
  control is disabled rather than hidden, with `View` still live. On the transition to
  every required `DOCUMENT_SLOTS` slot being present it fires `documents_uploaded` **and**
  a `notifySuccess` "Documents complete" toast naming `nextStep.label`. Both side effects
  run in an effect rather than inside the `setDocs` updater: an updater must stay pure,
  and React double-invokes it in development, which had been firing `documents_uploaded`
  twice. An upload by a verified worker reverts the profile to `pending_review`, so the
  route returns `reverted` and the component then fires a `notifyInfo` "Document changed"
  toast (stable `id: "document-reverted"`) and calls `router.refresh()`, and the
  completion toast stands down — the revert news must not be competing with a "you're
  done" success message. Below the grid it renders the completion panel —
  `border-success/40`, a `CheckCircle2` in `text-success`, the heading "All required
  documents uploaded", the step's description and a `buttonVariants()`-styled `Link` —
  whenever the live set is complete and a `nextStep` exists. The panel and the toast
  therefore share one source and appear in the session that completes the set, with no
  reload. Slot identity comes from `documentSlotKey` in `src/lib/vault.ts` — shared with
  the gate and the dashboard checklist, and it normalizes internally, so a record with no
  side reads as the front. The upload merge uses a functional `setDocs` update so two
  slots uploaded in quick succession cannot drop each other
- **Used in**: `(saas)/dashboard/mjakazi/documents/page.tsx`

### `VerificationStatusCard`

- **Location**: `src/components/dashboard/mjakazi/verification-status-card/index.tsx`
- **Purpose**: The post-profile step of the verification journey on the dashboard Overview
  — shows which document slots are missing, and "ready for verification" once all required
  ones are uploaded
- **Props**: `{ documents: { label: string; uploaded: boolean }[] }`
- **Visual pattern**: shadcn `Card`; checklist rows (`CheckCircle2` in `text-accent` when
  done, `Circle` in `text-muted-foreground` + `ArrowRight` when pending);
  `buttonVariants`-styled "Upload documents" link only while a document is missing;
  payment/review states to slot in here in later phases
- **Used in**: `(saas)/dashboard/mjakazi/page.tsx`

### `SubmitVerification`

- **Location**: `src/components/dashboard/mjakazi/verification/submit-verification.tsx`
- **Purpose**: The draft-state submit flow on the verification page — a readiness
  checklist (profile complete + every required document slot) with links to fix each gap,
  and the submit button
- **Props**: `{ profileComplete: boolean; missingDocuments: string[] }`
- **Visual pattern**: shadcn `Card`; checklist rows (`CheckCircle2` in `text-accent` when
  done, `Circle` in `text-muted-foreground` + `ArrowRight` when pending) — one row per
  missing document slot from `getMissingDocumentSlots`, collapsing to a single "Identity
  documents uploaded" row once they are all present; `Button` disabled until ready; fires
  `verification_submitted` PostHog event and a `notifySuccess` "Profile submitted" toast
  on success, then `router.refresh()`. The toast drives to the **fee**, not to review —
  submitting moves `draft → pending_payment` and it is the payment that triggers review
  (`advanceToReview`), so copy claiming review here would let a worker think the next step
  is unnecessary. "Under review" messaging belongs to the payment-received toast and the
  `pending_review` state card
- **Used in**: `(saas)/dashboard/mjakazi/verification/page.tsx`

### `VerificationStateCard`

- **Location**: `src/components/dashboard/mjakazi/verification/verification-state.tsx`
- **Purpose**: Status copy for every status-only verification state (pending_review,
  verified, rejected, verification_expired, blacklisted, deactivated)
- **Props**:
  `{ state: StatusState; verificationExpiry?: string | null; rejectionReason?: string | null; freeResubmissionsRemaining?: number | null }`
- **Visual pattern**: shadcn `Card`; per-state lucide icon in `text-accent`; shows "Valid
  until" date (verified), "Reason" (rejected) and the free-resubmissions-remaining note
  (rejected)
- **Used in**: `(saas)/dashboard/mjakazi/verification/page.tsx`,
  `(saas)/dashboard/mjakazi/page.tsx`

### `PayVerification`

- **Location**: `src/components/dashboard/mjakazi/verification/pay-verification.tsx`
- **Purpose**: The `pending_payment` pay flow — an editable M-Pesa phone (prefilled from
  the profile, shown in the local `0…` form by the page via `formatKenyanPhone`) sends the
  STK push via `initiateVerificationPaymentAction`, then polls `router.refresh()` until
  the callback flips the profile into review
- **Props**: `{ fee: number | null; phone: string; onPaymentInitiated?: () => void }`
- **Visual pattern**: shadcn `Card`; `Smartphone` lucide icon in `text-accent`; `Label` +
  `Input` phone field; `Button` (default) "Pay KSh {fee}"; `Loader2` spinner + muted copy
  while awaiting; fires `payment_initiated` (`paymentType: "verification"`) on success and
  reports the push up once via `onPaymentInitiated` so `VerificationPaymentFlow` can show
  the success notice. After the 150 s `SPINNER_WINDOW_MS` the card switches to
  `unconfirmed` copy — "do not pay again" plus a `Button variant="outline"` "Check again"
  — and **keeps polling**; the Pay button does not come back on the clock alone, because a
  payment may still be live at M-Pesa. Reported once and never retracted: gating the cue
  on the spinner had let a slow confirmation land with no notice at all
- **Used in**: `VerificationPaymentFlow`

### `PurchaseSubscription`

- **Location**: `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx`
- **Purpose**: The mwajiri subscription purchase flow — live tier cards, M-Pesa phone
  input (prefilled from the profile in the local `0…` form by the page via
  `formatKenyanPhone`), STK-push payment, and confirmation polling
- **Props**:
  `{ tiers: TierOption[]; state: SubscriptionState; expiry: string | null; currentTierId: string | null; phone: string | null; latestPaymentId?: string | null; latestPaymentStatus?: string | null }`
  (`TierOption` = `{ tierId, name, rank, price, durationDays, description, isConcierge }`)
- **Visual pattern**: tier cards are clickable `<button>`s (`bg-card`, selected =
  `ring-2 ring-primary`, unselected = `ring-1 ring-border`), ordered by `rank`; while the
  plan is active a lower-ranked tier is disabled (`disabled`/`aria-disabled`,
  `ring-1 ring-border opacity-60 cursor-not-allowed`, no hover ring), its name muted, with
  a `Badge variant="outline"` "Below your plan" in `text-muted-foreground` beside the
  Current/Concierge badges, and `selectTier` ignores it; the effective selection falls
  back off a now-blocked pick to the current tier (then the lowest-ranked allowed tier) so
  the pay button is never armed for a downgrade; the active plan carries a
  `Badge variant="secondary"` "Current", with the `Badge variant="outline"` "Concierge" +
  `Crown` beside it; selection defaults to the current tier when active, otherwise the
  lowest-ranked; the M-Pesa card heading and CTA read Upgrade / Change plan / Extend from
  the selected rank against the current one, and while active the description states
  remaining time is converted and nothing is refunded; active banner `Card` with
  `CheckCircle2` in `text-primary`; `PaymentSuccessNotice` shown once the newest payment
  (matched by id, so renewals/upgrades are detected too) settles at `confirmed`, its copy
  naming upgrade/change/extend for the plan bought, with a matching `notifySuccess`
  "Payment received" toast (`id: "subscription-payment-received"`) on that transition —
  inline notice persists, the toast is the immediate cue; phone `Label` + `Input`;
  `Button` (default) "Pay KSh {price}" / "Extend — KSh {price}" / "Upgrade — KSh {price}"
  / "Switch plan — KSh {price}"; `Loader2` spinner + muted copy while awaiting; after the
  150 s `SPINNER_WINDOW_MS` it switches to `unconfirmed` copy — "do not pay again" plus a
  `Button variant="outline"` "Check again" — and **keeps polling**, since a late callback
  still settles. fires `plan_selected` (`tierId`) and `payment_initiated`
  (`paymentType: "subscription"`, `tierId`) PostHog events
- **Used in**: `(saas)/dashboard/mwajiri/subscription/page.tsx`

### `VerificationQueue`

- **Location**: `src/components/dashboard/staff/verifications/verification-queue.tsx`
- **Purpose**: The `pending_review` list for the staff review queue — each row links to
  its review case
- **Props**: `{ items: QueueItem[] }` (`id`, `displayName`, `legalName`, `submittedAt`,
  `attempts`)
- **Visual pattern**: `bg-card` + `divide-y` rows matching the accounts list; `Badge`
  "prior rejections" when `attempts > 0`; `Clock` icon + "Submitted {date}" muted
  timestamp; `Inbox` empty state
- **Used in**: `(saas)/dashboard/staff/verifications/page.tsx`

### `StuckPaymentList`

- **Location**: `src/components/dashboard/staff/payments/stuck-payment-list.tsx`
- **Purpose**: The payments a lost callback stranded — pushed, never confirmed, never
  failed — with the one action that recovers them: confirm by hand from the receipt in the
  payer's own M-Pesa SMS
- **Props**: `{ items: StuckPaymentItem[] }` (`id`, `paymentType`, `amount`,
  `phoneNumber`, `mpesaReference`, `payerName`, `initiatedAt`)
- **Visual pattern**: `bg-card` + `divide-y` rows matching `VerificationQueue`, each with
  the payer, a capitalized `Badge` for the payment type, the amount as `KSh n`, and one
  muted line of phone + reference + `Sent {date}` (Africa/Nairobi); a
  `Button variant="outline"` "Confirm with receipt" opens an `AlertDialog` carrying a
  `Label` + `Input` for the receipt. The confirm action stays disabled until a receipt is
  typed, and a per-row `text-destructive` line carries the server's refusal. Success fires
  `notifySuccess` with a stable `id` (`payment-reconciled`) then `router.refresh()`;
  `Inbox` empty state reads "Nothing waiting"
- **Used in**: `(saas)/dashboard/staff/payments/page.tsx`
- **Note**: the copy tells staff to act only on the customer's own SMS, because the
  receipt is the proof and no automated check can produce it

### `DocumentViewer`

- **Location**: `src/components/dashboard/staff/verifications/document-viewer.tsx`
- **Purpose**: Renders every side of a profile's identity documents through the audited
  vault route, so a reviewer can compare each documented front and back
- **Props**: `{ documents: ReviewDocument[] }` (`id`, `documentType`, `side`, `filename`)
- **Visual pattern**: one `Card` per entry in `DOCUMENT_SLOTS` in
  `grid gap-4 md:grid-cols-2`, each described as "N of M uploaded"; inside a multi-sided
  document the sides sit in `grid gap-4 sm:grid-cols-2` with a semibold side label above
  each `<iframe src="/api/actions/vault/{id}">` (auth + audit + signed-URL redirect), a
  truncated filename and an "Open in new tab" fallback link; `FileText` empty state per
  missing slot
- **Used in**: `(saas)/dashboard/staff/verifications/[id]/page.tsx`

### `ReviewForm`

- **Location**: `src/components/dashboard/staff/verifications/review-form.tsx`
- **Purpose**: The staff approve/reject decision — approve is one click, reject requires a
  reason
- **Props**:
  `{ profileId: string; verificationSubmittedAt: string | null; verificationAttempts: number | null }`
- **Visual pattern**: shadcn `Card`; a `Label` + `Textarea` for the required rejection
  reason (`rejectionReason`, shown to the worker); `Button` (default) "Approve" +
  `Button variant="destructive"` "Reject"; fires `verification_approved` (`daysToVerify`)
  / `verification_rejected` (`attempt`) PostHog events, then a `notifySuccess` toast and a
  redirect back to the queue
- **Used in**: `(saas)/dashboard/staff/verifications/[id]/page.tsx`

### `CreateStaffForm`

- **Location**: `src/components/dashboard/admin/staff/create-staff-form.tsx`
- **Purpose**: Creates a staff account (first/last name + email); the temporary password
  is generated server-side
- **Props**: none
- **Visual pattern**: shadcn `Card`; two-column name grid + email `Input`; inline
  `text-destructive` error only (success fires a `notifySuccess` toast); calls
  `createStaffAction` then `router.refresh()`
- **Used in**: `(saas)/dashboard/admin/staff/page.tsx`

### `StaffTable`

- **Location**: `src/components/dashboard/admin/staff/staff-table.tsx`
- **Purpose**: Lists back-office accounts with inline rename and guarded delete; the
  signed-in admin's own row shows no actions
- **Props**: `{ staff: StaffRecord[]; currentUserId: string }`
- **Visual pattern**: `divide-y` list rows (stack on mobile, spread on desktop); initials
  avatar in `bg-primary/10 text-primary`; `Badge` role + "You"; inline `EditNameForm`;
  `AlertDialog`-guarded delete; delete success fires a `notifySuccess` toast
- **Used in**: `(saas)/dashboard/admin/staff/page.tsx`

### `PlatformSettingsForm`

- **Location**: `src/components/dashboard/admin/settings/platform-settings-form.tsx`
- **Purpose**: Edits the mjakazi verification fee (single number) via
  `updateVerificationFeeAction`
- **Props**: `{ currentVerificationFee: number }`
- **Visual pattern**: shadcn `Card`; "KSh" prefix + number `Input`; Save `Button` with a
  saving state; inline `text-destructive` error (success fires a `notifySuccess` toast);
  disabled when unchanged
- **Used in**: `(saas)/dashboard/admin/settings/page.tsx`

### `SubscriptionTiersForm`

- **Location**: `src/components/dashboard/admin/settings/subscription-tiers-form.tsx`
- **Purpose**: Edits the mwajiri subscription tiers (1–4 rows, add/remove, PUT-replace the
  whole array) via `updateSubscriptionTiersAction`
- **Props**: `{ initialTiers: Tier[] }` (one empty row shown when none exist; `Tier`
  includes `rank`)
- **Visual pattern**: shadcn `Card`; per-tier bordered sub-card with
  name/id/rank/price/duration `Input`s, description `Textarea`, Active + Concierge
  checkboxes; the rank input (min 0) carries a muted `text-xs` helper — higher is more
  premium, unique, a move up is an upgrade; a new row is ranked above the highest
  existing; ghost Remove `Button` (hidden on the last row); `variant="outline"` "Add tier"
  (disabled at `MAX_SUBSCRIPTION_TIERS`, with a muted `text-xs` "Maximum of 4 plans."
  helper below it); tierId auto-slugified from name; success fires a `notifySuccess` toast
- **Used in**: `(saas)/dashboard/admin/settings/page.tsx`

### `EoiPolicyForm`

- **Location**: `src/components/dashboard/admin/settings/eoi-policy-form.tsx`
- **Purpose**: Edits the expression-of-interest policy (batch min/max, response threshold,
  interest expiry, re-send cooldown) in one save via `updateEoiPolicyAction`
- **Props**: `{ initialPolicy: EoiPolicy }`
- **Visual pattern**: shadcn `Card`; five number `Input`s in a `sm:grid-cols-2` grid, each
  with a `Label` and a muted `text-xs` helper line; values held as strings (number inputs
  fight leading zeros); validated together (whole numbers, min ≤ max, threshold 1–100);
  inline `text-destructive` error (success fires a `notifySuccess` toast); disabled when
  unchanged
- **Used in**: `(saas)/dashboard/admin/settings/page.tsx`

### `ModerationTable`

- **Location**: `src/components/dashboard/moderation/moderation-table.tsx`
- **Purpose**: Moderation list for wajakazi/waajiri accounts — suspend (staff + admin) and
  reinstate (admin only). Every action requires a reason entered in the dialog. Renaming
  and permanent deletion live in the account sections.
- **Props**: `{ accounts: AccountRow[]; canSuspend; canReinstate }`
- **Visual pattern**: same list-row pattern as `StaffTable`; status `Badge` with a
  page-mapped variant (a suspended account overrides the underlying state); action buttons
  swap between Suspend (active) and Reinstate (suspended); `AlertDialog` with a required
  `Textarea` reason field and an inline error; suspend/reinstate success fires a
  `notifySuccess` toast. No rename or delete actions here.
- **Used in**: `(saas)/dashboard/moderation/page.tsx`

### `AccountsTable`

- **Location**: `src/components/dashboard/accounts/accounts-table.tsx`
- **Purpose**: A single account type's administration list — inline name editing, plus a
  permanent full delete for admins. Deliberately separate from moderation
  (suspend/reinstate), which stays reason-gated.
- **Props**: `{ accounts: AccountRow[]; canDelete: boolean }`
- **Row mapper**: both this and `ModerationTable` consume the shared `AccountRow` and
  `toWajakaziRow` / `toWaajiriRow` from `src/lib/account-rows.ts`, so an account's
  displayed status can never drift between the two surfaces. `AccountRow` = `userId`,
  `name`, `firstName`, `lastName`, `email`, `statusLabel`, `statusVariant`, `subtitle`,
  `accountState`, `createdAt`.
- **Visual pattern**: same `divide-y` list-row pattern as `ModerationTable`; initials
  avatar in `bg-primary/10 text-primary`; status `Badge`; Edit `Button` (`outline`) opens
  the shared `EditNameForm`; Delete `Button` (`ghost`, `text-destructive`) opens an
  `AlertDialog` with no reason field; calls `updateAccountAction` / `deleteAccountAction`
  then `router.refresh()`; `text-destructive` inline error; delete success fires a
  `notifySuccess` toast
- **Used in**: `(saas)/dashboard/accounts/wajakazi/page.tsx`,
  `(saas)/dashboard/accounts/waajiri/page.tsx`

### `EditNameForm`

- **Location**: `src/components/dashboard/admin/edit-name-form.tsx`
- **Purpose**: Small inline first/last-name editor shared by `StaffTable` and
  `AccountsTable`
- **Props**:
  `{ initialFirstName: string; initialLastName: string; onSave: (first, last) => Promise<string | null>; onCancel: () => void }`
- **Visual pattern**: two `Input`s + Save/Cancel `Button`s; inline `text-destructive`
  error; success fires a `notifySuccess` toast
- **Used in**: `StaffTable`, `AccountsTable`

### `AuditLogTable`

- **Location**: `src/components/dashboard/audit-logs/audit-log-table.tsx`
- **Purpose**: Read-only audit trail viewer — filter by action/source, paginate, show
  actor → target + flattened metadata
- **Props**:
  `{ logs: AuditLog[]; totalDocs; totalPages; currentPage; currentAction; currentSource; hasNextPage; hasPrevPage }`
- **Visual pattern**: two `Select` filters + entry count; `divide-y` list rows (stack on
  mobile) with action `Badge`, timestamp, "actor → target", flattened `key: value · …`
  metadata line, source `Badge`; `ShieldQuestion` empty state; Previous/Next `Button`
  pagination
- **Used in**: `(saas)/dashboard/audit-logs/page.tsx`

### `AuthenticatingClient`

- **Location**: `src/components/auth/authenticating-client.tsx`
- **Purpose**: Wait screen shown after sign-in/up — renders immediately, then fetches
  `/post-auth` for the redirect target and navigates
- **Props**: `{ message: string }`
- **Visual pattern**: centered `Loader2` spinner + one-line message + muted "This will
  only take a moment." subtitle
- **Used in**: `(auth)/authenticating/page.tsx`

### `ResubmitVerification`

- **Location**: `src/components/dashboard/mjakazi/verification/resubmit-verification.tsx`
- **Purpose**: The rejected-state resubmit flow — delegates to
  `resubmitForVerificationAction`, which routes the profile back to review (free) or to
  payment (attempts exhausted)
- **Props**: none
- **Visual pattern**: shadcn `Card`; "Resubmit for review" `Button` (default); fires
  `verification_resubmitted` PostHog event and a `notifySuccess` toast on success, then
  `router.refresh()`
- **Used in**: `(saas)/dashboard/mjakazi/verification/page.tsx`

### `VerificationPaymentFlow`

- **Location**:
  `src/components/dashboard/mjakazi/verification/verification-payment-flow.tsx`
- **Purpose**: Always-mounted wrapper for the non-draft verification states. Renders the
  pay card while `pending_payment`; once the callback flips the state (and the pay card
  unmounts) it shows an explicit "payment received" notice above the status card, because
  the transition detection must survive the pay card's unmount
- **Props**:
  `{ state: VerificationState; fee: number | null; phone: string; verificationExpiry?: string | null; rejectionReason?: string | null; freeResubmissionsRemaining?: number | null }`
- **Visual pattern**: delegates to `PayVerification` (pending) or
  `VerificationStateCard` + optional `ResubmitVerification`; renders
  `PaymentSuccessNotice` once a payment sent from this page leaves `pending_payment`; on
  that same live transition it also fires a `notifySuccess` "Payment received" toast
  (`id: "verification-payment-received"`). The inline notice is the persistent record, the
  toast is the immediate cue — a later visit mounts with the state already past
  `pending_payment` and nothing initiated there, so nothing re-fires. The gate is a
  `paymentInitiated` flag owned by this wrapper and **not** the pay card's spinner state:
  the spinner stops after 150 s, and gating on it made a slow confirmation show no cue at
  all, losing even the persistent notice
- **Used in**: `(saas)/dashboard/mjakazi/verification/page.tsx`

### `PaymentSuccessNotice`

- **Location**: `src/components/dashboard/payments/payment-success-notice.tsx`
- **Purpose**: Explicit "payment received" confirmation shared by both pay flows
- **Props**: `{ title: string; description: string }`
- **Visual pattern**: neutral shadcn `Card` (`border-success/40`) with the success colour
  carried only by a `CheckCircle2` icon in `text-success` and a `text-heading` semibold
  title — card surface stays neutral per `ui-rules.md`
- **Used in**: `VerificationPaymentFlow`,
  `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx`

### `StatCard`

- **Location**: `src/components/dashboard/overview/stat-card.tsx`
- **Purpose**: A single at-a-glance metric on a role's overview, optionally linking to the
  screen it describes
- **Props**: `{ label: string; value: number; description?: string; href?: string }`
- **Visual pattern**: shadcn `Card`; `text-heading` 3xl value; wraps in `Link` when `href`
  is set
- **Used in**: `(saas)/dashboard/admin/page.tsx`, `(saas)/dashboard/staff/page.tsx`

### `DeleteAccountCard`

- **Location**: `src/components/dashboard/settings/delete-account-card.tsx`
- **Purpose**: Type-to-confirm self-deletion of a wajakazi/waajiri account and all data
- **Props**: `{ role: "mjakazi" | "mwajiri" }`
- **Visual pattern**: `border-destructive/30` bordered panel; `text-destructive` warning;
  `Input` requiring the phrase "delete my account"; `Button variant="destructive"`
  confirm; on success `useClerk().signOut()` → `/`
- **Used in**: `(saas)/dashboard/mjakazi/settings/page.tsx`,
  `(saas)/dashboard/mwajiri/settings/page.tsx`

### `AvailabilityCard`

- **Location**: `src/components/dashboard/settings/availability-card.tsx`
- **Purpose**: Controls whether a wajakazi appears in the directory/archive (available /
  hired / on_break); choosing Hired asks who hired them (offering the waajiri who unlocked
  their contact or sent interest) and records the hire
- **Props**:
  `{ currentStatus: "available" | "hired" | "on_break"; hireCandidates?: { mwajiriId; name; location | null }[] }`
- **Visual pattern**: shadcn `Card`; current-status indicator (icon in `text-success` for
  available, `text-muted-foreground` otherwise); three `Button` options (selected =
  `default`, others = `outline`); a "Who hired you?" bordered picker panel (candidate rows
  with `MapPin` location + "Not listed — hired elsewhere" outline `Button`) when Hired is
  chosen with candidates; calls `updateAvailabilityAction` / `confirmHireByMjakaziAction`;
  fires `hire_confirmed` (`confirmedBy: "mjakazi"`), a `notifySuccess` toast, then
  `router.refresh()`
- **Used in**: `(saas)/dashboard/mjakazi/settings/page.tsx`

### `DirectoryCard`

- **Location**: `src/components/web/directory/directory-card.tsx`
- **Purpose**: A single wajakazi in the public directory — links to the profile's own
  detail page (no sign-up CTA), renders no contact fields
- **Props**: `{ profile: DirectoryProfile; basePath?: string }` (`basePath` defaults
  `/directory`)
- **Visual pattern**: shadcn `Card` (`group h-full gap-0 py-0 hover:shadow-lg`);
  `aspect-16/10` photo + hover zoom, `Verified` pill `bg-card text-success`,
  `text-heading` name with a `RatingStars` + muted `N.N` beside it when the profile has a
  rating (count > 0), job `Badge variant="outline"`; accent `buttonVariants` "View
  Profile" → `{basePath}/{slug}`
- **Used in**: `src/app/(web)/directory/page.tsx`,
  `src/payload/blocks/wajakazi-archive/component.tsx` (via `RenderBlocks`)

### `DirectoryFilterBar`

- **Location**: `src/components/web/directory/directory-filter-bar.tsx`
- **Purpose**: The directory's search + filters (name, category, location, experience,
  minimum rating) — every filter lives in the URL query string; fires `directory_searched`
  PostHog event with the filter set including `minRating`
- **Props**:
  `{ jobs; locations; current: { category?; location?; experience?; minRating?; q? }; resultCount: number; basePath?: string }`
- **Visual pattern**: `Input` with `Search` icon + `Button`; four shadcn `Select`s
  (sentinel "all"; rating offers "4+ / 3+ / 2+ stars"); ghost "Clear" `Button`;
  `text-muted-foreground` result count; navigation via `useRouter` + `URLSearchParams`
- **Used in**: `src/app/(web)/directory/page.tsx`,
  `src/app/(saas)/dashboard/mwajiri/browse/page.tsx`

### `DirectoryPagination`

- **Location**: `src/components/web/directory/directory-pagination.tsx`
- **Purpose**: Numbered pagination (9 per page) with windowed ellipsis; preserves active
  filters (including `minRating`) in every link
- **Props**:
  `{ currentPage; totalPages; baseParams: { category?; location?; experience?; minRating?; q? }; basePath?: string }`
- **Visual pattern**: `Link`s styled `size-9 rounded-md border`; active page
  `bg-primary/10 text-primary`; `ChevronLeft`/`ChevronRight` prev/next; `…` ellipsis spans
- **Used in**: `src/app/(web)/directory/page.tsx`,
  `src/app/(saas)/dashboard/mwajiri/browse/page.tsx`

### `DirectoryProfileDetail`

- **Location**: `src/components/web/directory/directory-profile-detail.tsx`
- **Purpose**: The public profile detail — full professional info with no contact fields,
  a star rating near the top, and a "Join as a mwajiri" CTA
- **Props**:
  `{ profile: DirectoryProfile; backHref?: string; contactSlot?: ReactNode; headerAction?: ReactNode }`
- **Visual pattern**: `ArrowLeft` back link; two-column grid (photo `aspect-4/5` left,
  content right); `text-heading` name + `Verified` pill; a `RatingStars` + muted "N.N · N
  reviews" line under the name when the profile has a rating (count > 0); icon rows
  (`MapPin`, `Calendar`, `GraduationCap`, `Languages`, `Wallet`, `Briefcase`) in
  `text-primary`; job `Badge`s; a "Previous employment" timeline (employer in
  `text-foreground`, role + month/year range in `text-muted-foreground`, `border-l-2` rail
  per entry, newest first, omitted entirely when empty); CTA `Card` with accent "Join as a
  mwajiri" + outline "Sign in". Renders wherever profile content renders — the public
  directory detail and the mwajiri browse detail both use this component, so employment
  history is in `DIRECTORY_DETAIL_FIELDS`. No compact card shows it, and the list reads
  deliberately do not select it
- **Used in**: `src/app/(web)/directory/[slug]/page.tsx`,
  `src/app/(saas)/dashboard/mwajiri/browse/[slug]/page.tsx`

### `DirectoryProfileViewTracker`

- **Location**: `src/components/web/directory/directory-profile-view-tracker.tsx`
- **Purpose**: Fires `profile_viewed` (`isUnlocked: false`) once per public profile view
- **Props**: `{ slug: string }`
- **Visual pattern**: renders nothing; client `useEffect` keyed on `slug` calling
  `posthog.capture`
- **Used in**: `src/app/(web)/directory/[slug]/page.tsx`,
  `src/app/(saas)/dashboard/mwajiri/browse/[slug]/page.tsx`

### `BrowseContactCard`

- **Location**: `src/components/dashboard/mwajiri/browse/browse-contact-card.tsx`
- **Purpose**: The contact area on a mwajiri browse detail. The contact is present only
  once a mjakazi has accepted an expression of interest; otherwise the card shows masked
  rows plus one control whose state is the profile's interest status — "Send interest"
  (single-profile batch), "Interest sent" while pending, a "Subscribe to send interest"
  link when the subscription is inactive, or the gate / cooldown reason. Fires
  `interest_sent` (`count`) and refreshes on send.
- **Props**:
  `{ mjakaziId: string; contact: Contact | null; interest: ProfileInterestStatus }`
- **Visual pattern**: shadcn `Card`; a live `ContactRow` (border, `Phone`/`Mail` icon,
  value or "Not provided") or a `MaskedRow` (`Lock` icon + `••••••••` placeholder) —
  placeholders only, never real values; accent `buttonVariants` link for the subscribe
  path; a muted `text-xs` note that granted details survive subscription expiry; errors in
  `text-destructive text-xs`
- **Used in**: `src/app/(saas)/dashboard/mwajiri/browse/[slug]/page.tsx` (via
  `DirectoryProfileDetail`'s `contactSlot`)

### `SubscriptionStatusCard`

- **Location**: `src/components/dashboard/mwajiri/subscription-status-card.tsx`
- **Purpose**: The first card on the mwajiri overview — subscription status with the CTA
  that follows from it (no-subscription/expired notice + plan CTA, active tier + days
  remaining, honest pending/restricted states)
- **Props**:
  `{ state: SubscriptionState; tierName: string | null; tierExpiry: string | null }`
- **Visual pattern**: shadcn `Card`; active state `ring-primary/40` with `CheckCircle2` in
  `text-primary`; pending `Clock` in `text-accent`; restricted `ShieldAlert` in
  `text-destructive`; no-subscription `CreditCard` in `text-accent`; days remaining via
  date-fns `differenceInCalendarDays`, expiry rendered `Africa/Nairobi`; CTA links (Extend
  / Choose a plan / Renew) use the accent treatment
  `bg-accent text-accent-foreground font-semibold`, never `outline`
- **Used in**: `src/app/(saas)/dashboard/mwajiri/page.tsx`

### `SaveToggle`

- **Location**: `src/components/dashboard/mwajiri/browse/save-toggle.tsx`
- **Purpose**: The shortlist toggle on a mwajiri browse detail — calls `toggleSaveAction`,
  fires `profile_saved` (`saved`), then refreshes
- **Props**: `{ mjakaziId: string; initiallySaved: boolean }`
- **Visual pattern**: shadcn `Button` (`sm`), `Bookmark` icon (filled when saved); labels
  `Shortlist` / `Shortlisted`; `variant="default"` when saved, `variant="outline"`
  otherwise; disabled while busy
- **Used in**: `src/app/(saas)/dashboard/mwajiri/browse/[slug]/page.tsx` (via
  `DirectoryProfileDetail`'s `headerAction`)

### `EoiSend`

- **Location**: `src/components/dashboard/mwajiri/saved/eoi-send.tsx`
- **Purpose**: The batch expression-of-interest send control on the saved page — a mwajiri
  selects between the configured minimum and maximum of their saved wajakazi and sends
  each an interest as one batch. Sending is gated on the `eoiPolicy` bounds, an active
  subscription and the open-pool gate, all resolved server-side into `canSend`.
- **Props**:
  `{ profiles: { id; displayName; location | null }[]; minBatch: number; maxBatch: number; canSend: boolean; blockCode: ProfileInterestStatus["blockCode"]; blockReason: string | null }`
- **Visual pattern**: shadcn `Card` with a `Send` icon in `text-accent`; bordered checkbox
  rows (native `<input type="checkbox">` with `accent`-styled classes, `displayName` +
  muted location); "N selected — select at least minBatch" counter in
  `text-muted-foreground`; disabled `Button` until the selected count is within
  minBatch–maxBatch; accent `buttonVariants` "Subscribe to send interest" link when the
  block is the subscription, otherwise the gate/cooldown reason in muted text; fires
  `interest_sent` (`count`) and a `notifySuccess` toast, then `router.refresh()`
- **Used in**: `src/app/(saas)/dashboard/mwajiri/saved/page.tsx`

### `EoiInbox`

- **Location**: `src/components/dashboard/mjakazi/opportunities/eoi-inbox.tsx`
- **Purpose**: The mjakazi opportunities inbox — received expressions of interest, with
  Accept/Decline on pending ones and an outcome badge otherwise
- **Props**: `{ eois: { id; mwajiriName; mwajiriLocation | null; state; sentAtLabel }[] }`
- **Visual pattern**: `divide`-free stacked shadcn `Card`s; sender name in `text-heading`
  - muted `location · sentAtLabel` line; `Badge` Accepted (default) / Declined (secondary)
    / Pending or Expired (outline); `Button` "Accept" (default, `Check` icon) + "Decline"
    (outline, `X` icon) on `sent`; `Inbox` empty state; fires `interest_responded`
    (`response`) and a `notifySuccess` toast, then `router.refresh()`
- **Used in**: `src/app/(saas)/dashboard/mjakazi/opportunities/page.tsx`

### `HireInbox`

- **Location**: `src/components/dashboard/mjakazi/opportunities/hire-inbox.tsx`
- **Purpose**: The mjakazi's hire confirmations on the opportunities screen — pending
  hires where the mwajiri confirmed first (Agree / Not correct) and agreed hires (**End
  contract**, no review — reviews are mwajiri-only)
- **Props**: `{ hires: { id; counterpartId; counterpartName; state; awaitingYou }[] }`
- **Visual pattern**: single shadcn `Card` with a `Briefcase` icon in `text-accent`; each
  hire is a bordered row with `Badge` Hired (default) / Confirming (secondary) / Awaiting
  their agreement (outline); `pending_agreement` shows Agree / Not correct, `agreed` shows
  **End contract**; returns `null` when empty; calls `confirmHireByMjakaziAction` /
  `reverseHireAction` / `endHireAction`; fires `hire_confirmed` (`confirmedBy: "mjakazi"`)
  and a `notifySuccess` toast (Hire confirmed / Hire reversed / Contract ended), then
  `router.refresh()`
- **Used in**: `src/app/(saas)/dashboard/mjakazi/opportunities/page.tsx`

### `OpportunitiesCard`

- **Location**: `src/components/dashboard/mjakazi/opportunities-card.tsx`
- **Purpose**: The opportunities summary on the mjakazi overview — a count of pending
  expressions of interest and a link into the full opportunities inbox (mirrors the
  verification box)
- **Props**: `{ pendingCount: number }`
- **Visual pattern**: shadcn `Card`; `Inbox` icon in `text-accent`; description swaps
  between "You have N interest(s) awaiting your response." and "Waajiri interested in
  hiring you will appear here."; `buttonVariants` "Review opportunities" link
- **Used in**: `src/app/(saas)/dashboard/mjakazi/page.tsx`

### `HireConfirmCard`

- **Location**: `src/components/dashboard/mwajiri/hire-confirm-card.tsx`
- **Purpose**: The mwajiri hire card, split by state so every row offers one valid action
  and nothing else — "Ready to hire" (people with no open or completed hire), "Active
  hires" (pending/agreed), "Past hires" (completed). Recording a hire is confirmed inline;
  ending a completed contract opens the review form inline
- **Props**:
  `{ candidates: { mjakaziId; displayName; location | null; sourceEoiId | null }[]; hires: { id; mjakaziId; counterpartName; state: "pending_agreement" | "agreed" | "ended"; awaitingYou; reviewed }[] }`
- **Visual pattern**: shadcn `Card` with a `Handshake` icon in `text-accent`; three
  `uppercase` muted section labels. **Ready to hire** — bordered rows, a "Record hire"
  outline `Button` that opens an inline confirm ("Record that you hired {name}? This
  awaits their confirmation." → Confirm hire / Cancel). **Active hires** — `Badge` Hired
  (default) / They confirmed (secondary) / Awaiting their confirmation (outline), with
  Agree, Reverse / Not correct, and **End contract** `Button`s. **Past hires** — muted
  name + Completed (secondary) + Reviewed (outline) `Badge`, and a **Leave a review**
  `Button` only when not reviewed. Ending a contract reveals `LeaveReviewForm` inline;
  calls `confirmHireAction` / `reverseHireAction` / `endHireAction`; fires
  `hire_confirmed` (`confirmedBy: "mwajiri"`) plus a `notifySuccess` toast (Hire recorded
  / Hire confirmed / Hire reversed / Contract ended), then `router.refresh()`
- **Used in**: `src/app/(saas)/dashboard/mwajiri/page.tsx`

### `RatingStars`

- **Location**: `src/components/rating-stars.tsx`
- **Purpose**: Read-only 1–5 star display shared by every review surface (filled stars in
  `text-warning`, empty in `text-muted-foreground`)
- **Props**: `{ rating: number }`
- **Visual pattern**: inline `Star` icons (`size-4`), filled via
  `text-warning fill-current`; `aria-label` "N out of 5 stars"
- **Used in**: `ReviewsPanel`, `ReviewQueue`, `DirectoryProfileDetail`, `DirectoryCard`,
  `StaffCandidateProfile`, mwajiri browse detail

### `LeaveReviewForm`

- **Location**: `src/components/dashboard/mwajiri/browse/leave-review-form.tsx`
- **Purpose**: The mwajiri leave-a-review form on a browse detail (star picker + comment)
  for an unlocked + hired worker; the gate lives server-side
- **Props**: `{ mjakaziId: string }`
- **Visual pattern**: shadcn `Card`; five clickable `Star` buttons (`size-6`, hover
  preview, `text-warning fill-current` when selected) + rating word label; `Textarea` (max
  1000); `Button` disabled until a rating + comment are set; inline "Review submitted"
  success card; calls `submitReviewAction`
- **Used in**: `src/app/(saas)/dashboard/mwajiri/browse/[slug]/page.tsx`

### `ReviewsPanel`

- **Location**: `src/components/dashboard/mjakazi/reviews/reviews-panel.tsx`
- **Purpose**: The worker's published reviews, read-only. The written comment is private
  to the worker (and the author, and staff) — it is never public, so there is no show/hide
  control
- **Props**:
  `{ reviews: { id; reviewerName | null; rating; comment; publishedAt | null }[] }`
- **Visual pattern**: stacked shadcn `Card`s; `RatingStars` + muted reviewer name + muted
  date; comment in `text-foreground`; `Star` empty state
- **Used in**: `src/app/(saas)/dashboard/mjakazi/page.tsx`

### `ReviewQueue`

- **Location**: `src/components/dashboard/staff/reviews/review-queue.tsx`
- **Purpose**: The staff review-moderation queue — approve publishes, reject requires a
  reason and is terminal
- **Props**:
  `{ items: { id; reviewerName | null; rating; comment; mjakaziDisplayName | null; submittedAt | null }[] }`
- **Visual pattern**: stacked shadcn `Card`s; `RatingStars` + reviewer name + "reviewing
  {worker}"; `Clock` submitted date; Approve `Button` (default) + Reject (outline); inline
  `Textarea` reason + Confirm/Cancel on reject; `Inbox` empty state; calls
  `approveReviewAction` / `rejectReviewAction` then `router.refresh()`; approve/reject
  success fires a `notifySuccess` toast
- **Used in**: `src/app/(saas)/dashboard/staff/reviews/page.tsx`

### `RevenueCard`

- **Location**: `src/components/dashboard/admin/revenue-card.tsx`
- **Purpose**: The admin overview's running revenue total, split by verification fees vs
  subscriptions, with the same split for the last 30 days
- **Props**: `{ snapshot: RevenueSnapshot }` (from `services/admin.service.ts`)
- **Visual pattern**: server component; shadcn `Card`; `text-heading` totals at `text-3xl`
  (all time) / `text-2xl` (30 days); per-type rows as `flex justify-between`
  (`text-muted-foreground` label, `font-medium` value); `KSh` thousands-separated format
- **Used in**: `src/app/(saas)/dashboard/admin/page.tsx`

### `ConciergeBriefForm`

- **Location**: `src/components/dashboard/mwajiri/concierge/concierge-brief-form.tsx`
- **Purpose**: The Mwajiri requirements brief intake form for Concierge matching
- **Props**: `{ caseId: string; initialValues?: Partial<BriefFormValues> | null }`
- **Visual pattern**: react-hook-form + zod; two-column grid fields; `Select` for role,
  location, work arrangement; `Textarea` for duties and special requirements; calls
  `submitConciergeBriefAction`; inline `text-destructive` error, success fires a
  `notifySuccess` toast
- **Used in**: `src/app/(saas)/dashboard/mwajiri/concierge/page.tsx`

### `ConciergeStatusCard`

- **Location**: `src/components/dashboard/mwajiri/concierge/concierge-status-card.tsx`
- **Purpose**: Status summary card for a Concierge case on the Mwajiri dashboard and
  concierge page
- **Props**: `{ conciergeCase: ConciergeCase; eligibleForReplacement?: boolean }`
- **Visual pattern**: shadcn `Card` with `Crown` icon; status `Badge`; shortlist cards
  with candidate names and match notes; record outcome buttons; 1-time replacement
  guarantee button; record-outcome and replacement success fire `notifySuccess` toasts
  (the actions revalidate the path, so the card updates without an explicit refresh)
- **Used in**: `src/app/(saas)/dashboard/mwajiri/page.tsx`,
  `src/app/(saas)/dashboard/mwajiri/concierge/page.tsx`

### `ConciergeQueue`

- **Location**: `src/components/dashboard/staff/concierge/concierge-queue.tsx`
- **Purpose**: The staff queue list of open, in-review, or delivered Concierge cases
- **Props**: `{ cases: ConciergeCase[] }`
- **Visual pattern**: stacked shadcn `Card`s; `Crown` icon; status `Badge`; brief summary
  details; assigned staff indicator; "Manage Case" button
- **Used in**: `src/app/(saas)/dashboard/staff/concierge/page.tsx`

### `ConciergeCaseDetail`

- **Location**: `src/components/dashboard/staff/concierge/concierge-case-detail.tsx`
- **Purpose**: Staff case management detail view with case claim and 3–5 candidate
  shortlist builder
- **Props**:
  `{ conciergeCase: ConciergeCase; availableCandidates: CandidateOption[]; currentUserId: string }`
- **Visual pattern**: Brief summary grid; "Claim Case" button; shortlist builder with
  search input, candidate picker, match note textareas, and "Deliver Shortlist to Mwajiri"
  button; every candidate row links to the staff candidate detail in the same tab ("View
  profile" / "View"), carrying the case id so the return link is "Back to Case"
- **Used in**: `src/app/(saas)/dashboard/staff/concierge/[id]/page.tsx`

### `StaffCandidateProfile`

- **Location**: `src/components/dashboard/staff/wajakazi/staff-candidate-profile.tsx`
- **Purpose**: Read-only staff view of a shortlist candidate — the whole profile plus the
  contact vault — so a shortlist is never built blind
- **Props**: `{ profile: WajakaziProfile; email: string | null }`
- **Visual pattern**: shadcn `Card`s — header with photo, verification/availability/
  suspended `Badge`s, and "View documents" + "Open full record in admin" links; identity
  and contact card (legal name, date of birth, nationality, marital status, religion,
  phone, email); professional card (jobs/skills `Badge`s, about, education, work
  preference, languages, salary, location); employment history; verification state card.
  Read-only, no interactivity
- **Used in**: `src/app/(saas)/dashboard/staff/wajakazi/[id]/page.tsx`
