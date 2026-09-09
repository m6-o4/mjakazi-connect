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
  fires `profile_completed` PostHog event on the first false→true completeness transition
- **Used in**: `(saas)/dashboard/mjakazi/profile/page.tsx`

### `FormSelect`

- **Location**: `src/components/dashboard/mjakazi/profile-form/form-select.tsx`
- **Purpose**: Bridges a single-select shadcn `Select` (Base UI) to react-hook-form
- **Props**: `{ name; label; options: readonly { label; value: string }[]; placeholder? }`
- **Visual pattern**: `Label` + `Select`/`SelectTrigger`/`SelectContent`;
  `text-destructive` error line
- **Used in**: `ProfileForm`

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
- **Props**: `{ name: "dateOfBirth" | "availableFrom"; label: string; placeholder? }`
- **Visual pattern**: `PopoverTrigger` styled with
  `buttonVariants({ variant: "outline" })`; `Calendar` `mode="single"`; `Clear` ghost
  button when set
- **Used in**: `ProfileForm`

### `DocumentVault`

- **Location**: `src/components/dashboard/mjakazi/document-vault/index.tsx`
- **Purpose**: The two document slots (National ID + Certificate of Good Conduct) —
  upload, replace, view and remove, each remove guarded by a confirmation
- **Props**:
  `{ documents: { id: string; documentType: string; filename: string | null }[]; isVerified?: boolean }`
- **Visual pattern**: two shadcn `Card`s in a `grid gap-4 md:grid-cols-2`; `Badge`
  "Uploaded" + truncated filename; `Button` outline/ghost actions with a
  `buttonVariants`-styled "View" link; empty state with a `FileText`/`ShieldCheck` lucide
  icon; remove guarded by shadcn `AlertDialog` and hidden entirely while `isVerified`
  (only `Replace` shows); fires `documents_uploaded` PostHog event when both slots fill
- **Used in**: `(saas)/dashboard/mjakazi/documents/page.tsx`

### `VerificationStatusCard`

- **Location**: `src/components/dashboard/mjakazi/verification-status-card/index.tsx`
- **Purpose**: The post-profile step of the verification journey on the dashboard Overview
  — shows which documents are missing, and "ready for verification" once both are uploaded
- **Props**: `{ documents: { label: string; uploaded: boolean }[] }`
- **Visual pattern**: shadcn `Card`; checklist rows (`CheckCircle2` in `text-accent` when
  done, `Circle` in `text-muted-foreground` + `ArrowRight` when pending);
  `buttonVariants`-styled "Upload documents" link only while a document is missing;
  payment/review states to slot in here in later phases
- **Used in**: `(saas)/dashboard/mjakazi/page.tsx`

### `SubmitVerification`

- **Location**: `src/components/dashboard/mjakazi/verification/submit-verification.tsx`
- **Purpose**: The draft-state submit flow on the verification page — a readiness
  checklist (profile complete + both documents) with links to fix each gap, and the submit
  button
- **Props**: `{ profileComplete: boolean; hasBothDocuments: boolean }`
- **Visual pattern**: shadcn `Card`; checklist rows (`CheckCircle2` in `text-accent` when
  done, `Circle` in `text-muted-foreground` + `ArrowRight` when pending); `Button`
  disabled until ready; fires `verification_submitted` PostHog event on success then
  `router.refresh()`
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
  the profile) sends the STK push via `initiateVerificationPaymentAction`, then polls
  `router.refresh()` until the callback flips the profile into review
- **Props**: `{ fee: number | null; phone: string }`
- **Visual pattern**: shadcn `Card`; `Smartphone` lucide icon in `text-accent`; `Label` +
  `Input` phone field; `Button` (default) "Pay KSh {fee}"; `Loader2` spinner + muted copy
  while awaiting; fires `payment_initiated` (`paymentType: "verification"`) on success
- **Used in**: `(saas)/dashboard/mjakazi/verification/page.tsx`

### `PurchaseSubscription`

- **Location**: `src/components/dashboard/mwajiri/subscription/purchase-subscription.tsx`
- **Purpose**: The mwajiri subscription purchase flow — live tier cards, M-Pesa phone
  input, STK-push payment, and confirmation polling
- **Props**:
  `{ tiers: TierOption[]; state: SubscriptionState; expiry: string | null; phone: string | null }`
  (`TierOption` = `{ tierId, name, price, durationDays, description, isConcierge }`)
- **Visual pattern**: tier cards are clickable `<button>`s (`bg-card`, selected =
  `ring-2 ring-primary`, unselected = `ring-1 ring-border`); `Badge variant="outline"`
  "Concierge" with a `Crown` icon; active banner `Card` with `CheckCircle2` in
  `text-primary`; phone `Label` + `Input`; `Button` (default) "Pay KSh {price}" / "Extend
  — KSh {price}"; `Loader2` spinner + muted copy while awaiting; fires `plan_selected`
  (`tierId`) and `payment_initiated` (`paymentType: "subscription"`, `tierId`) PostHog
  events
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

