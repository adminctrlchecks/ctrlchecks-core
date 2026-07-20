# Meta Business Verification via Happy Express — Upgrading the CtrlChecks App
**Business used for verification:** HAPPYEXPRESS ECOMMERCE PRIVATE LIMITED
**Meta app:** the existing **"CtrlChecks"** app (created in `02-META-MIGRATION.md` under `adminctrlchecks@gmail.com`) — not a new app
**Director / document owner:** Mahesh Kumar Baheti

Update from the first draft of this guide: the app name is **CtrlChecks**, not a new name, and we're **reusing** the app created in `02-META-MIGRATION.md` rather than building a second one from scratch. We're also not creating a brand-new Facebook identity for Mahesh if he already has one — see Part 1.

---

## What we already know (from the docs you have)

| Field | Value | Source |
|---|---|---|
| Legal business name | `HAPPYEXPRESS ECOMMERCE PRIVATE LIMITED` (one word "Happyexpress") | Certificate of Incorporation |
| CIN | `U72900TG2017PTC114249` | Certificate of Incorporation |
| Incorporated | 25 Jan 2017 | Certificate of Incorporation |
| Registered address | 5-8-70 & 72, Ground Floor, Mahesh Nagar, Nampally Station Road, Nampally, Hyderabad, Telangana, India, 500001 | Certificate of Incorporation |
| GSTIN | `36AAECH1021K1ZW` | GST REG-06 |
| Business constitution | Private Limited Company | GST REG-06 |
| Director | Mahesh Kumar Baheti | GST Annexure B |
| Domain | www.happyexpress.com | You |
| Contact | 9030879909 | You |

---

## ⚠️ Fix this before you start anything

Domain vs. email mismatch, confirmed real (not a typo): the email is `mahesh@happyexpess.com` — domain **`happyexpess.com`**, no "r". The website you gave is `www.happyexpress.com` — domain **`happyexpress.com`**, with an "r". These are two different domains.

Meta checks that the business email domain matches the verified website domain, and sends a confirmation link to that email during business verification. Before Part 3, find out from Mahesh which one he actually owns and controls:

- If **`happyexpess.com`** (no r) is the real, owned domain → use that as the website in Business Verification, not `happyexpress.com`
- If **`happyexpress.com`** (with r) is the real site → he needs a mailbox on that domain (e.g. set up `mahesh@happyexpress.com` in whatever mail service Happy Express uses) before submitting verification
- If he owns **both** domains, pick one consistently and use matching email + website throughout

Don't guess — a mismatch here is one of the most common causes of a rejected Business Verification.

---

## PART 1 — Whose Facebook account manages this? (no password sharing, ever)

You asked: if Mahesh already has his own personal Facebook account, can you use it directly — do you need his credentials?

**No — don't have him hand over his Facebook password.** Three separate reasons, not just one:

1. **It's against Facebook's own Terms of Service** to let someone else log into your account or share your password — if Facebook's automated systems flag the unfamiliar login (device/location), the account can get locked or suspended right in the middle of business verification, which stalls everything.
2. **His personal account is more than a business login** — his photos, contacts, personal messages, everything is exposed, for no benefit, when the actual need is just "manage this one Business Portfolio."
3. **There's no need to** — Meta Business Manager has a built-in delegation mechanism that gives you real operational access without ever touching his password (below).

If credential sharing feels like the only practical option because Mahesh isn't technical or isn't available for a back-and-forth, the middle ground is a **short screen-share call** (Zoom/Meet): he stays logged into his own account on his own device, you tell him exactly what to click, session ends, nothing is shared. That covers Parts 2 and 4 below, which is realistically 15-20 minutes of his time total.

