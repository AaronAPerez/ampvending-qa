# Test Plan: AMP Vending Machines Website

| Field | Value |
|---|---|
| System under test | AMP Vending Machines marketing site |
| URL | https://ampvendingmachines.com 
| Author | Aaron Perez |
| Version | 0.1 (draft) |
| Last updated | October 2026 |

> Items marked `TODO(verify)` are assumptions to confirm against the live site before execution.

---

## 1. Purpose

This plan defines how the AMP Vending website will be tested to confirm that visitors can find information about the business and **contact it successfully**. The site exists to generate leads, so any defect that blocks a visitor from submitting the contact form or calling the business is treated as critical.

## 2. Scope

### In scope

- **Contact form:** validation, successful submission, error handling, and data sent to the server.
- **Navigation:** header and footer links, the mobile menu, and the click-to-call phone link.
- **Responsive layout:** common phone, tablet, and desktop widths.
- **Accessibility:** WCAG 2.1 Level A/AA, checked with automated scans plus manual keyboard and screen-reader testing.
- **Page metadata:** unique titles and meta descriptions on each page.

### Out of scope

| Item | Reason |
|---|---|
| Email delivery by the email provider (Resend) | Third-party service. One manual end-to-end check is listed under open questions. |
| Google Business Profile listing | Not part of the website codebase. |
| Load and performance testing | Low-traffic marketing site. Lighthouse is checked separately. |
| Security and penetration testing | Requires a separate, authorized engagement. |

## 3. Test approach

| Type | How | Tooling |
|---|---|---|
| Exploratory | 45-minute sessions, each with a stated goal (for example, "find where the contact flow breaks") | Manual, with notes |
| Functional (scripted) | Test cases written in `TEST_CASES.md` | Manual |
| Negative and boundary | Invalid input, empty fields, and values at min / max / max+1 | Manual + Playwright |
| Regression (E2E) | Highest-priority cases automated and run on every push | Playwright + TypeScript; Cypress for selected cases |
| Smoke | `@smoke`-tagged subset, run first and fastest | `npx playwright test --grep "@smoke"` |
| Accessibility | Automated axe scan, plus manual keyboard-only and screen-reader passes | `@axe-core/playwright`, NVDA |
| Cross-browser / responsive | Chromium, Firefox, WebKit, and mobile emulation | Playwright projects |

Automated scans catch only part of all accessibility issues, so the manual keyboard and screen-reader cases are required, not optional.

### Automation design

- **Page Object Model.** All selectors live in `pages/`, and specs describe behavior only.
- **Role- and label-based locators.** They are resilient to styling changes and double as an accessibility check.
- **Network safety guard.** Every POST is blocked by default (`fixtures/index.ts`), and form submissions are stubbed. The suite runs against production, so it must never send a real lead.
- **Traceability.** Every automated test title begins with its test case ID from this plan.
- **Two frameworks, one source of truth.** TC-CF-001, 003 and 005 also run in Cypress (`cypress/`). Both suites read the same labels, endpoint and test data from `shared/contact.ts`, so they can't drift apart.

## 4. Test environments

| Environment | Use |
|---|---|
| Production (read-only) | Navigation, content, accessibility, and stubbed form tests |
| Local (`npm run dev`) | Anything that needs a real form submission. Point the suite at it with `$env:BASE_URL="http://localhost:3000"` |
| Browsers | Chromium, Firefox, WebKit (latest versions shipped with Playwright) |
| Devices | Mobile Chrome and Mobile Safari emulation, plus one real phone for manual checks |
| OS | Windows 11 |

## 5. Test data

- Fake data only: `qa.test@example.com` (a domain reserved for testing) and `209-555-0100` (a reserved fictional number).
- Never use real customer names, emails, or phone numbers in tests, screenshots, or bug reports.

## 6. Entry and exit criteria

**Entry:** the site is deployed and reachable, test cases have been reviewed, and the Playwright suite runs locally.

**Exit:**
- All P1 test cases have been executed.
- No open S1 or S2 defects remain.
- The axe scan reports zero violations, or every violation is logged as a defect.
- CI is green on `main`.

