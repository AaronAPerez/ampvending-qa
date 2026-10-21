/**
 * ContactPage: Page Object Model (POM) for the AMP Vending contact form.
 *
 * WHY THIS FILE EXISTS
 * Tests should read like the test plan ("submit with an invalid email"), not like
 * DOM queries. Every selector and action for the contact page lives here, so when
 * the markup changes you update ONE file instead of every test.
 *
 * LOCATOR STRATEGY
 * Role- and label-based locators only (getByRole / getByLabel). They target what a
 * screen-reader user perceives, so if one of these breaks, the form's accessibility
 * probably broke too. Avoid CSS classes: Tailwind class names change constantly.
 *
 * SCOPING TO <main>
 * Next.js injects a hidden route announcer with role="alert" outside <main>.
 * Scoping every locator to <main> keeps getByRole('alert') from matching it.
 *
 * SHARED CONSTANTS
 * The path, labels, button name, endpoint and test data live in shared/contact.ts,
 * which the Cypress suite uses too. Verify the TODO placeholders there.
 */
import type { Locator, Page } from '@playwright/test';
import {
  CONTACT_LABELS,
  CONTACT_PATH,
  CONTACT_SUBMIT_ENDPOINT,
  SUBMIT_BUTTON_NAME,
  type ContactFormData,
  type StubOptions,
} from '../shared/contact';

export class ContactPage {
  /** Path of the contact page, resolved against `baseURL` in playwright.config.ts. */
  static readonly path = CONTACT_PATH;

  /** Glob for the submit request. See shared/contact.ts for how to find the real one. */
  static readonly submitEndpoint = CONTACT_SUBMIT_ENDPOINT;

  /** Landmark that every other locator is scoped to (see SCOPING note above). */
  readonly main: Locator;

  // Form fields. `exact: true` stops "Name" from also matching "Business Name".
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;

  /**
   * Success confirmation. Expected to be a live region (role="status") so screen
   * readers announce it. If the site shows plain text instead, that's a real
   * accessibility bug: log it, then switch this to getByText() temporarily.
   * If success shows as a toast rendered outside <main>, use this.page instead.
   */
  readonly successMessage: Locator;

  /** Error message. Expected role="alert" so screen readers announce it immediately. */
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');

    this.nameInput = this.main.getByLabel(CONTACT_LABELS.name, { exact: true });
    this.emailInput = this.main.getByLabel(CONTACT_LABELS.email, { exact: true });
    this.phoneInput = this.main.getByLabel(CONTACT_LABELS.phone, { exact: true });
    this.messageInput = this.main.getByLabel(CONTACT_LABELS.message, { exact: true });
    this.submitButton = this.main.getByRole('button', { name: SUBMIT_BUTTON_NAME });

    this.successMessage = this.main.getByRole('status');
    this.errorMessage = this.main.getByRole('alert');
  }

  /** Open the contact page. */
  async goto(): Promise<void> {
    await this.page.goto(ContactPage.path);
  }

  /** Fill only the fields provided. Skipped fields stay empty (used by required-field tests). */
  async fillForm(data: ContactFormData): Promise<void> {
    if (data.name !== undefined) await this.nameInput.fill(data.name);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.phone !== undefined) await this.phoneInput.fill(data.phone);
    if (data.message !== undefined) await this.messageInput.fill(data.message);
  }

  /** Click the submit button. */
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Convenience: fill the form, then submit it. */
  async submitForm(data: ContactFormData): Promise<void> {
    await this.fillForm(data);
    await this.submit();
  }

  /**
   * Intercept the form's submit request and answer it with a fake response.
   * The real backend (and Resend) never sees it, so no email reaches the business.
   *
   * Returns a live array of captured request bodies. It fills as requests arrive,
   * so tests can assert on what the form actually sent (and how many times).
   */
  async stubSubmission({ status = 200 }: StubOptions = {}): Promise<unknown[]> {
    const captured: unknown[] = [];

    await this.page.route(ContactPage.submitEndpoint, async (route) => {
      const request = route.request();

      // Only fake the submission itself; let anything else on this URL pass to the guard.
      if (request.method() !== 'POST') return route.fallback();

      // postDataJSON() parses JSON and url-encoded bodies but throws on multipart,
      // so fall back to the raw string rather than crashing the test.
      try {
        captured.push(request.postDataJSON());
      } catch {
        captured.push(request.postData());
      }

      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(status < 400 ? { success: true } : { error: 'Stubbed server error' }),
      });
    });

    return captured;
  }
}