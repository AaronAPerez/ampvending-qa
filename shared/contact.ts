/**
 * Shared contact-form constants and test data, used by BOTH test suites:
 *   - Playwright: pages/ContactPage.ts, tests/contact.spec.ts
 *   - Cypress:    cypress/pages/ContactPage.ts, cypress/e2e/contact.cy.ts
 *
 * One source of truth: when a label, path or rule changes, edit it here and both
 * suites follow. Keep this file framework-free (no Playwright or Cypress imports).
 *
 * VERIFIED against the site source on 2026-10-21:
 *   - components/contact/ContactForm.tsx  (labels, button, banners, client validation)
 *   - app/api/contact/route.ts            (endpoint, server-side zod rules)
 */

/** Data a test can type into the form. All optional so negative tests can leave fields empty. */
export interface ContactFormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  message?: string;
}

/** Options for faking the server's reply to a form submission. */
export interface StubOptions {
  /** HTTP status to return. Default: 200. */
  status?: number;
  /** Response body. Defaults to a success body for < 400, a generic error body otherwise. */
  body?: unknown;
}

/** Path of the contact page, resolved against each runner's base URL. */
export const CONTACT_PATH = '/contact';

/** The form POSTs JSON here. Glob works in both page.route() and cy.intercept(). */
export const CONTACT_SUBMIT_ENDPOINT = '**/api/contact';

/**
 * Visible label text. Each label ends with " *" (required) or " (Optional)",
 * so match the start only. Anchored regexes also work in Testing Library.
 */
export const CONTACT_LABELS = {
  firstName: /^First Name/,
  lastName: /^Last Name/,
  email: /^Email Address/,
  phone: /^Phone Number/,
  companyName: /^Company Name/,
  message: /^Message/,
} as const;

/** Accessible name of the submit button. It reads "Sending..." while submitting. */
export const SUBMIT_BUTTON_NAME = /Request Information/i;

/**
 * Result banners. Field-level errors ALSO use role="alert", so tests must match
 * these banners by text, not by role alone.
 */
export const SUCCESS_TEXT = /sent successfully/i;
export const ERROR_TEXT = /error sending your message/i;

/** Field error messages from the form's own (client-side) validation. */
export const FIELD_ERRORS = {
  firstName: 'First name is required',
  lastName: 'Last name is required',
  email: 'Email is required',
  invalidEmail: 'Invalid email address',
  companyName: 'Company name is required',
  message: 'Message is required',
} as const;

/**
 * Server-side rules (zod in app/api/contact/route.ts). The client only checks that
 * the message isn't empty, so these limits are where client and server disagree.
 */
export const SERVER_RULES = {
  messageMin: 10,
  messageMax: 1000,
  nameMax: 50,
  companyMax: 100,
} as const;

/** The exact 400 body the API returns when zod validation fails. */
export const SERVER_VALIDATION_ERROR_BODY = {
  success: false,
  message: 'Please check your form data.',
  errors: [{ field: 'message', message: 'Message must be at least 10 characters' }],
} as const;

/**
 * Valid baseline lead. example.com is reserved for testing (RFC 2606) and
 * 555-0100 is a reserved fictional number. Never use real contact details.
 */
export const VALID_LEAD = {
  firstName: 'QA',
  lastName: 'Tester',
  email: 'qa.test@example.com',
  phone: '209-555-0100',
  companyName: 'QA Test Co',
  message: 'Automated test submission. Please ignore.',
} satisfies ContactFormData;

/**
 * Formats the client's regex (/^[^\s@]+@[^\s@]+\.[^\s@]+$/) rejects.
 * "user@localhost" is rejected by both client and server, so it's included now.
 */
export const INVALID_EMAILS = [
  'plainaddress',
  'missing-at-sign.com',
  '@missing-local.com',
  'two@@example.com',
  'has space@example.com',
  'user@localhost',
] as const;

/** A message of exactly `length` characters, for boundary tests. */
export function messageOfLength(length: number): string {
  return 'a'.repeat(length);
}