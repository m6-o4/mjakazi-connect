# Mjakazi Connect

High-trust digital platform connecting families (Mwajiri) with verified domestic
professionals (Wajakazi).

This version is a clean architectural rebuild focused on deterministic state machines,
strict domain boundaries, and audit-safe workflows.

---

## Vision

Mjakazi Connect is a structured, moderated hiring platform designed to:

- Enable Wajakazi to register and verify their credentials.
- Allow families to subscribe and access verified contact information.
- Enforce strict verification and subscription state rules.
- Maintain auditability and regulatory compliance (NDPA-aligned).

This system is built around explicit state machines and event-driven domain transitions.

---

## Core Architecture Principles

1. Deterministic state machines for:
   - Verification
   - Subscription
   - Payment

2. Strict API boundaries:
   - Frontend never mutates domain state directly.
   - Payment confirmation only via callback validation.
   - Role enforcement via Clerk.

3. No duplicated state flags.
4. All transitions are auditable.
5. Fail-closed security model.

---

## Tech Stack

- **Next.js (App Router)**
- **TypeScript**
- **Payload CMS**
- **MongoDB**
- **Clerk (Authentication)**
- **M-Pesa (STK Push integration - later phase)**

---

## Domain Overview

### Roles

- `mjakazi` – Domestic professional
- `mwajiri` – Employer / Family
- `admin` – Platform moderator
- `sa` – Super Admin

---

## Core State Machines

### 1. Verification (Wajakazi)

States:

- draft
- pending_payment
- pending_review
- verified
- rejected
- verification_expired
- blacklisted
- deactivated

Only verified profiles are visible in the public directory.

---

### 2. Subscription (Mwajiri)

States:

- none
- pending_payment
- active
- expired
- suspended
- blacklisted

Only active subscriptions can reveal contact details.

---

### 3. Payment

States:

- initiated
- stk_sent
- callback_received
- confirmed
- failed
- expired
- cancelled

Only `confirmed` payments may activate verification or subscription.

---

## Collections Overview

- users
- wajakazi_profiles
- mwajiri_profiles
- subscriptions
- payments
- contact_unlocks
- audit_logs
- reviews (planned)

Each concept has a single authoritative source of truth.

---

## Implementation Phases

1. Identity (Clerk + webhook sync)
2. Wajakazi Verification (draft → review → approved)
3. Payment Engine (isolated)
4. Payment → Verification integration
5. Subscription system
6. Contact Vault
7. Directory exposure rules
8. Expiry automation
9. Reviews (optional expansion)

Phases must be completed in order.

---

## Security Model

- Role-based access enforced server-side.
- No frontend-trusted state transitions.
- No direct Payload writes from client.
- Payment validation server-side only.
- Audit logs on every domain mutation.

---

## Development Guidelines

- One feature per commit.
- One state machine transition per endpoint.
- No implicit transitions.
- No boolean duplication of enum states.
- No cross-domain mutation in a single operation.

All prompts for AI-assisted coding must follow the internal Prompt Template System.

---

## Current Status

Phase: Repository Initialization  
Focus: Identity Spine (Clerk + Profile Creation)

Next Milestone: Wajakazi self-registration creates a draft profile in the database.

---

## License

Proprietary – All rights reserved.

---

## Maintainer

M6O4 Solutions