1. **Mahesh does this part himself**, from his own device, logged into his own account:
   - If he already has a personal Facebook account → he uses it as-is.
   - If not → he creates one himself with his own email/phone (you can hand him written steps or screen-share, but he clicks through it)
   - He goes to [business.facebook.com](https://business.facebook.com) and creates the Business Portfolio for Happy Express (Part 2 below) — this makes him the **Business Admin**, and his name matches the director name on the GST/COI, which avoids Meta asking for a separate authorization letter later.
2. **Then he invites `adminctrlchecks@gmail.com`'s Facebook profile as a co-admin**, without ever sharing a password:
   - Business Settings → **Users → People** → **Add** → enter the email tied to `adminctrlchecks@gmail.com`'s Facebook account
   - Choose role **Admin**
   - Your side accepts the invite from its own login
3. From that point on, either party can operate the Business Portfolio and the app day-to-day — Mahesh doesn't need to be involved again except for anything Meta specifically routes back to him (e.g. an identity re-check).

This gets you the best of both: verification identity matches the legal documents (smooth review), and `adminctrlchecks@gmail.com` still ends up with full operational control, consistent with every other service in this project.

---

## PART 2 — Create a Meta Business Portfolio for Happy Express

Mahesh does this, logged in as himself:

1. [business.facebook.com](https://business.facebook.com) → **Create an account**
2. **Business name:** `Happyexpress Ecommerce Private Limited` (match the COI/GST spelling exactly — Meta's automated matching is picky about this)
3. **Your name / business email:** his name, corrected `mahesh@happyexpress.com`
4. Complete the wizard — business address, phone (`9030879909` or landline), website `https://www.happyexpress.com`
5. Invite `adminctrlchecks@gmail.com` as a co-admin (Part 1, step 2)

---

## PART 3 — Verify the domain

Either admin can do this once added.

1. Business Settings → **Brand Safety → Domains** → **Add**, enter `happyexpress.com`
2. Pick a verification method:
   - **DNS TXT record** — best if Mahesh (or whoever hosts the domain) has registrar access
   - **HTML file upload** — if there's FTP/hosting panel access instead
   - **Meta tag** — if someone can edit the site's homepage `<head>` directly
3. Click **Verify**. Confirm with Mahesh who actually controls DNS/hosting for `happyexpress.com` before picking a method — that's the one open question left from Part 1's identity question.

---

## PART 4 — Submit Business Verification

Whoever is doing this needs the identity check to line up — recommend **Mahesh submits this part** since his name matches the documents.

1. Business Settings → **Security Center** → **Start Verification**
2. **Business details:**
   - Legal name: `HAPPYEXPRESS ECOMMERCE PRIVATE LIMITED`
   - Address: `5-8-70 & 72, Ground Floor, Mahesh Nagar, Nampally Station Road, Nampally, Hyderabad, Telangana, 500001`
   - Phone: business number (Meta may call/text an OTP)
   - Website: `https://www.happyexpress.com` (must already be verified from Part 3)
3. **Upload documents:**
   - Certificate of Incorporation (`COI-Happy Express.PDF`)
   - GST Registration Certificate (`GST-AA3608220286156_RC06092022.pdf`)
   - PAN (`PAN-HEPL.pdf`) as supporting doc if prompted
4. If Meta asks for personal ID on top of the business docs, Mahesh will need a government photo ID (Aadhaar/PAN/Passport/DL)
5. Submit and wait — typically **1–5 business days**, sometimes up to 2 weeks

**Common rejection reasons to avoid:**
- Legal name entered doesn't character-for-character match the document
- Address format doesn't match (abbreviations, missing floor/unit)
- Domain not verified yet, or email domain doesn't match the website domain
- Low-res photo instead of a clean PDF scan (yours are proper PDFs — good)

---

## PART 5 — Attach the existing CtrlChecks app to the verified Business Portfolio

No new app. The "CtrlChecks" app from `02-META-MIGRATION.md` already has Facebook Login, Instagram, and WhatsApp products configured with the right redirect URIs — reuse all of that.

1. Open the existing CtrlChecks app at [developers.facebook.com/apps](https://developers.facebook.com/apps) (logged in as `adminctrlchecks@gmail.com`'s Facebook account)
2. **App settings → Advanced** → scroll to **Business Portfolio** (or **Business Asset Groups**, naming varies by Meta's current UI)
3. Click **Add to a Business Portfolio** / **Claim** → select "Happyexpress Ecommerce Private Limited" (needs `adminctrlchecks@gmail.com` to already be a co-admin from Part 1)
4. Confirm the transfer/link — this is the one step that actually connects the app's verification status to Happy Express's now-verified business

**App ID and App Secret do not change** — since it's the same app, nothing in the worker `.env` needs updating for this step.

---

## PART 6 — WhatsApp production number (the actual point of doing all this)

1. In the app, WhatsApp → **API Setup** → **Add phone number**
2. Enter a real business phone number — recommend a dedicated number for CtrlChecks rather than Mahesh's personal line, since it'll be customer-facing
3. Verify via SMS/voice OTP
4. Set a **display name** (e.g. "CtrlChecks") → separate Meta review, typically 1–3 days
5. Once approved, this number can send template messages and handle production traffic, unlike the sandbox/test number from `02-META-MIGRATION.md` Part 6

Phone number IDs are stored per-connection in the credentials system (`worker/src/core/registry/overrides/whatsapp.ts`), not as a server env var — nothing to change in `.env` for this either. Users (or you, for CtrlChecks' own outbound messaging) connect the number through `/connections` like any other WhatsApp credential.

---

## PART 7 — App Review (needed for anything beyond you + test users)

The app is currently in **Development mode** — only testers you've explicitly added can use it. To let real end users connect their own Facebook/Instagram/WhatsApp through CtrlChecks:

1. **App settings → Basic**, fill in:
   - Privacy Policy URL
   - Terms of Service URL
   - App icon
   - Data Deletion Instructions URL (Meta requires this — a URL or an automated callback endpoint)
2. **App Review → Permissions and Features**, request only what CtrlChecks actually uses, e.g.:
   - `pages_show_list`, `pages_read_engagement` (Facebook Pages)
   - `instagram_basic`, `instagram_manage_messages` (if applicable)
   - `whatsapp_business_messaging`, `whatsapp_business_management`
3. For each permission: a short written justification, usually a **screen recording** showing the exact CtrlChecks feature that uses it
4. Submit → a few days to ~2 weeks; Meta may bounce it back with questions once or twice — normal, just answer and resubmit

A Facebook Page (e.g. "CtrlChecks", category "Software Company," created inside the Happy Express Business Portfolio) isn't strictly required for the Instagram Login / WhatsApp Business API flows this repo uses, but is worth creating — reviewers respond better when there's a visible, legitimate business page behind the app.

---

## PART 8 — Verify end to end

1. `https://www.ctrlchecks.ai/connections` → Connect Facebook / Instagram / WhatsApp → should complete without errors (nothing changed on the redirect URI side, so this should already work)
2. Send a real WhatsApp template message through a CtrlChecks workflow using the new production number
3. Once App Review is approved, confirm a non-tester account can also connect

---

## Realistic timeline

| Step | Typical duration |
|---|---|
| Business Portfolio setup + co-admin invite | Same day |
| Domain verification | Minutes to a few hours (DNS propagation) |
| Business Verification review | 1–5 business days (up to 2 weeks) |
| Attach existing app to verified portfolio | Minutes, once verification is approved |
| WhatsApp display name approval | 1–3 business days |
| App Review (permissions) | A few days to ~2 weeks, possibly multiple rounds |

Total realistic estimate: **1–3 weeks** to fully live, production, public-facing status — noticeably faster than building a second app from scratch, since Parts 5–6 skip all the redirect-URI and product setup work.

---

## Summary checklist

- [ ] Domain/email typo resolved with Mahesh
- [ ] Confirmed: Mahesh's own Facebook account (existing or new) used directly — no password shared
- [ ] Meta Business Portfolio "Happyexpress Ecommerce Private Limited" created by Mahesh
- [ ] `adminctrlchecks@gmail.com` invited and accepted as co-admin
- [ ] `happyexpress.com` domain verified
- [ ] Business Verification submitted (COI + GST + PAN) and approved
- [ ] Existing "CtrlChecks" app attached/claimed into the verified Business Portfolio
- [ ] Real WhatsApp business phone number added and verified
- [ ] WhatsApp display name submitted and approved
- [ ] Privacy Policy / TOS / Data Deletion URLs added
- [ ] (Optional) Facebook Page "CtrlChecks" created inside the portfolio
- [ ] App Review submitted for needed permissions
- [ ] OAuth flows re-tested end to end (no `.env` changes expected)
- [ ] App Review approved → Development mode restriction lifted
