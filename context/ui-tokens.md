# UI Tokens

## Purpose
This file is the canonical registry of design tokens for the project — colors,
typography, spacing, and component-level values. Never use hardcoded hex values
or raw Tailwind color classes; always reference a token defined here. Read this
before building any new UI component.

## Source of Truth
Token values are extracted from the interface design documents in
`context/designs/interface/`. When those designs are added or updated, this file
must be re-synced to match.

## Colors
[Token name → value/CSS variable → usage. e.g. `--color-primary` → ... → primary
actions, links]

## Typography
[Font families, sizes, weights, line-heights — as named tokens/scale steps]

## Spacing
[Spacing scale — named steps and their pixel/rem values]

## Component Values
[Token values specific to components — e.g. radius, shadow, border widths —
that recur across the UI]
