# UI Registry

## Purpose
A living catalog of every UI component built in this project. Read this before
creating any new component to check for existing patterns to reuse or match.
Updated after every component is built (via the `/imprint` skill) so the
registry never drifts from the actual codebase.

## How to Use
- **Before building**: search this file for a similar existing component before
  creating a new one.
- **After building**: add an entry for the new component, following the format
  below.

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
- **Visual pattern**: shadcn `Button` variant `ghost`; calls `useClerk().signOut({ redirectUrl: "/" })`
- **Used in**: `Topbar`

### `Sidebar`
- **Location**: `src/components/dashboard/sidebar.tsx`
- **Purpose**: Role-scoped dashboard navigation rail (desktop only — `hidden md:flex`)
- **Props**: `{ role: Role }`
- **Visual pattern**: `bg-card` + `border-border` right border, `text-heading` wordmark, `bg-primary/10 text-primary` active nav link; reads `getNavItems` from `lib/dashboard-nav.ts`
- **Used in**: `(saas)/dashboard/layout.tsx`

### `MobileNav`
- **Location**: `src/components/dashboard/mobile-nav.tsx`
- **Purpose**: Hamburger-triggered left `Sheet` holding the same nav as the sidebar, for `< md`
- **Props**: `{ role: Role }`
- **Visual pattern**: `Button` variant `ghost` size `icon` trigger (`md:hidden`), `SheetContent side="left"`, active link `bg-primary/10 text-primary`
- **Used in**: `Topbar`

### `Topbar`
- **Location**: `src/components/dashboard/topbar.tsx`
- **Purpose**: Dashboard header with the signed-in user's chip and sign-out
- **Props**: `{ user: User }`
- **Visual pattern**: `border-border` bottom border, `text-foreground`/`text-muted-foreground` name + email, hosts `MobileNav` (left) and `SignOutButton`; email hidden below `sm`
- **Used in**: `(saas)/dashboard/layout.tsx`

### `ProfileCompletenessCard`
- **Location**: `src/components/dashboard/mjakazi/profile-completeness-card/index.tsx`
- **Purpose**: Progress bar + checklist of the 11 required profile fields; each incomplete item links to the profile form
- **Props**: `{ items: { label: string; complete: boolean; href: string }[] }`
- **Visual pattern**: shadcn `Card`; `bg-muted` track + `bg-primary` fill; `CheckCircle2`/`Circle` icons from lucide in `text-accent`/`text-muted-foreground`
- **Used in**: `(saas)/dashboard/mjakazi/page.tsx`

### `ProfileForm`
- **Location**: `src/components/dashboard/mjakazi/profile-form/index.tsx`
- **Purpose**: The mjakazi profile form (identity + professional + work sections) with react-hook-form + zod
- **Props**: `{ initialValues: ProfileFormValues; photo: { id: string; url: string | null } | null; initialProfileComplete: boolean }`
- **Visual pattern**: sectioned shadcn `Card`s; `grid gap-4 md:grid-cols-2` field layout; fires `profile_completed` PostHog event on the first false→true completeness transition
- **Used in**: `(saas)/dashboard/mjakazi/profile/page.tsx`

### `FormSelect`
- **Location**: `src/components/dashboard/mjakazi/profile-form/form-select.tsx`
- **Purpose**: Bridges a single-select shadcn `Select` (Base UI) to react-hook-form
- **Props**: `{ name; label; options: readonly { label; value: string }[]; placeholder? }`
- **Visual pattern**: `Label` + `Select`/`SelectTrigger`/`SelectContent`; `text-destructive` error line
- **Used in**: `ProfileForm`

### `OptionChips`
- **Location**: `src/components/dashboard/mjakazi/profile-form/option-chips.tsx`
- **Purpose**: Tap-to-toggle chip multi-select for `jobsSkills` and `languages`
- **Props**: `{ name; label; options: readonly { label; value: string }[] }`
- **Visual pattern**: pill `button`s; selected = `border-primary bg-primary text-primary-foreground`, unselected = `border-border text-foreground hover:bg-muted`
- **Used in**: `ProfileForm`

### `PhotoField`
- **Location**: `src/components/dashboard/mjakazi/profile-form/photo-field.tsx`
- **Purpose**: Uploads the profile photo independently (persists immediately with preview) via `POST /api/actions/profile/photo`
- **Props**: `{ photoUrl: string | null; onUploaded: (photo, profileComplete) => void }`
- **Visual pattern**: `size-20` preview; `Button` variant `outline`; `text-muted-foreground` helper line
- **Used in**: `ProfileForm`

### `FormDatePicker`
- **Location**: `src/components/dashboard/mjakazi/profile-form/form-date-picker.tsx`
- **Purpose**: shadcn `Calendar` + `Popover` date picker bridged to react-hook-form; stores a `YYYY-MM-DD` string
- **Props**: `{ name: "dateOfBirth" | "availableFrom"; label: string; placeholder? }`
- **Visual pattern**: `PopoverTrigger` styled with `buttonVariants({ variant: "outline" })`; `Calendar` `mode="single"`; `Clear` ghost button when set
- **Used in**: `ProfileForm`

