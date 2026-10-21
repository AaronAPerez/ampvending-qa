/**
 * Shared contact-form constants and test data, used by BOTH test suites:
 *   - Playwright: pages/ContactPage.ts, tests/contact.spec.ts
 *   - Cypress:    cypress/pages/ContactPage.ts, cypress/e2e/contact.cy.ts
 *
 * One source of truth: when a label, path or data value changes, edit it here
 * and both suites follow. Keep this file framework-free (no Playwright or Cypress
 * imports) so either runner can load it.
 *
 * TODO(verify): every value marked below is a placeholder. Confirm each one against
 * the live site in DevTools (Elements tab for labels, Network tab for the endpoint).
 */

/** Data a test can type into the form. All optional so negative tests can leave fields empty. */
export interface ContactFormData {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

/** Options for faking the server's reply to a form submission. */
export interface StubOptions {
  /** HTTP status to return. Use 500 to exercise the error path. Default: 200. */
  status?: number;
}

/** Path of the contact page, resolved against each runner's base URL. */
export const CONTACT_PATH = '/contact'; // TODO(verify)

/**
 * Glob for the request the form sends on submit. Works in both page.route() and cy.intercept().
 * Find it: run the site locally, open DevTools → Network, submit once, copy the URL.
 * If the form uses a Next.js Server Action, there is no /api route; the POST goes to the
 * page URL itself. Both suites' POST guards still block it, so nothing is sent, but the
 * success test will fail until this pattern matches.
 */
export const CONTACT_SUBMIT_ENDPOINT = '**/api/contact'; // TODO(verify)

/** Visible label text for each field. Matched exactly, so "Name" won't match "Business Name". */
export const CONTACT_LABELS = {
  name: 'Name', // TODO(verify)
  email: 'Email', // TODO(verify)
  phone: 'Phone', // TODO(verify)
  message: 'Message', // TODO(verify)
} as const;

/** Accessible name of the submit button. */
export const SUBMIT_BUTTON_NAME = /send|submit/i; // TODO(verify)

/**
 * Valid baseline data. example.com is reserved for testing (RFC 2606) and
 * 555-0100 is a reserved fictional number. Never use real contact details.
 */
export const VALID_LEAD = {
  name: 'QA Test User',
  email: 'qa.test@example.com',
  phone: '209-555-0100',
  message: 'Automated test submission. Please ignore.',
} satisfies ContactFormData;

/**
 * Clearly invalid formats only. Ambiguous cases like "user@localhost" are
 * accepted by native browser validation; they're logged as an open question
 * in TEST_PLAN.md instead of being asserted here.
 */
export const INVALID_EMAILS = [
  'plainaddress',
  'missing-at-sign.com',
  '@missing-local.com',
  'two@@example.com',
  'has space@example.com',
] as const;