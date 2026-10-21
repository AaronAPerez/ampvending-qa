/**
 * Contact form tests: Cypress port of tests/contact.spec.ts.
 *
 * - Same Test Case IDs as TEST_PLAN.md and the Playwright suite, same shared data.
 * - Ported: TC-CF-001, TC-CF-003, TC-CF-005. TC-CF-002 and TC-A11Y-001 stay
 *   Playwright-only for now (the axe scan would need the cypress-axe plugin).
 * - No @smoke tags: filtering by tag needs the @cypress/grep plugin, left out
 *   to keep dependencies minimal.
 * - Every submission is stubbed or destroyed (see support/e2e.ts), so the live
 *   site never sends a real email.
 */
import { ContactPage } from '../pages/ContactPage';
import { INVALID_EMAILS, VALID_LEAD } from '../../shared/contact';

const contactPage = new ContactPage();

describe('Contact form', () => {
  beforeEach(() => {
    contactPage.visit();
  });

  it('TC-CF-001 valid submission shows confirmation and sends the lead', () => {
    contactPage.stubSubmission();

    contactPage.submitForm(VALID_LEAD);

    // Payload shape depends on the app; this checks the email arrived unaltered.
    contactPage
      .waitForSubmit()
      .its('request.body')
      .then((body) => {
        expect(JSON.stringify(body)).to.contain(VALID_LEAD.email);
      });
    contactPage.successMessage().should('be.visible');
    contactPage.submitRequests().should('have.length', 1);
  });

  // Data-driven: one test per invalid email, so the report shows exactly which one failed.
  INVALID_EMAILS.forEach((email) => {
    it(`TC-CF-003 rejects invalid email "${email}"`, () => {
      contactPage.stubSubmission();

      contactPage.submitForm({ ...VALID_LEAD, email });

      // FRAMEWORK DIFFERENCE: Playwright asserts the email field gets focus.
      // Cypress fires synthetic clicks, and whether the browser moves focus after
      // one varies, so this checks the field's validity state instead (deterministic).
      // TODO(verify): this assumes <input type="email">. If the site validates in
      // JavaScript on a type="text" field, assert on the visible error message instead.
      contactPage.emailInput().should(($input) => {
        const input = $input[0] as HTMLInputElement;
        expect(input.validity.valid, 'email field validity').to.equal(false);
      });
      contactPage.submitRequests().should('have.length', 0);
    });
  });

  it('TC-CF-005 server error shows an error and keeps the typed input', () => {
    contactPage.stubSubmission({ status: 500 });

    contactPage.submitForm(VALID_LEAD);

    contactPage.waitForSubmit();
    contactPage.errorMessage().should('be.visible');
    // Wiping the visitor's message on failure loses the lead. Treat it as a real bug.
    contactPage.messageInput().should('have.value', VALID_LEAD.message);
    // FRAMEWORK DIFFERENCE: the Playwright version also asserts the success message
    // is hidden. Live regions often stay in the DOM while empty, and Cypress's
    // "not.exist" would fail on them, so that check stays Playwright-only.
  });
});