### `DocumentVault`
- **Location**: `src/components/dashboard/mjakazi/document-vault/index.tsx`
- **Purpose**: The two document slots (National ID + Certificate of Good Conduct) — upload, replace, view and remove, each remove guarded by a confirmation
- **Props**: `{ documents: { id: string; documentType: string; filename: string | null }[] }`
- **Visual pattern**: two shadcn `Card`s in a `grid gap-4 md:grid-cols-2`; `Badge` "Uploaded" + truncated filename; `Button` outline/ghost actions with a `buttonVariants`-styled "View" link; empty state with a `FileText`/`ShieldCheck` lucide icon; remove guarded by shadcn `AlertDialog`; fires `documents_uploaded` PostHog event when both slots fill
- **Used in**: `(saas)/dashboard/mjakazi/documents/page.tsx`

### `VerificationStatusCard`
- **Location**: `src/components/dashboard/mjakazi/verification-status-card/index.tsx`
- **Purpose**: The post-profile step of the verification journey on the dashboard Overview — shows which documents are missing, and "ready for verification" once both are uploaded
- **Props**: `{ documents: { label: string; uploaded: boolean }[] }`
- **Visual pattern**: shadcn `Card`; checklist rows (`CheckCircle2` in `text-accent` when done, `Circle` in `text-muted-foreground` + `ArrowRight` when pending); `buttonVariants`-styled "Upload documents" link only while a document is missing; payment/review states to slot in here in later phases
- **Used in**: `(saas)/dashboard/mjakazi/page.tsx`

### `CreateStaffForm`
- **Location**: `src/components/dashboard/admin/staff/create-staff-form.tsx`
- **Purpose**: Creates a staff account (first/last name + email); the temporary password is generated server-side
- **Props**: none
- **Visual pattern**: shadcn `Card`; two-column name grid + email `Input`; `text-success` confirmation line; calls `createStaffAction` then `router.refresh()`
- **Used in**: `(saas)/dashboard/admin/staff/page.tsx`

### `StaffTable`
- **Location**: `src/components/dashboard/admin/staff/staff-table.tsx`
- **Purpose**: Lists back-office accounts with inline rename and guarded delete; the signed-in admin's own row shows no actions
- **Props**: `{ staff: StaffRecord[]; currentUserId: string }`
- **Visual pattern**: `divide-y` list rows (stack on mobile, spread on desktop); initials avatar in `bg-primary/10 text-primary`; `Badge` role + "You"; inline `EditNameForm`; `AlertDialog`-guarded delete
- **Used in**: `(saas)/dashboard/admin/staff/page.tsx`

### `AccountsTable`
- **Location**: `src/components/dashboard/accounts/accounts-table.tsx`
- **Purpose**: Shared list for wajakazi/waajiri accounts — rename (staff + admin) and delete (admin only)
- **Props**: `{ accounts: AccountRow[]; canDelete: boolean }`
- **Visual pattern**: same list-row pattern as `StaffTable`; status `Badge` with a page-mapped variant; delete button only rendered when `canDelete`
- **Used in**: `(saas)/dashboard/accounts/{wajakazi,waajiri}/page.tsx`

### `EditNameForm`
- **Location**: `src/components/dashboard/admin/edit-name-form.tsx`
- **Purpose**: Small inline first/last-name editor shared by `StaffTable` and `AccountsTable`
- **Props**: `{ initialFirstName: string; initialLastName: string; onSave: (first, last) => Promise<string | null>; onCancel: () => void }`
- **Visual pattern**: two `Input`s + Save/Cancel `Button`s; inline `text-destructive` error
- **Used in**: `StaffTable`, `AccountsTable`

### `AuditLogTable`
- **Location**: `src/components/dashboard/audit-logs/audit-log-table.tsx`
- **Purpose**: Read-only audit trail viewer — filter by action/source, paginate, show actor → target + flattened metadata
- **Props**: `{ logs: AuditLog[]; totalDocs; totalPages; currentPage; currentAction; currentSource; hasNextPage; hasPrevPage }`
- **Visual pattern**: two `Select` filters + entry count; `divide-y` list rows (stack on mobile) with action `Badge`, timestamp, "actor → target", flattened `key: value · …` metadata line, source `Badge`; `ShieldQuestion` empty state; Previous/Next `Button` pagination
- **Used in**: `(saas)/dashboard/audit-logs/page.tsx`

### `AuthenticatingClient`
- **Location**: `src/components/auth/authenticating-client.tsx`
- **Purpose**: Wait screen shown after sign-in/up — renders immediately, then fetches `/post-auth` for the redirect target and navigates
- **Props**: `{ message: string }`
- **Visual pattern**: centered `Loader2` spinner + one-line message + muted "This will only take a moment." subtitle
- **Used in**: `(auth)/authenticating/page.tsx`
