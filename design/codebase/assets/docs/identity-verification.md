Your instinct is correct in principle: **documents should not appear on a public profile
until the platform has validated them**. However, that does **not mean all documents
belong to the same verification workflow**. The system should separate **identity
verification** from **credential validation**.

The distinction matters for architecture, moderation workload, and user experience.

---

# 1. Identity Verification (Mandatory Trust Layer)

This is the **core platform trust gate**.

Documents here prove that the person is **real and legally identifiable**.

Typical documents:

- National ID
- Certificate of Good Conduct
- Possibly proof of residence

Storage location:

```
vault
```

Lifecycle:

```
draft
→ pending_review
→ verified / rejected
```

Once verified, the **worker account becomes eligible for marketplace visibility**.

Important: These documents **remain private** and are **never shown publicly**.

Purpose:

```
platform trust
fraud prevention
identity confirmation
```

---

# 2. Credential Validation (Optional Profile Enrichment)

Certificates and diplomas serve a different purpose.

Examples:

- childcare training
- hospitality diploma
- first aid certification

These should go through a **credential review workflow**, but it does **not block the
worker from participating in the marketplace**.

Lifecycle example:

```
uploaded
→ under_review
→ validated / rejected
```

Once validated, they can appear on the profile as:

```
Verified Credential
```

Purpose:

```
skill credibility
profile differentiation
better hiring decisions
```

---

# 3. Profile Photo

A passport photo should not require document verification.

However it should still pass **basic moderation**:

Checks may include:

- face visibility
- inappropriate content
- image quality

This is a **light moderation step**, not a document verification step.

---

# 4. Correct Architectural Separation

| Category           | Purpose           | Storage             | Public                 |
| ------------------ | ----------------- | ------------------- | ---------------------- |
| Identity documents | verify the person | `vault`             | No                     |
| Credentials        | verify skills     | profile credentials | Yes (after validation) |
| Profile photo      | visual identity   | profile field       | Yes                    |

---

# 5. Why This Separation Matters

If everything enters the **same verification pipeline**:

- moderation queues become overloaded
- workers must wait for skill certificate approval before appearing in the marketplace
- verification state machine becomes overly complex

Keeping them separate ensures:

```
identity verification = trust gate
credential validation = optional enrichment
```

---

# 6. Practical Worker Flow

Worker onboarding:

```
Sign up
→ Upload ID + Good Conduct
→ Submit verification
→ Admin approves
→ Worker becomes visible
```

Later, worker improves profile:

```
Upload certificates
→ platform validates credentials
→ badge appears on profile
```

---

# 7. Marketplace Result

Profiles could eventually show:

```
Verified Worker ✓
First Aid Certified ✓
Childcare Training ✓
```

while the **actual documents remain private**.

---

# 8. Key Principle

Every document may be **verified**, but **not every document belongs to the identity
verification domain**.

Separate pipelines keep the system maintainable and scalable.