### `DocumentViewer`

- **Location**: `src/components/dashboard/staff/verifications/document-viewer.tsx`
- **Purpose**: Renders a profile's two identity documents side by side via the audited
  vault route
- **Props**: `{ documents: ReviewDocument[] }` (`id`, `documentType`, `filename`)
- **Visual pattern**: two `Card`s in `grid gap-4 md:grid-cols-2`; each holds an
  `<iframe src="/api/actions/vault/{id}">` (auth + audit + signed-URL redirect) with an
  "Open in new tab" fallback link; `FileText` empty state per missing document
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
  / `verification_rejected` (`attempt`) PostHog events, then redirects back to the queue
- **Used in**: `(saas)/dashboard/staff/verifications/[id]/page.tsx`

### `CreateStaffForm`

- **Location**: `src/components/dashboard/admin/staff/create-staff-form.tsx`
- **Purpose**: Creates a staff account (first/last name + email); the temporary password
  is generated server-side
- **Props**: none
- **Visual pattern**: shadcn `Card`; two-column name grid + email `Input`; `text-success`
  confirmation line; calls `createStaffAction` then `router.refresh()`
- **Used in**: `(saas)/dashboard/admin/staff/page.tsx`

### `StaffTable`

- **Location**: `src/components/dashboard/admin/staff/staff-table.tsx`
- **Purpose**: Lists back-office accounts with inline rename and guarded delete; the
  signed-in admin's own row shows no actions
- **Props**: `{ staff: StaffRecord[]; currentUserId: string }`
- **Visual pattern**: `divide-y` list rows (stack on mobile, spread on desktop); initials
  avatar in `bg-primary/10 text-primary`; `Badge` role + "You"; inline `EditNameForm`;
  `AlertDialog`-guarded delete
- **Used in**: `(saas)/dashboard/admin/staff/page.tsx`

### `PlatformSettingsForm`

- **Location**: `src/components/dashboard/admin/settings/platform-settings-form.tsx`
- **Purpose**: Edits the mjakazi verification fee (single number) via
  `updateVerificationFeeAction`
- **Props**: `{ currentVerificationFee: number }`
- **Visual pattern**: shadcn `Card`; "KSh" prefix + number `Input`; Save `Button` with
  saving/saved state; inline `text-destructive` error; disabled when unchanged
- **Used in**: `(saas)/dashboard/admin/settings/page.tsx`

### `SubscriptionTiersForm`

- **Location**: `src/components/dashboard/admin/settings/subscription-tiers-form.tsx`
- **Purpose**: Edits the mwajiri subscription tiers (add/remove rows, PUT-replace the
  whole array) via `updateSubscriptionTiersAction`
- **Props**: `{ initialTiers: Tier[] }` (one empty row shown when none exist)
- **Visual pattern**: shadcn `Card`; per-tier bordered sub-card with
  name/id/price/duration `Input`s, description `Textarea`, Active + Concierge checkboxes;
  ghost Remove `Button` (hidden on the last row); `variant="outline"` "Add tier"; tierId
  auto-slugified from name
- **Used in**: `(saas)/dashboard/admin/settings/page.tsx`

### `AccountsTable`

- **Location**: `src/components/dashboard/accounts/accounts-table.tsx`
- **Purpose**: Shared list for wajakazi/waajiri accounts — rename (staff + admin) and
  delete (admin only)
- **Props**: `{ accounts: AccountRow[]; canDelete: boolean }`
- **Visual pattern**: same list-row pattern as `StaffTable`; status `Badge` with a
  page-mapped variant; delete button only rendered when `canDelete`
- **Used in**: `(saas)/dashboard/accounts/{wajakazi,waajiri}/page.tsx`

### `EditNameForm`

- **Location**: `src/components/dashboard/admin/edit-name-form.tsx`
- **Purpose**: Small inline first/last-name editor shared by `StaffTable` and
  `AccountsTable`
- **Props**:
  `{ initialFirstName: string; initialLastName: string; onSave: (first, last) => Promise<string | null>; onCancel: () => void }`
- **Visual pattern**: two `Input`s + Save/Cancel `Button`s; inline `text-destructive`
  error
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
  `verification_resubmitted` PostHog event on success then `router.refresh()`
- **Used in**: `(saas)/dashboard/mjakazi/verification/page.tsx`

### `DevPaymentSimulate`

- **Location**: `src/components/dashboard/dev/dev-payment-simulate.tsx`
- **Purpose**: Dev-only control (gated on `MPESA_ENVIRONMENT !== "production"`) that fires
  a synthetic Daraja callback through the real handler so a sandbox payment can complete
