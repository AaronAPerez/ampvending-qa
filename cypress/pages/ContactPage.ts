/**
 * ContactPage: Cypress Page Object for the AMP Vending contact form.
 *
 * Cypress port of pages/ContactPage.ts (Playwright). Same locators, same actions,
 * same shared constants from shared/contact.ts, so the two suites can't drift apart.
 *
 * HOW THIS DIFFERS FROM THE PLAYWRIGHT VERSION
 * - Cypress commands are QUEUED, not awaited. Nothing here is async; never mix
 *   `await` with `cy.*` calls.
 * - Elements are getter METHODS, not stored fields. Each call re-queries the DOM,
 *   which avoids holding stale elements after React re-renders.
 * - Testing Library matches label strings exactly by default, which is what the
 *   Playwright version gets from `exact: true`.
 */
import {
  CONTACT_LABELS,
  CONTACT_PATH,
  CONTACT_SUBMIT_ENDPOINT,
  SUBMIT_BUTTON_NAME,
  type ContactFormData,
  type StubOptions,
} from '../../shared/contact';

/** A Cypress chain that yields DOM element(s), e.g. the result of cy.findByLabelText(). */
type ElementChain = Cypress.Chainable<JQuery<HTMLElement>>;

export class ContactPage {
  /** Alias name given to the stubbed submit request. */
  private static readonly alias = 'submit';

  /**
   * Alias reference for cy.wait()/cy.get(). Kept here so specs never hard-code '@submit'.
   * `as const` keeps the literal type `@submit`: Cypress 16 only accepts aliases typed as `@${string}`.
   */
  static readonly submitRequest = `@${ContactPage.alias}` as const;

  // ---------------------------------------------------------------------------
  // Locators: every query is scoped to <main>, which keeps the hidden Next.js
  // route announcer (role="alert", rendered outside <main>) out of role queries.
  // ---------------------------------------------------------------------------

  main(): ElementChain {
    return cy.findByRole('main');
  }

  nameInput(): ElementChain {
    return this.main().findByLabelText(CONTACT_LABELS.name);
  }

  emailInput(): ElementChain {
    return this.main().findByLabelText(CONTACT_LABELS.email);
  }

  phoneInput(): ElementChain {
    return this.main().findByLabelText(CONTACT_LABELS.phone);
  }

  messageInput(): ElementChain {
    return this.main().findByLabelText(CONTACT_LABELS.message);
  }

  submitButton(): ElementChain {
    return this.main().findByRole('button', { name: SUBMIT_BUTTON_NAME });
  }

  /** Success confirmation. Expected to be a live region (role="status"). */
  successMessage(): ElementChain {
    return this.main().findByRole('status');
  }

  /** Error message. Expected role="alert" so screen readers announce it immediately. */
  errorMessage(): ElementChain {
    return this.main().findByRole('alert');
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Open the contact page. */
  visit(): void {
    cy.visit(CONTACT_PATH);
  }

  /** Fill only the fields provided. Skipped fields stay empty (used by required-field tests). */
  fillForm(data: ContactFormData): void {
    if (data.name !== undefined) this.typeInto(this.nameInput(), data.name);
    if (data.email !== undefined) this.typeInto(this.emailInput(), data.email);
    if (data.phone !== undefined) this.typeInto(this.phoneInput(), data.phone);
    if (data.message !== undefined) this.typeInto(this.messageInput(), data.message);
  }

  /** Click the submit button. */
  submit(): void {
    this.submitButton().click();
  }

  /** Convenience: fill the form, then submit it. */
  submitForm(data: ContactFormData): void {
    this.fillForm(data);
    this.submit();
  }

  // ---------------------------------------------------------------------------
  // Network stubbing
  // ---------------------------------------------------------------------------

  /**
   * Answer the form's submit request with a fake response, aliased as @submit.
   * The real backend (and Resend) never sees it, so no email reaches the business.
   * Registered after the global guard in support/e2e.ts, so it takes precedence.
   */
  stubSubmission({ status = 200 }: StubOptions = {}): void {
    cy.intercept('POST', CONTACT_SUBMIT_ENDPOINT, {
      statusCode: status,
      body: status < 400 ? { success: true } : { error: 'Stubbed server error' },
    }).as(ContactPage.alias);
  }

  /** Wait for the stubbed submission. Yields the interception (request + response). */
  waitForSubmit() {
    return cy.wait(ContactPage.submitRequest);
  }

  /** Every submission captured so far, for count assertions: .should('have.length', 0). */
  submitRequests(): Cypress.Chainable<unknown[]> {
    return cy.get<unknown[]>(`${ContactPage.submitRequest}.all` as const);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Clear a field, then type into it.
   * - cy.type('') throws, so an empty value only clears the field.
   * - parseSpecialCharSequences: false stops "{" in data being read as a key, like {enter}.
   * - delay: 0 types instantly; the default 10 ms per character slows long messages.
   */
  private typeInto(field: ElementChain, value: string): void {
    if (value === '') {
      field.clear();
    } else {
      field.clear().type(value, { delay: 0, parseSpecialCharSequences: false });
    }
  }
}