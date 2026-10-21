/**
 * Cypress support file. Runs before every spec file.
 *
 * 1. TESTING LIBRARY COMMANDS
 *    Cypress has no built-in getByRole/getByLabel. @testing-library/cypress adds
 *    findByRole, findByLabelText and friends, so this suite uses the same
 *    accessibility-first locator strategy as the Playwright suite.
 *
 * 2. NETWORK SAFETY GUARD (Cypress twin of fixtures/index.ts)
 *    Every POST is destroyed by default. The suite runs against the live site;
 *    without this, a form test could email the real business. Intercepts a test
 *    registers later (e.g. contactPage.stubSubmission) win, because Cypress runs
 *    the NEWEST matching intercept first.
 *
 *    Debugging tip: if a test fails with "uncaught exception" about a failed fetch,
 *    look for @blockedPost in the Command Log. The app sent a POST no test stubbed.
 *    Don't silence uncaught exceptions globally; that hides real app errors.
 */
import '@testing-library/cypress/add-commands';

beforeEach(() => {
  // Intercepts reset between tests, so the guard must be registered before each one.
  cy.intercept({ method: 'POST' }, (req) => {
    req.destroy();
  }).as('blockedPost');
});