- **Props**: none
- **Visual pattern**: shadcn `Card` with a `FlaskConical` icon in `text-accent`; outline
  `Button` "Simulate payment confirmation"; calls `simulatePaymentCallbackAction` then
  `router.refresh()`
- **Used in**: `(saas)/dashboard/mjakazi/verification/page.tsx`,
  `(saas)/dashboard/mwajiri/subscription/page.tsx`

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
  fires `hire_confirmed` (`confirmedBy: "mjakazi"`) then `router.refresh()`
- **Used in**: `(saas)/dashboard/mjakazi/settings/page.tsx`

### `DirectoryCard`

- **Location**: `src/components/web/directory/directory-card.tsx`
- **Purpose**: A single wajakazi in the public directory — links to the profile's own
  detail page (no sign-up CTA), renders no contact fields
- **Props**: `{ profile: DirectoryProfile; basePath?: string }` (`basePath` defaults
  `/directory`)
- **Visual pattern**: shadcn `Card` (`group h-full gap-0 py-0 hover:shadow-lg`);
  `aspect-16/10` photo + hover zoom, `Verified` pill `bg-card text-success`,
  `text-heading` name, job `Badge variant="outline"`; accent `buttonVariants` "View
  Profile" → `{basePath}/{slug}`
- **Used in**: `src/app/(web)/directory/page.tsx`,
  `src/payload/blocks/wajakazi-archive/component.tsx` (via `RenderBlocks`)

### `DirectoryFilterBar`

- **Location**: `src/components/web/directory/directory-filter-bar.tsx`
- **Purpose**: The directory's search + filters (name, category, location, experience) —
  every filter lives in the URL query string; fires `directory_searched` PostHog event
- **Props**:
  `{ jobs; locations; current: { category?; location?; experience?; q? }; resultCount: number; basePath?: string }`
- **Visual pattern**: `Input` with `Search` icon + `Button`; three shadcn `Select`s
  (sentinel "all"); ghost "Clear" `Button`; `text-muted-foreground` result count;
  navigation via `useRouter` + `URLSearchParams`
- **Used in**: `src/app/(web)/directory/page.tsx`

### `DirectoryPagination`

- **Location**: `src/components/web/directory/directory-pagination.tsx`
- **Purpose**: Numbered pagination (9 per page) with windowed ellipsis; preserves active
  filters in every link
- **Props**:
  `{ currentPage; totalPages; baseParams: { category?; location?; experience?; q? }; basePath?: string }`
- **Visual pattern**: `Link`s styled `size-9 rounded-md border`; active page
  `bg-primary/10 text-primary`; `ChevronLeft`/`ChevronRight` prev/next; `…` ellipsis spans
- **Used in**: `src/app/(web)/directory/page.tsx`

### `DirectoryProfileDetail`

- **Location**: `src/components/web/directory/directory-profile-detail.tsx`
- **Purpose**: The public profile detail — full professional info with no contact fields,
  and a "Join as a mwajiri" CTA
- **Props**:
  `{ profile: DirectoryProfile; backHref?: string; contactSlot?: ReactNode; headerAction?: ReactNode }`
- **Visual pattern**: `ArrowLeft` back link; two-column grid (photo `aspect-4/5` left,
  content right); `text-heading` name + `Verified` pill; icon rows (`MapPin`, `Calendar`,
  `GraduationCap`, `Languages`, `Wallet`, `Briefcase`) in `text-primary`; job `Badge`s;
  CTA `Card` with accent "Join as a mwajiri" + outline "Sign in"
- **Used in**: `src/app/(web)/directory/[slug]/page.tsx`

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
- **Purpose**: The contact area on a mwajiri browse detail, three states — live contact
  (already unlocked), an "Unlock contact details" reveal button (active subscriber), or a
  "Subscribe to unlock" link (not active). The reveal calls `revealContactAction`, stores
  the returned phone/email locally, and fires `contact_unlocked`.
- **Props**: `{ mjakaziId: string; isActive: boolean; contact: Contact | null }`
- **Visual pattern**: shadcn `Card`; a live `ContactRow` (border, `Phone`/`Mail` icon,
  value or "Not provided") or a `MaskedRow` (`Lock` icon + `••••••••` placeholder) —
  placeholders only, never real values; `Button` reveal (active) or accent
  `buttonVariants` link to `/dashboard/mwajiri/subscription`; errors in
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
  / Choose a plan / Renew) use the accent treatment `bg-accent text-accent-foreground
  font-semibold`, never `outline`
- **Used in**: `src/app/(saas)/dashboard/mwajiri/page.tsx`

### `SaveToggle`