## 7. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tests submit real leads to the business | Spam to the client, loss of trust | Global POST guard plus stubbed submissions |
| No staging environment | Destructive tests can't run against production | Use local dev and Vercel preview deployments <!-- TODO(verify) --> |
| Selectors break after design changes | False failures | Role- and label-based locators, all kept in page objects |
| Third-party scripts (maps, analytics) slow pages | Flaky timeouts | Rely on Playwright auto-waiting, never fixed sleeps, and block analytics if needed |

## 8. Defect management

Defects are tracked as **GitHub Issues** using a bug report template with these fields: summary, environment (browser, OS, device, URL), steps to reproduce, expected result, actual result, severity, priority, and evidence (screenshot, video, or Playwright trace).

**Severity** describes impact, set by QA:

| Level | Definition | Example |
|---|---|---|
| S1 Critical | Lead capture is broken or the site is down | Contact form never submits |
| S2 Major | Core feature broken, with a workaround or only on some platforms | Form fails only in Safari |
| S3 Minor | Incorrect behavior with low impact | Unclear validation message |
| S4 Trivial | Cosmetic | Misaligned icon |

**Priority** describes urgency, set with the site owner: **P1** fix before the next release, **P2** fix soon, **P3** backlog.

The two are independent. A typo in the business name on the homepage is S4 in severity but P1 in priority.

## 9. Test case inventory

Full steps for each case live in `TEST_CASES.md`.

| ID | Area | Title | Priority | Status |
|---|---|---|---|---|
| TC-CF-001 | Contact form | Valid submission shows confirmation and sends the lead | P1 | Automated `@smoke` (Playwright + Cypress) |
| TC-CF-002 | Contact form | Empty form is blocked and focus moves to the first required field | P1 | Automated |
| TC-CF-003 | Contact form | Invalid email formats are rejected | P1 | Automated, data-driven (Playwright + Cypress) |
| TC-CF-004 | Contact form | Message length boundaries: min-1, min, max, max+1 | P2 | Manual (blocked: limits unknown) |
| TC-CF-005 | Contact form | Server error shows a message and keeps the typed input | P1 | Automated (Playwright + Cypress) |
| TC-CF-006 | Contact form | Double-clicking submit sends only one request | P2 | Manual (next to automate) |
| TC-CF-007 | Contact form | Phone field accepts common US formats | P3 | Manual |
| TC-CF-008 | Contact form | A name made only of spaces is rejected | P2 | Manual |
| TC-NAV-001 | Navigation | Every header and footer link loads without a 404 | P1 | Manual (next to automate) |
| TC-NAV-002 | Navigation | Mobile menu opens, closes, and works with the keyboard, including Escape | P2 | Manual |
| TC-NAV-003 | Navigation | Click-to-call link uses `tel:` with the correct number | P1 | Manual |
| TC-RWD-001 | Responsive | No horizontal scrolling at 320, 375, 768, and 1280 px | P2 | Manual |
| TC-A11Y-001 | Accessibility | axe scan finds no WCAG 2.1 A/AA violations | P1 | Automated `@smoke` |
| TC-A11Y-002 | Accessibility | The form can be completed by keyboard alone, with focus always visible | P1 | Manual |
| TC-A11Y-003 | Accessibility | NVDA announces each label, error, and success message | P2 | Manual |
| TC-SEO-001 | Metadata | Every page has a unique title and meta description | P3 | Manual |

## 10. Deliverables

- `TEST_PLAN.md` (this document)
- `TEST_CASES.md` with detailed steps and expected results
- The Playwright suite (`pages/`, `fixtures/`, `tests/`), run in CI on every push
- The Cypress suite (`cypress/`) and shared test data (`shared/`)
- Defect reports as GitHub Issues
- A test summary in `README.md`: coverage, results, and the defects found

## 11. Open questions

1. What are the minimum and maximum lengths for the message field? This blocks TC-CF-004.
2. Should the email field accept addresses without a dot in the domain, such as `user@localhost`? Native browser validation allows them.
3. Does the form have spam protection (a honeypot, CAPTCHA, or rate limiting)? This affects how automation can submit it.
4. Is there a Vercel preview URL where real submissions are safe to send?
5. Which inbox receives submissions? This is needed for one manual end-to-end delivery check.