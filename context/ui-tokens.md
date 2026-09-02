# UI Tokens

## Purpose

This file is the canonical registry of design tokens for the project — colors, typography,
spacing, and component-level values. Never use hardcoded hex values or raw Tailwind color
classes; always reference a token defined here. Read this before building any new UI
component.

## Source of Truth

Token values are extracted from `branding/brand_guideline.pdf` and validated in
`globals.css`. `context/designs/interface/` does not exist yet — once interface designs
are added there, this file must be re-synced to match, and that folder becomes the source
of truth going forward.

## Colors

Both light and dark mode are finalized as of the color/typography pass below.

| Token                    | Light                                                                                     | Dark                        | Usage                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--background`           | `#FBFAF7`                                                                                 | `#171C19`                   | Page background                                                                                                                                                   |
| `--foreground`           | `#1F2A24`                                                                                 | `#F5F2EC`                   | Default text                                                                                                                                                      |
| `--heading`              | `#2F5A48`                                                                                 | `#8FCBB3`                   | Headings only (h1/h2/h3-equivalent). A deep sage, distinct from body text and from `--accent`, so headings read as a brand color rather than plain black          |
| `--card`                 | `#FFFFFF`                                                                                 | `#1D231F`                   | Card/panel surfaces                                                                                                                                               |
| `--primary`              | `#7BAE9A` (sage)                                                                          | `#7BAE9A`                   | Primary brand actions, active states                                                                                                                              |
| `--primary-foreground`   | `#1F2A24`                                                                                 | `#1F2A24`                   | Text/icons on `--primary` — white fails contrast on sage (2.5:1)                                                                                                  |
| `--secondary`            | `#D88B6B` (terracotta)                                                                    | `#D88B6B`                   | Secondary actions, warm accents                                                                                                                                   |
| `--secondary-foreground` | `#1F2A24`                                                                                 | `#1F2A24`                   | Text on `--secondary` — white fails contrast on terracotta (2.7:1)                                                                                                |
| `--muted`                | `#FBD0C9` (blush)                                                                         | `#2C332D`                   | Soft section backgrounds, subtle fills. Blush is too light to double as a dark-mode surface, so dark mode swaps to a dark neutral                                 |
| `--muted-foreground`     | `#423F37`                                                                                 | `#C7CBC2`                   | De-emphasized/secondary body text                                                                                                                                 |
| `--accent`               | `#E45F2B` (burnt orange)                                                                  | `#E45F2B`                   | CTA buttons, vibrant highlights                                                                                                                                   |
| `--accent-foreground`    | `#FFFFFF`                                                                                 | `#FFFFFF`                   | Text on `--accent` — passes at 3.5:1, so accent buttons must be semibold/14px+ (see `ui-rules.md`)                                                                |
| `--destructive`          | `oklch(0.577 0.245 27.325)`                                                               | `oklch(0.704 0.191 22.216)` | Errors/destructive actions. Kept as standard red, deliberately separate from the orange accent so error state stays visually distinct from a CTA                  |
| `--success`              | `#4C9A6A`                                                                                 | `#7ECB98`                   | Success/positive states. Leaf green, kept distinct from `--primary` sage                                                                                          |
| `--success-foreground`   | `#1F2A24`                                                                                 | `#1F2A24`                   | Text/icons on `--success` — white only clears 3.42:1 (same bracket as `--accent`), so this stays dark text always rather than carrying a semibold/14px+ exception |
| `--warning`              | `#D9A441`                                                                                 | `#E8BE6E`                   | Warning/caution states. Golden amber, kept distinct from `--accent` orange and `--secondary` terracotta                                                           |
| `--warning-foreground`   | `#1F2A24`                                                                                 | `#1F2A24`                   | Text/icons on `--warning` — white fails outright at 2.25:1, even at large/bold sizes. Dark text always                                                            |
| `--border` / `--input`   | `#E7E2D8`                                                                                 | `#2C332D`                   | Warm-tinted neutral, replacing stock cold gray                                                                                                                    |
| `--ring`                 | `#7BAE9A`                                                                                 | `#7BAE9A`                   | Focus ring — matches primary                                                                                                                                      |
| `--chart-1..5`           | sage `#7BAE9A`, terracotta `#D88B6B`, blush `#FBD0C9`, orange `#E45F2B`, yellow `#FFD639` | same                        | Full five-color brand set, in guideline order. Kept identical across modes for brand recognition                                                                  |

Sidebar tokens (`--sidebar*`) intentionally alias the roles above (`--sidebar` → `--card`,
`--sidebar-primary` → `--primary`, etc.) rather than restating literal values, so the
sidebar never drifts from the base palette.

## Typography

Brand guideline specifies two typefaces; neither is free/Google-licensed, so both are
substituted with close free equivalents:

| Role           | Guideline font                           | Substitute            | Notes                                                                                                                                                        |
| -------------- | ---------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Heading + body | Proxima Nova Alt, SemiBold, 200 tracking | **Plus Jakarta Sans** | `--font-sans` in `globals.css`. Closest free match in proportion/warmth; used for all UI text                                                                |
| Wordmark only  | backflipss (brush script)                | —                     | Logo stays an SVG/PNG asset; this font is not loaded in the app. If a script accent is ever needed elsewhere, **Permanent Marker** is the closest free match |

Font is declared in `globals.css` via `--font-sans`. Actual webfont loading
(`next/font/google` in the app's font/layout setup) is not yet wired up — no Next.js app
scaffold exists in this repo yet, only design/context files. Revisit once the Payload
Template scaffold is in place.

`@tailwindcss/typography` is registered in `globals.css` via `@plugin`. This is separate
from the type scale above — it's for styling long-form rendered content (blog post bodies,
CMS rich text) with the `prose` class, not for general UI text. Any `prose` usage should
still resolve to the token colors above rather than the plugin's own defaults — override
`--tw-prose-*` variables to point at `--foreground` / `--heading` / `--muted-foreground`
when this gets wired up.

### Type scale

Proposed defaults, not yet validated against a built page the way colors were against the
homepage mockup — treat as a starting point, adjust once more pages exist.

| Role                        | Size    | Weight | Line height | Color token                               |
| --------------------------- | ------- | ------ | ----------- | ----------------------------------------- |
| H1 (page hero)              | 36–40px | 600    | 1.2         | `--heading`                               |
| H2 (section heading)        | 24–28px | 600    | 1.3         | `--heading`                               |
| H3 (card/component heading) | 16–18px | 600    | 1.4         | `--heading`                               |
| Body / primary text         | 15–16px | 400    | 1.6         | `--foreground`                            |
| Caption / secondary text    | 13px    | 400    | 1.5         | `--muted-foreground`                      |
| Button / interactive label  | 14px    | 600    | 1           | matches the surface's `-foreground` token |

## Spacing

Not yet customized — inherits Tailwind's default spacing scale. No brand-driven spacing
decisions have been made at this stage, beyond the page-level values now in
`ui-rules.md`'s Layout section.

## Component Values

- `--radius`: `0.625rem` base, unchanged from the template default. `--radius-sm` (6px)
  through `--radius-4xl` (26px) scale off it (see `globals.css`).
- Buttons and form inputs use `--radius-md` (8px).
- Cards use `--radius-lg` (10px, the base `--radius` value).
- Badges/pills use a full radius (Tailwind's `rounded-full`), not a scale step.
- Borders: `0.5px`–`1px` hairline using `--border`/`--input`, no custom widths introduced
  yet.