- **Location**: `src/components/dashboard/mwajiri/browse/save-toggle.tsx`
- **Purpose**: The save/unsave control on a mwajiri browse detail — calls
  `toggleSaveAction`, fires `profile_saved` (`saved`), then refreshes
- **Props**: `{ mjakaziId: string; initiallySaved: boolean }`
- **Visual pattern**: shadcn `Button` (`sm`), `Bookmark` icon (filled when saved);
  `variant="default"` when saved, `variant="outline"` otherwise; disabled while busy
- **Used in**: `src/app/(saas)/dashboard/mwajiri/browse/[slug]/page.tsx` (via
  `DirectoryProfileDetail`'s `headerAction`)

### `EoiSend`

- **Location**: `src/components/dashboard/mwajiri/saved/eoi-send.tsx`
- **Purpose**: The batch expression-of-interest send control on the saved page — a mwajiri
  selects 3–5 of their saved wajakazi and sends each an interest as one batch (gated on an
  active subscription)
- **Props**:
  `{ profiles: { id; displayName; location | null }[]; subscriptionActive: boolean }`
- **Visual pattern**: shadcn `Card` with a `Send` icon in `text-accent`; bordered checkbox
  rows (native `<input type="checkbox">` with `accent`-styled classes, `displayName` +
  muted location); "N selected — select at least 3" counter in `text-muted-foreground`;
  disabled `Button` until 3–5 selected; accent `buttonVariants` "Subscribe to send
  interest" link when not active; fires `interest_sent` (`count`) then `router.refresh()`
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
    (`response`) then `router.refresh()`
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
  then `router.refresh()`
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
- **Purpose**: The mwajiri hire-confirmation card — records a hire against candidates
  (wajakazi whose interest they accepted or whose contact they unlocked) and shows their
  hires with agree/reverse/end-contract actions; ending a completed contract opens the
  review form inline
- **Props**:
  `{ candidates: { mjakaziId; displayName; location | null; sourceEoiId | null }[]; hires: { id; mjakaziId; counterpartName; state: "pending_agreement" | "agreed" | "ended"; awaitingYou; reviewed }[] }`
- **Visual pattern**: shadcn `Card` with a `Handshake` icon in `text-accent`; "Mark as
  hired" bordered candidate rows each with a `Button`; "Your hires" list with `Badge`
  Hired (default) / Completed + Confirming (secondary) / Awaiting their agreement
  (outline) and Agree / Reverse / Not correct / **End contract** `Button`s, a **Leave a
  review** `Button` on ended hires, and a Reviewed `Badge`; ending a contract reveals
  `LeaveReviewForm` inline; calls `confirmHireAction` / `reverseHireAction` /
  `endHireAction`; fires `hire_confirmed` (`confirmedBy: "mwajiri"`) then
  `router.refresh()`
- **Used in**: `src/app/(saas)/dashboard/mwajiri/page.tsx`

### `RatingStars`

- **Location**: `src/components/rating-stars.tsx`
- **Purpose**: Read-only 1–5 star display shared by every review surface (filled stars in
  `text-warning`, empty in `text-muted-foreground`)
- **Props**: `{ rating: number }`
- **Visual pattern**: inline `Star` icons (`size-4`), filled via
  `text-warning fill-current`; `aria-label` "N out of 5 stars"
- **Used in**: `ReviewsPanel`, `ReviewQueue`, `ProfileReviews`, mwajiri browse detail

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
- **Purpose**: The worker's published reviews (shown + hidden) with a show/hide toggle so
  they choose what appears on their public profile
- **Props**:
  `{ reviews: { id; reviewerName | null; rating; comment; hidden; publishedAt | null }[] }`
- **Visual pattern**: stacked shadcn `Card`s; `RatingStars` + muted reviewer name;
  `Button` "Hide from profile" (ghost) / "Show on profile" (outline) calling
  `setReviewVisibilityAction` then `router.refresh()`; "Hidden from your public profile."
  muted note; `Star` empty state
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
  `approveReviewAction` / `rejectReviewAction` then `router.refresh()`
- **Used in**: `src/app/(saas)/dashboard/staff/reviews/page.tsx`

### `ProfileReviews`

- **Location**: `src/components/web/directory/profile-reviews.tsx`
- **Purpose**: The published, worker-visible reviews on a public profile, with the
  aggregate (average + count) heading
- **Props**:
  `{ reviews: { average: number | null; count: number; reviews: { reviewerName | null; rating; comment; publishedAt | null }[] } }`
- **Visual pattern**: `text-heading` "Reviews" heading + `RatingStars` + muted "N.N · N
  reviews" aggregate; per-review `bg-card` bordered rows (`RatingStars`, reviewer name,
  date, comment); renders `null` when empty
- **Used in**: `src/app/(web)/directory/[slug]/page.tsx`
