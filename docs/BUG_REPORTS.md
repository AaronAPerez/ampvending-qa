# Bug reports: AMP Vending Machines website

Found by the `ampvending-qa` suite and by reading the site's source.
Each report is filed as a GitHub issue on the website repository: the heading is the issue
title and the section is its body.

**Environment for all reports:** production, https://www.ampvendingmachines.com/contact ·
Chromium via Playwright, cross-checked in Microsoft Edge (InPrivate) · Windows 11 · 2026-10-21.
Severity and priority definitions: [TEST_PLAN.md §8](../TEST_PLAN.md#8-defect-management).

## Summary

| ID | Defect | Severity | Priority | Test | Issue |
|---|---|---|---|---|---|
| [BUG-001](#bug-001-a-short-message-passes-the-form-then-the-server-rejects-it-with-a-generic-error) | Short message passes the form, then the server rejects it | S2 | P1 | TC-CF-004 | _not filed_ |
| [BUG-002](#bug-002-the-servers-validation-messages-are-discarded) | Server validation messages are discarded | S3 | P2 | TC-CF-009 | _not filed_ |
| [BUG-003](#bug-003-message-is-required-is-never-displayed) | "Message is required" is never displayed | S2 | P1 | TC-CF-010 | _not filed_ |
| [BUG-004](#bug-004-focus-isnt-moved-to-the-first-invalid-field) | Focus isn't moved to the first invalid field | S3 | P2 | TC-A11Y-004 | _not filed_ |
| [BUG-005](#bug-005-text-contrast-below-wcag-aa-on-the-get-in-touch-badge) | Text contrast below WCAG AA | S3 | P2 | TC-A11Y-001 | _not filed_ |
| [BUG-006](#bug-006-the-home-nav-links-accessible-name-doesnt-contain-its-visible-text) | The "Home" nav link's accessible name doesn't contain its visible text | S3 | P2 | TC-A11Y-001 | _not filed_ |

---

## BUG-001: A short message passes the form, then the server rejects it with a generic error
**Severity:** S2 Major · **Priority:** P1 · **Test:** TC-CF-004 (9 and 1001 characters)

**Steps**
1. Open `/contact` and fill every required field with valid data.
2. Enter a 9-character message: `Call me!!`
3. Click **Request Information**.

**Expected:** an error under the Message field ("Message must be at least 10 characters"), and
no request sent.

**Actual:**
- The form sends the request (verified by TC-CF-004).
- The API rejects it with HTTP 400, per `app/api/contact/route.ts`.
- The visitor sees only "Sorry, there was an error sending your message. Please try again or
  contact us directly." (see BUG-002).

**Root cause:** three different rule sets.
- `validateForm()` in `components/contact/ContactForm.tsx` only checks that the message isn't empty.
- The API's own schema in `app/api/contact/route.ts` requires 10-1000 characters.
- `lib/schema/contactFormSchema.ts` is only used for its type, not for validation.

**Impact:** a visitor with a short message gets an error with no hint what to fix, which is a
likely lost lead. Messages over 1000 characters fail the same way.

**Suggested fix:** share one zod schema between the form and the API, and add `maxLength`.

---

## BUG-002: The server's validation messages are discarded
**Severity:** S3 Minor · **Priority:** P2 · **Test:** TC-CF-009

**Steps:** submit the form while the API returns its real 400 response
(`{ success: false, message: "Please check your form data.", errors: [{ field, message }] }`).
TC-CF-009 reproduces this with a stub.

**Expected:** the page shows the server's message, ideally next to the affected field.

**Actual:** the page shows the generic "Sorry, there was an error sending your message…" banner.

**Root cause:** on any non-OK response, `components/contact/ContactForm.tsx` throws
`new Error('Failed to submit form')` without reading the response body.

**Suggested fix:** on a 400, read `errors[]` and show each message under its field.

---

## BUG-003: "Message is required" is never displayed
**Severity:** S2 Major · **Priority:** P1 · **Test:** TC-CF-010 · **WCAG:** 3.3.1 Error Identification (A)

**Steps**
1. Open `/contact`.
2. Fill every field except **Message**.
3. Click **Request Information**.

**Expected:** "Message is required" appears under the Message field, and the field is marked invalid.

**Actual:** a toast says "Please fix the errors below before submitting.", but **no error appears
below**. The request is (correctly) not sent.

**Root cause:** `validateForm()` sets `errors.message`, but the `<textarea>` block in
`components/contact/ContactForm.tsx` never renders it. The textarea also lacks `required`,
`aria-invalid`, and an error id in `aria-describedby`; the other fields have all three.

**Suggested fix:** render the error like the other fields and add those attributes.

---

## BUG-004: Focus isn't moved to the first invalid field
**Severity:** S3 Minor · **Priority:** P2 · **Test:** TC-A11Y-004 · **Accessibility best practice** (supports WCAG 3.3.1)

**Steps:** open `/contact` and click **Request Information** with the form empty.

**Expected:** focus moves to **First Name**, the first invalid field, so keyboard and
screen-reader users land on the problem.

**Actual:** focus stays on the submit button.

**Root cause:** when validation fails, `handleSubmit` in `components/contact/ContactForm.tsx`
shows a toast and returns without moving focus.

**Suggested fix:** after validation fails, focus the first invalid field in visual order.

---

## BUG-005: Text contrast below WCAG AA on the "Get In Touch" badge
**Severity:** S3 Minor · **Priority:** P2 · **Test:** TC-A11Y-001 (axe `color-contrast`, serious) · **WCAG:** 1.4.3 Contrast (AA)

**Where:** the small orange badge above the "Contact AMP Vending" heading
(`app/contact/ContactPageClient.tsx`: `bg-[#FD5A1E] text-[#F5F5F5] text-sm`).

**Measured by axe:** text `#F5F5F5` on background `#FD5A1E`, **2.89:1**, at 14px normal weight.
Text this size needs **4.5:1**. This badge is the only element on the page that fails contrast.

**Suggested fix (design decision):**
- **Option A:** black text on the brand orange, **6.7:1**. This is what the site's primary
  button already does (`AccessibleButton`, `primary` variant: `bg-orange text-[#000000]`).
- **Option B:** white text on `#C2410C`, **5.2:1**. This changes the brand color.

---

## BUG-006: The "Home" nav link's accessible name doesn't contain its visible text
**Severity:** S3 Minor · **Priority:** P2 · **Test:** TC-A11Y-001 (axe `label-content-name-mismatch`, serious) · **WCAG:** 2.5.3 Label in Name (A)

**Affected elements** (`components/layout/ResizableNavbar.tsx`)
- Desktop navigation "Home" link: `<a aria-label="Navigate to homepage" href="/">Home</a>`, flagged by axe.
- Mobile menu "Home" link: same `aria-label`. It's hidden at desktop width, so axe didn't scan
  it, but it has the same defect.

**Problem:** the link shows "Home", but its `aria-label` ("Navigate to homepage") replaces
that text as its name, and doesn't contain "Home" as a word. A voice-control user who says
"click Home" can't activate it.

**Related, not flagged:** the other nav links pass axe, because their labels contain the
visible text, but none *start* with it ("View our vending machine services" for "Services",
"give us your feedback" for "Feedback"). WCAG recommends the visible text come first.

**Suggested fix:** remove the `aria-label` from the nav links in both menus. Their visible
text ("Home", "Services", "Vending Machines", "Feedback", "Contact") is already a clear name.