# UI Rules

## Purpose
Concise, binding rules for building the project's user interface. These are the
rules an agent must follow when writing or modifying any UI code. Read this
before building any new UI component or page.

## Source of Truth
Visual decisions should defer to the design assets in `context/designs/interface/`
where available. If a rule here conflicts with a design asset, the design asset
wins and this file should be updated.

## Rules

### Tokens
- Never use a hardcoded hex value or a raw Tailwind color class (e.g. `bg-teal-500`).
  Always reference a token from `ui-tokens.md` / `globals.css` (e.g. `bg-primary`,
  `text-muted-foreground`).
- Adding a new color anywhere in the UI means adding it to `ui-tokens.md` first,
  not inlining it at the call site.

### Color contrast
- `--primary` (sage) and `--secondary` (terracotta) never carry white or
  light-colored text, in either light or dark mode. Both fail AA at normal
  weight (2.5:1 and 2.7:1 against white respectively). Always pair with their
  matching `-foreground` token.
- `--accent` (burnt orange) is the only brand color that supports white text,
  and only at 3.5:1 contrast — meaning `--accent-foreground` text must be
  semibold (600) or heavier and at least 14px. Never use `--accent` as a fill
  behind small or regular-weight text.
- `--destructive` is reserved for errors and destructive actions only. Never
  substitute it for `--accent` on a regular CTA, even though both read as
  "vibrant" — they must stay visually distinct.
- `--success` and `--warning` always pair with `--success-foreground` /
  `--warning-foreground` (dark text), no exceptions. Unlike `--accent`, neither
  gets a "semibold/14px+ unlocks white text" allowance — `--warning` fails
  outright even at large/bold (2.25:1), and `--success` sits in the same
  fragile bracket as `--accent` (3.42:1) without a stated reason to take that
  risk for a status color. Simpler to keep both dark-text-always.

### Typography
- `--font-sans` (Plus Jakarta Sans) is the only typeface for UI text — headings
  and body both. No second typeface without updating `ui-tokens.md` first.
- Headings and interactive labels (buttons, nav links) use semibold (600).
  Body copy uses regular (400).
- The brand script typeface (backflipss / Permanent Marker substitute) is not
  used in the UI — it's reserved for the logo wordmark asset only.
- Headings (h1/h2/h3-equivalent) use `--heading`, not `--foreground` and not
  `--accent`. This keeps headings reading as a brand color without competing
  with CTA orange. Body copy, captions, and UI chrome still use `--foreground`
  / `--muted-foreground`.

### Badges & small labels
- Never fill a badge/pill/small label with `--accent` and light text. Accent
  only clears contrast at semibold/14px+ (see Color contrast above), and
  badges are almost always smaller than that. Use a light/outlined treatment
  instead — e.g. white or `--muted` background with an `--accent` border and
  dark text — to signal "accent" without the contrast risk.
- Badges use a full radius (pill shape), not a step from the `--radius` scale.

### Layout
- Page max-width: `1280px`, centered. Adjust if a specific page genuinely
  needs more room, but don't drift wider by default.
- Container padding: `16px` on mobile, `24px` on tablet, `32px` on desktop.
- Vertical gap between page sections: `64px`–`96px` on marketing pages (the
  homepage mockup in `/interface` used this rhythm); `24px`–`32px` inside
  dashboard/app layouts where content is denser.
- Header: `72px` fixed height, full width, `--card` background, hairline
  `--border` bottom, no shadow.
- Mobile-first. Multi-column grids (feature cards, pricing tiers, profile
  cards) collapse to a single column below the `md` breakpoint.
- Use the `--radius` scale (`radius-sm` through `radius-4xl`) for corners.
  Never an arbitrary pixel/rem radius at the call site — see Component Values
  in `ui-tokens.md` for which step each component type uses.

### Cards
- Cards are always a neutral surface: `--card` background, hairline `--border`,
  `--radius-lg` (10px) corners. Never a colored card background (`--primary`,
  `--secondary`, `--muted`, `--accent`).
- Color lives inside the card — badges, icons, buttons, text — never on the
  card surface itself. This is the same lesson the homepage mockup surfaced
  when full-bleed blush section backgrounds got replaced with white cards and
  a sparing accent; it generalizes to every card, not just that page.

### Buttons
- Radius: `--radius-md` (8px). Padding: `16px` horizontal / `8px` vertical.
  Label: 14px, semibold (600).
- Primary (`--primary` fill), secondary (`--secondary` fill), and accent/CTA
  (`--accent` fill) all follow the Color contrast rules above for their
  foreground token.
- Outline/ghost buttons: transparent background, `--border` outline (or none
  for ghost), `--foreground` text.

### Form inputs
- Radius: `--radius-md` (8px). Padding: `12px` horizontal / `8px` vertical.
- `--card` background, `--border` outline, `--foreground` text,
  `--muted-foreground` placeholder text.
- Focus state: ring in `--ring` (sage) — matches the token already used for
  focus rings generally.

### Empty states
- Every list/section that can be empty needs an explicit empty state — never
  leave a blank gap where content would normally render.
- Minimal pattern: a `lucide-react` icon in `--muted-foreground`, one line of
  descriptive text in `--muted-foreground`, and a CTA button only if there's a
  genuine next action. No illustration-heavy empty states unless a specific
  page calls for one by design.

### Icons
- `lucide-react` is the icon library, already included in the Payload Template
  base (Tailwind + Shadcn/UI). No other icon set or hand-drawn SVG icons.
- Default icon size 16–20px inline with text, 24px max for standalone/decorative
  use. Icons inherit `currentColor` — never a hardcoded icon fill.

### Animation & motion
- Minimal by design — this is not a motion-heavy product. Rely on Shadcn/UI's
  built-in defaults (hover/focus states, transitions on things like dropdowns,
  dialogs, toasts) rather than adding custom animation.
- No custom motion library, no page-transition animations, no scroll-triggered
  effects. If a specific interaction genuinely needs bespoke motion, decide it
  at that point and record the exception here — don't default to adding it.

### Pending
The following are not yet decided and should not be assumed — confirm before
building rather than guessing:
- Loading / error state patterns — empty states now have a baseline (above),
  but loading and error patterns don't yet. Define when the first component
  that needs one is built, then record it here.
