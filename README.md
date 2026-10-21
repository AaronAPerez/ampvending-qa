# ampvending-qa

QA automation for the **AMP Vending Machines** website (https://www.ampvendingmachines.com),
a Next.js lead-generation site I built for a client. The contact form is how the business gets
leads, so this suite concentrates on it: functional, negative, boundary, API-contract and
accessibility testing. It runs against **production without ever sending a real lead**.

## Results at a glance

| | |
|---|---|
| Test plan | 20 prioritized test cases ([TEST_PLAN.md](TEST_PLAN.md)) |
| Playwright + TypeScript | 18 tests × 3 browsers (Chromium, Firefox, WebKit) |
| Cypress + TypeScript | 8 tests, ported from the Playwright suite, same test data |
| Defects found | 6, written up in [docs/BUG_REPORTS.md](docs/BUG_REPORTS.md) |
| Latest run (Chromium) | 13 passing · 5 known bugs tracked as expected failures · 2 known accessibility violations tracked in the axe baseline |

## Defects found

| ID | Defect | Severity | Caught by | Issue |
|---|---|---|---|---|
| BUG-001 | A short message passes the form, but the server rejects it and the visitor sees a generic error | S2 | TC-CF-004 | _#_ |
| BUG-002 | The server's validation messages are discarded and replaced with a generic error | S3 | TC-CF-009 | _#_ |
| BUG-003 | The "Message is required" error is never displayed | S2 | TC-CF-010 | _#_ |
| BUG-004 | Focus isn't moved to the first invalid field after a failed submit | S3 | TC-A11Y-004 | _#_ |
| BUG-005 | Text contrast below WCAG 1.4.3 AA ("Get In Touch" badge, 2.89:1) | S3 | TC-A11Y-001 | _#_ |
| BUG-006 | The "Home" nav link's accessible name doesn't contain its visible text (WCAG 2.5.3) | S3 | TC-A11Y-001 | _#_ |

Severity definitions are in [TEST_PLAN.md §8](TEST_PLAN.md#8-defect-management).

### How known bugs are tracked
Tests for confirmed, logged defects use Playwright's `test.fail()`. They stay green while the
bug is open, and the moment a fix ships they report **"expected to fail, but passed"**. That's
the signal to remove the marker and close the issue: found, reported, fixed, verified.

Accessibility findings work the same way. The axe test tolerates exactly the logged
violations (matched by rule and element), so any **new** violation still fails it. When a
logged one disappears, the test fails with a reminder to delete its entry.

## How it's built

- **Page Object Model.** All selectors live in `pages/` (Playwright) and `cypress/pages/`
  (Cypress); specs only describe behavior.
- **Accessibility-first locators** (`getByRole`, `getByLabel`). They survive styling changes, and
  a broken locator usually means broken accessibility.
- **One source of truth.** Labels, endpoint, validation rules and test data live in
  `shared/contact.ts` and are used by both frameworks. The values were verified against the
  site's source code.
- **Negative and boundary testing.** Six invalid email formats, run as data-driven tests, plus
  boundary value analysis on the message length the server enforces: 9, 10, 1000 and 1001
  characters.
- **API-contract testing.** Stubs reproduce the server's real 400 and 500 responses, so the UI's
  error handling can be tested safely.
- **Accessibility scan.** axe-core checks WCAG 2.1 A/AA, and the full results are attached to
  the HTML report.
- **CI.** GitHub Actions runs the Playwright suite on every push and publishes the HTML report.

## Safety: tests never send real leads
Every test runs against the live site, so a stray form submission would email the business.
`fixtures/index.ts` and `cypress/support/e2e.ts` **block every POST request by default**. Only
the contact submission is answered, by a stub, and the backend never sees it. Test data uses
reserved values (`qa.test@example.com`, `209-555-0100`).

## Project structure

```
├─ TEST_PLAN.md            scope, approach, risks, test case inventory
├─ docs/BUG_REPORTS.md     defect reports
├─ shared/contact.ts       labels, rules, test data (used by both frameworks)
├─ pages/                  Playwright page objects
├─ fixtures/               Playwright fixtures + network safety guard
├─ tests/                  Playwright specs
├─ cypress/                Cypress page objects, specs, support (guard)
└─ .github/workflows/      CI
```

## Running the tests (Windows PowerShell)

```powershell
npm ci
npx playwright install

npx playwright test                       # all browsers, against production
npx playwright test --grep "@smoke"       # fast must-pass subset
npx playwright show-report                # HTML report, with traces and axe results

# Against a local build of the site (e.g. to verify a fix before it ships)
$env:BASE_URL="http://localhost:3000"; npx playwright test

npm run type-check                        # both suites, strict TypeScript
npx cypress run --browser edge
```

## Known limitation: Cypress and React hydration
Under Cypress only, React reports hydration errors (#418, then #177) on the live site and
rebuilds the page mid-test, so inputs detach while being typed into. The evidence points to the
tool, not the site:
- The Edge InPrivate console is clean, at desktop size and at Cypress's 1000×660.
- Playwright's TC-GEN-001 check, which watches for React errors during load, passes.
- Matching viewports and turning off Cypress's `modifyObstructiveCode` didn't change the result.

The Cypress suite is kept out of CI until this is resolved. Playwright is the primary suite.

## Why a separate repository
The suite tests the **deployed site from the outside**, the way visitors see it. On a team I'd
also trigger it from the application's CI against preview deployments, so a failing test can
block a bad release.

---
**Aaron Perez** · [aaronaperez.dev](https://aaronaperez.dev) · [github.com/AaronAPerez](https://github.com/AaronAPerez)