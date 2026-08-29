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
- **Purpose**: Role-scoped dashboard navigation rail
- **Props**: `{ role: Role }`
- **Visual pattern**: `bg-card` + `border-border` right border, `text-heading` wordmark, `bg-primary/10 text-primary` active nav link
- **Used in**: `(saas)/dashboard/layout.tsx`

### `Topbar`
- **Location**: `src/components/dashboard/topbar.tsx`
- **Purpose**: Dashboard header with the signed-in user's chip and sign-out
- **Props**: `{ user: User }`
- **Visual pattern**: `border-border` bottom border, `text-foreground`/`text-muted-foreground` name + email, hosts `SignOutButton`
- **Used in**: `(saas)/dashboard/layout.tsx`
