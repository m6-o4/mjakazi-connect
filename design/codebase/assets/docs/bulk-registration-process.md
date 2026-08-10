For this platform, a **bulk Wajakazi registration workflow** should preserve the same
guarantees as the normal onboarding pipeline:

- Identity Spine must still be respected
- Verification lifecycle must remain intact
- No internal IDs exposed
- Admin actions must remain auditable

Bulk onboarding should therefore **bootstrap accounts**, not bypass the system.

Below is the appropriate workflow.

---

# 1. Use Case

Bulk onboarding will likely occur when:

- an agency submits many workers
- field officers register workers offline
- the platform migrates legacy records
- a partner organization supplies verified workers

The goal is to **create accounts and worker profiles at scale**.

---

# 2. Bulk Import Entry Point

Admin uploads a dataset.

Accepted formats:

```id="gpgb0k"
CSV
Excel (.xlsx)
```

Example structure:

```id="o0brrp"
first_name
last_name
phone
email (optional)
national_id
county
experience_years
```

Phone number is important because many workers may **not have email accounts**.

---

# 3. Admin Upload Interface

Admin dashboard page:

```id="t1ik5o"
/dashboard/admin/wajakazi-import
```

Capabilities:

- upload CSV
- preview parsed rows
- validate data
- confirm import

The UI should display:

```id="3bg8aq"
total rows
valid rows
invalid rows
duplicate detection
```

---

# 4. Validation Stage

Before import begins, the system validates:

### Required fields

```id="d3qj4o"
first_name
phone
national_id
```

### Duplicate detection

Check against:

```id="53h2k5"
accounts collection
wajakaziprofiles collection
```

Duplicate rules:

```id="qcv5nl"
same phone
same national_id
```

Invalid rows are rejected before import begins.

---

# 5. Identity Creation

For each valid row:

### Step 1 — Create Clerk user

Role metadata:

```id="rdldrv"
publicMetadata.role = "mjakazi"
```

Authentication options:

- phone-based login
- email login
- temporary password

---

### Step 2 — Create account record

Insert into:

```id="ts1i2u"
accounts
```

---

### Step 3 — Create worker profile

Insert into:

```id="a2zj3q"
wajakaziprofiles
```

Fields populated from import file.

---

# 6. Initial Verification State

Imported workers should start at:

```id="3n1n4k"
draft
```

Reason:

Bulk import **must not bypass verification**.

Workers must still upload:

```id="s0c9nf"
ID
supporting documents
```

unless the import source is trusted (see below).

---

# 7. Optional Trusted Import Mode

If the importer is a **verified partner organization**, an alternative mode may exist.

Import mode:

```id="jvl2ef"
verified_import
```

In this mode:

```id="ks5j8e"
verificationStatus = "pending_review"
```

Admins then simply review documents.

---

# 8. Notification Step

After import:

Workers receive an invitation.

Channels:

```id="f3ztvl"
SMS
Email
```

Example message:

```id="iq1s6l"
You have been registered on Mjakazi Connect.
Complete your verification to activate your profile.
```

Link leads to:

```id="nmy78s"
/sign-in
```

---

# 9. Audit Logging

Every import must generate a record in:

```id="8jtszi"
audit_logs
```

Captured metadata:

```id="k4f5j3"
admin_id
timestamp
file_name
rows_processed
rows_created
rows_failed
```

This ensures **traceability**.

---

# 10. Background Processing

Large imports should not run synchronously.

Use:

```id="zajb6c"
Inngest job
```

Flow:

```id="zk9t5f"
admin upload
→ validation
→ queue job
→ background worker processes rows
→ progress updates
```

---

# 11. Import Result Report

After completion, the admin sees:

```id="6ayh2t"
rows imported
duplicates skipped
errors
```

Downloadable error report:

```id="p79hux"
failed_rows.csv
```

---

# 12. Resulting State

After bulk import:

```id="5bxyb1"
accounts created
worker profiles created
verificationStatus = draft
```

Workers still follow the **normal verification journey**:

```id="3q6p0p"
draft
→ pending_payment
→ pending_review
→ verified
```

---

# Key Principle

Bulk onboarding **accelerates account creation** but **must never bypass the verification
state machine**.

This keeps the platform consistent with the trust model of the system.
