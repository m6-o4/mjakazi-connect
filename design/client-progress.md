# Mjakazi Connect — Progress Milestones

A plain-language view of what exists at each stage, who uses it, and where.
Written to be read aloud to a client. Not an agent instruction file.

Each milestone is something you can **demonstrate on screen**, not a percentage.

---

## Milestone 1 — Accounts work

**What the client sees**: go to the website, click "Join as Mjakazi" or "Join as
Mwajiri", create an account, and land on your own dashboard. Different people
see different things.

| Who | What they can do | Where |
|---|---|---|
| Mjakazi | Sign up, sign in, see their dashboard | `/dashboard/mjakazi` |
| Mwajiri | Sign up, sign in, see their dashboard | `/dashboard/mwajiri` |
| Staff | Sign in, see their work area | `/dashboard/staff` |
| Admin | Sign in, see the platform overview | `/dashboard/admin` |

Nobody can reach anyone else's area. The dashboards are mostly empty at this
point, and that is expected — the rooms exist, the furniture arrives next.

---

## Milestone 2 — A worker can build a profile

**What the client sees**: a Mjakazi fills in their full profile — name, photo,
skills, experience, languages, education, location, salary expectations — and
uploads their National ID and Certificate of Good Conduct.

**Where**: `/dashboard/mjakazi/profile` and `/dashboard/mjakazi/documents`

**Worth saying to the client**: the documents are stored privately. Nobody
reaches them by guessing a web address, and every single time a staff member
opens one, the system records who looked, at whose document, and when. That
record cannot be edited or deleted by anyone.

---

## Milestone 3 — Staff can verify

**What the client sees**: a staff member opens their queue, sees workers waiting
for review oldest first, opens one, views the ID and the certificate side by
side, and either approves or rejects with a reason.

**Where**: `/dashboard/staff/verifications`

Approved means the Verified badge appears and the 12-month clock starts.
Rejected means the worker is told why and can correct and resubmit, up to three
times, without paying again.

**This is the milestone that makes the product real.** Everything before it is
plumbing. From here on there is something worth paying for.

---

## Milestone 4 — Workers can pay

**What the client sees**: a Mjakazi finishes their profile, taps to pay the
KSh 1,500 verification fee, gets the M-Pesa prompt on their phone, enters their
PIN, and within seconds their profile moves into the review queue.

**Where**: `/dashboard/mjakazi/verification`

**First money in.**

**Worth saying to the client**: nothing is unlocked until Safaricom confirms the
payment directly to our system. Not when the prompt is sent, not when the phone
says success — only when the confirmation arrives. If the same confirmation
arrives twice, it is recorded and ignored, so nobody is charged or credited
twice.

---

## Milestone 5 — Households can buy access

**What the client sees**: a Mwajiri picks Essentials, Standard or Concierge, pays
by M-Pesa, and their access window starts immediately.

**Where**: `/dashboard/mwajiri/subscription`

Buying again while a window is still open **adds** the new time to the end of the
existing one. Nobody loses days they have already paid for.

---

## Milestone 6 — The directory is live

**What the client sees**: anyone on the internet can browse verified workers at
`mjakaziconnect.co.ke/directory`, filter by category and location, and see the
most recently verified first. Phone numbers are not there. A paying Mwajiri
clicks Reveal and the contact appears.

**Where**: `/directory` publicly, `/dashboard/mwajiri/browse` for subscribers

**Worth saying to the client**: contact details are not merely hidden from view.
They are not sent to the browser at all for anyone without an active
subscription. Somebody technical inspecting the page would find nothing, because
there is nothing there to find.

Once revealed, a contact stays revealed for that household permanently, even
after their window closes. New reveals need a new window.

### At this milestone the business is operating end to end.

Workers register and get verified. Households pay and hire. Money comes in from
both sides.

---

## Milestone 7 — It runs itself

**What the client sees**: nothing, which is the point.

- Verification badges expire automatically at 12 months and those profiles leave
  the directory.
- Access windows close on their own at the right moment.
- Abandoned payments clean themselves up.

Nobody has to remember to do any of it.

---

## Milestone 8 — Interest and hires

**What the client sees**: a subscribed Mwajiri picks three to five workers and
sends an expression of interest to each. Each worker sees it and accepts or
declines. Both sides are emailed.

When a hire happens, either side can record it. The worker's profile shows they
have found employment and leaves the directory.

**Where**: `/dashboard/mwajiri/browse`, `/dashboard/mjakazi/opportunities`

