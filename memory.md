# Memory — Shadcn Card migration + card.tsx token customization

Last updated: 2026-08-26 07:49

## What was built

- `src/components/container.tsx` — new responsive container: `mx-auto w-full max-w-(--container) px-4 sm:px-6 lg:px-8`. Dropped the `container` class (a Tailwind v4 no-op) and the `py-8` default. Import order kept react-first (per `.prettierrc.json`).
- `src/globals.css` — added `--container: 1280px` to `:root` (backs `max-w-(--container)`; equals Tailwind `max-w-7xl` / 80rem).
- `src/components/ui/card.tsx` — customized to project tokens: `rounded-xl`→`rounded-lg` (root/header/footer + `img` corner selectors), `ring-foreground/10`→`ring-border`, `CardTitle` `font-medium`→`font-semibold` + added `text-heading`.
- `src/payload/blocks/posts-archive/component.tsx` — post card → shadcn `Card` + `CardContent`.
- `src/payload/blocks/pricing/component.tsx` — plan card → `Card` + `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`; popular variant `ring-2 ring-primary`, others inherit `ring-border`; `CardTitle` is just `text-lg` (inherits the new defaults).
- `src/payload/blocks/testimonials/component.tsx` — testimonial card → `Card` + `CardContent`; hover aligned to `hover:ring-primary/30` + `transition-all`.

## Decisions made

- Shadcn v4 sits on **Base UI, not Radix**. `Card` primitive uses a `ring` (box-shadow) outline, not `border`; ships `overflow-hidden` and `py`/`gap` of `--card-spacing` (16px).
- Customized `card.tsx` once so all cards share `rounded-lg` (10px) + `ring-border` (hairline `--border`) instead of per-instance overrides. Removed the now-redundant `rounded-2xl`/`ring-border` from consumers.
- Standard hover treatment across all cards: `hover:ring-primary/30` + `transition-all` (ring color is a box-shadow, so `transition-colors` would not animate it).
- `--container: 1280px` chosen because `ui-rules.md` says page max-width 1280px; equals `max-w-7xl`.

## Problems solved

- `max-w-(--container)` requires `--container` to exist; defined it in `:root` (not `@theme inline`, which does not emit `:root` vars).
- `Card` is `flex flex-col`; this makes `mt-auto` actually pin bottom content (testimonials author now bottom-aligned — the old `<div>` was not flex, so its `mt-auto` was dead).
- `Card` uses a `ring` for its outline, not `border` — converted `border-*` classes to `ring-*`.
- `Card`'s `overflow-hidden` clips absolutely-positioned children that hang outside — pricing's "Most Popular" badge needed `overflow-visible`.

## Current state

- Three marketing blocks migrated to shadcn `Card`; `card.tsx` customized to tokens. Per-file `eslint` passes on all changed files.
- Full `pnpm build` NOT run (needs env). No schema changes, so `generate:types` not needed.
- Cards now consistent and on-spec: `rounded-lg` (10px) + `ring-border` hairline + semibold sage `CardTitle` + `hover:ring-primary/30`.

## Next session starts with

Continue the card migration to the remaining hand-rolled blocks (`features`, `how-it-works`, `hero`, `registration`, `content-editor`, `posts/[slug]`, `not-found`) — they still use `<div>` cards and may lose vertical spacing from the container's removed `py-8`. Then resume the build plan at **Phase 0.1 — Role enum migration** (`admin | staff | mwajiri | mjakazi`).

## Open questions

- Run a full `pnpm build`, and do a visual pass of the homepage sections affected by the container's removed `py-8` + new 1280px cap (and the new 10px card radius).
