# Architecture

## Purpose
This file defines the technical shape of the project: the stack, how the codebase
is organized, where system boundaries are, how data flows, the data schema, and
the hard rules an agent must never violate. Read this before writing any code that
touches structure, data, or cross-boundary logic.

## Tech Stack
- [Framework, version, key libraries — e.g. Next.js, Payload CMS, database, etc.]

## Folder Structure
[Map of the project's directory layout and what lives where — e.g. `src/app`,
`src/payload`, `src/components`, `context/`, etc. Note any conventions for where
new code should go.]

## System Boundaries
[Where the app's responsibilities start/stop — e.g. client vs. server, admin
panel vs. public site, what's handled by Payload vs. custom code, third-party
integrations.]

## Data Flow
[How data moves through the system — request lifecycle, rendering strategy
(SSR/ISR/static), API routes, auth flow, where data is fetched/mutated.]

## Data Schema
[Overview of core collections/models and their relationships. Link to or
summarize the Payload collections and how they relate to each other.]

## Rules the Agent Must Never Violate
- [Hard constraints — e.g. don't bypass access control, don't query the DB
  directly outside Payload's local API, don't introduce a new state
  management library, etc.]