**Worth saying to the client**: this is what makes the headline number — the
share of paying households who actually hire someone — measurable rather than
guessed.

---

## Milestone 9 — Reviews

Households who unlocked a contact can rate and review that worker. Staff moderate
before anything is published. One review per unlock.

**Where**: `/dashboard/staff/reviews` for moderation, the public profile for
published reviews.

---

## Milestone 10 — The admin console

**What the client sees**: the platform owner opens a single page showing how many
accounts exist, how many workers are verified, how many households are active,
and total money received, split between verification fees and subscriptions.

**Where**: `/dashboard/admin`

Also: creating and removing staff accounts, and changing prices and durations
**without a developer** — change the Essentials price in settings and the next
person to pay is charged the new amount.

### Who can do what

| Action | Admin | Staff |
|---|---|---|
| Review and approve verifications | yes | yes |
| Write blog posts and edit the website | yes | yes |
| Suspend an account | yes | yes |
| Reinstate a suspended account | yes | no |
| Delete an account | yes | no |
| Ban an account permanently | yes | no |
| Create or remove staff | yes | no |
| Change prices | yes | no |

Staff can stop a problem immediately, which is what moderation needs. Undoing
anything, and anything permanent, needs the owner. Every one of these actions is
recorded with who did it and why.

---

## Milestone 11 — Concierge

**What the client sees**: a household on the Concierge plan fills in what they
need. A staff member picks it up, builds a shortlist of three to five suitable
workers with a note on each explaining the match, and delivers it. Those contacts
unlock automatically.

If the hire does not work out within 30 days, they can ask once for a
replacement, and the same case reopens.

**Where**: `/dashboard/mwajiri/concierge`, `/dashboard/staff/concierge`

---

## Milestone 12 — Launch

Real Safaricom credentials tested with a live shilling. Production storage.
Every email checked. A full security pass. Then the switch.

---

## On Payments — Why We Build Against Sandbox First

Production Safaricom credentials are already approved and in hand. That removes
the one dependency on this project that could not be accelerated by working
harder, and it means the revenue date is a build question rather than a waiting
question.

The whole payment flow is nonetheless built and proven against Safaricom's
sandbox first, and only switched to production once it demonstrably works.

**Why, in plain terms**: a payment bug found in sandbox costs an afternoon. The
same bug found in production costs somebody's money and the trust that goes with
it. Sandbox behaves identically — same prompt, same confirmation, same failure
cases — but nothing real moves. So every case gets rehearsed there: successful
payment, declined payment, wrong PIN, ignored prompt, and the same confirmation
arriving twice.

Switching to production is a change of credentials, not a change of code. The
last step before launch is one live transaction of a single shilling, to prove
the real rail end to end.

**What this means for the client**: there is no external body we are waiting on.
The date is ours to hit.

---

## What Can Be Promised, and What Cannot

Worth being straight about, because a promise that fails costs more than a
cautious one.

**Safe to promise**: each milestone above is something that will be demonstrated
working before it is called done. Nothing is reported as complete on the strength
of the code compiling.

**Not safe to promise**: an exact date for the full twelve milestones. The
revenue spine — Milestones 1 to 7, everything needed to take money from both
sides — is the committed target. Reviews, Concierge and the fuller admin console
follow it.

If a date must be given, give it for **Milestone 6**. That is the point at which
the business operates end to end, and everything after it is improvement rather
than function.

---

## Internal — How These Map To The Build Plan

Not for the client. Kept here so the two documents stay in step: if a phase moves
in `context/build-plan.md`, the corresponding milestone moves here.

| Milestone | Build plan phase |
|---|---|
| 1 — Accounts work | Phase 0 (Foundation) + Phase 1 (Identity) |
| 2 — A worker can build a profile | Phase 2 |
| 3 — Staff can verify | Phase 3 |
| 4 — Workers can pay | Phase 4 |
| 5 — Households can buy access | Phase 5 |
| 6 — The directory is live | Phase 6 |
| 7 — It runs itself | Phase 7 |
| 8 — Interest and hires | Phase 8 |
| 9 — Reviews | Phase 9 |
| 10 — The admin console | Phase 10 |
| 11 — Concierge | Phase 11 |
| 12 — Launch | Phase 12 |

Milestone 1 spans two phases because Phase 0 produces nothing a client can see —
it is the enum migration, dependencies, tokens, audit logging and analytics.
Necessary, invisible, and not worth explaining to anyone outside the build.

**Milestone 6 is the commitment.** Milestones 9 and 11 are the descope
candidates, in that order.
