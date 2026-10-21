/**
 * Contact form tests: Cypress port of tests/contact.spec.ts.
 *
 * - Same Test Case IDs as TEST_PLAN.md and the Playwright suite, same shared data
 *   and the same assertions.
 * - Ported: TC-CF-001, TC-CF-003, TC-CF-005. The known-bug tests (which use
 *   Playwright's test.fail()) and the axe scan stay Playwright-only; Cypress has
 *   no expected-failure marker, and axe would need the cypress-axe plugin.
 * - Every submission is stubbed or destroyed (see support/e2e.ts), so the live
 *   site never sends a real email.
 */
import { ContactPage } from '../pages/ContactPage';
import { FIELD_ERRORS, INVALID_EMAILS, VALID_LEAD } from '../../shared/contact';

const contactPage = new ContactPage();

describe('Contact form', () => {
  beforeEach(() => {
    contactPage.visit();
  });

  it('TC-CF-001 valid submission shows confirmation and sends the lead', () => {
    contactPage.stubSubmission();

    contactPage.submitForm(VALID_LEAD);

    // The lead must reach the API intact: check the fields the business needs to reply.
    contactPage
      .waitForSubmit()
      .its('request.body')
      .should('include', {
        email: VALID_LEAD.email,
        companyName: VALID_LEAD.companyName,
        message: VALID_LEAD.message,
      });
    contactPage.successMessage().should('be.visible');
    contactPage.submitRequests().should('have.length', 1);
  });

  // Data-driven: one test per invalid email, so the report shows exactly which one failed.
  INVALID_EMAILS.forEach((email) => {
    it(`TC-CF-003 rejects invalid email "${email}"`, () => {
      contactPage.stubSubmission();

      contactPage.submitForm({ ...VALID_LEAD, email });

      contactPage.fieldError(FIELD_ERRORS.invalidEmail).should('be.visible');
      contactPage.submitRequests().should('have.length', 0);
    });
  });

  it('TC-CF-005 server error shows an error and keeps the typed input', () => {
    contactPage.stubSubmission({ status: 500 });

    contactPage.submitForm(VALID_LEAD);

    contactPage.waitForSubmit();
    contactPage.errorMessage().should('be.visible');
    // The success banner is only rendered on success, so it must not exist here.
    contactPage.successMessage().should('not.exist');
    // Wiping the visitor's message on failure loses the lead. Treat it as a real bug.
    contactPage.messageInput().should('have.value', VALID_LEAD.message);
  });
});