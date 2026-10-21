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
 * The site's toast notifications (sonner) repeat the banner text outside <main>,
 * and Next.js adds a hidden route announcer there too. Scoping to <main> keeps
 * both out of every query.
 *
 * Labels, button name, banner text and rules live in shared/contact.ts
 * (shared with the Cypress suite).
 */
import type { Locator, Page } from '@playwright/test';
import {
  CONTACT_LABELS,
  CONTACT_PATH,
  CONTACT_SUBMIT_ENDPOINT,
  ERROR_TEXT,
  SUBMIT_BUTTON_NAME,
  SUCCESS_TEXT,
  type ContactFormData,
  type StubOptions,
} from '../shared/contact';

export class ContactPage {
  /** Path of the contact page, resolved against `baseURL` in playwright.config.ts. */
  static readonly path = CONTACT_PATH;

  /** Glob for the submit request. */
  static readonly submitEndpoint = CONTACT_SUBMIT_ENDPOINT;

  /** Landmark that every other locator is scoped to (see SCOPING note above). */
  readonly main: Locator;

  // Form fields
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly companyNameInput: Locator;
  readonly messageInput: Locator;
  readonly submitButton: Locator;

  /**
   * Result banners. Field errors also use role="alert", so the banners are
   * filtered by their text rather than found by role alone.
   */
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main');

    this.firstNameInput = this.main.getByLabel(CONTACT_LABELS.firstName);
    this.lastNameInput = this.main.getByLabel(CONTACT_LABELS.lastName);
    this.emailInput = this.main.getByLabel(CONTACT_LABELS.email);
    this.phoneInput = this.main.getByLabel(CONTACT_LABELS.phone);
    this.companyNameInput = this.main.getByLabel(CONTACT_LABELS.companyName);
    this.messageInput = this.main.getByLabel(CONTACT_LABELS.message);
    this.submitButton = this.main.getByRole('button', { name: SUBMIT_BUTTON_NAME });

    this.successMessage = this.main.getByRole('alert').filter({ hasText: SUCCESS_TEXT });
    this.errorMessage = this.main.getByRole('alert').filter({ hasText: ERROR_TEXT });
  }

  /**
   * Wait until entrance animations have finished.
   *
   * WHY: the site fades content in with framer-motion (opacity 0 -> 1, staggered).
   * Mid-fade, text is partly transparent, and axe measures that as a contrast failure.
   * CI hit this in Firefox: different FAQ cards were flagged on each attempt, even
   * though their final colors pass easily.
   *
   * HOW: framer-motion animates through inline `style="opacity: ..."`. Wait until no
   * element in <main> sits between 0 and 1, and stays that way for 500 ms, which covers
   * the gaps between staggered items. Elements still at 0 (not animated in yet) are
   * ignored: axe skips invisible elements too. Tailwind opacity utilities are classes,
   * not inline styles, so intentional design opacity doesn't block this.
   */
  async waitForAnimationsToSettle(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const animating = Array.from(document.querySelectorAll<HTMLElement>('main *')).some((el) => {
          if (el.style.opacity === '') return false;
          const opacity = Number(el.style.opacity);
          return opacity > 0 && opacity < 1;
        });
        const state = window as unknown as { __qaSettledAt?: number };
        if (animating) {
          state.__qaSettledAt = undefined;
          return false;
        }
        state.__qaSettledAt ??= performance.now();
        return performance.now() - state.__qaSettledAt >= 500;
      },
      undefined,
      { timeout: 10_000, polling: 100 },
    );
  }

  /**
   * A field-level error, found by its text inside <main>. Deliberately NOT by role:
   * the site may drop role="alert" from field errors (they should be announced via
   * focus + aria-describedby instead), and this locator keeps working either way.
   */
  fieldError(text: string | RegExp): Locator {
    return this.main.getByText(text);
  }

  /** Open the contact page and wait until it's interactive. */
  async goto(): Promise<void> {
    await this.page.goto(ContactPage.path);
    await this.waitForHydration();
  }

  /**
   * Wait until React has hydrated the form, meaning its event handlers are attached.
   *
   * WHY: the server sends finished-looking HTML before the JavaScript runs. Typing or
   * clicking before hydration either loses the typed values or triggers the browser's
   * native form submit, which reloads the page. Slower engines hit that window most,
   * which showed up in CI as flaky WebKit "success message not found" failures.
   *
   * HOW: React stores its props on hydrated DOM nodes under a key starting with
   * "__reactProps". That's a React internal, but it has been stable for years and it's
   * the only reliable signal without changing the site. If the site ever adds an
   * explicit marker (e.g. data-hydrated="true"), wait for that instead.
   */
  async waitForHydration(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('main button[type="submit"]');
        return button !== null && Object.keys(button).some((key) => key.startsWith('__reactProps'));
      },
      undefined,
      { timeout: 15_000 },
    );
  }

  /** Fill only the fields provided. Skipped fields stay empty (used by required-field tests). */
  async fillForm(data: ContactFormData): Promise<void> {
    if (data.firstName !== undefined) await this.firstNameInput.fill(data.firstName);
    if (data.lastName !== undefined) await this.lastNameInput.fill(data.lastName);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.phone !== undefined) await this.phoneInput.fill(data.phone);
    if (data.companyName !== undefined) await this.companyNameInput.fill(data.companyName);
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
  async stubSubmission({ status = 200, body }: StubOptions = {}): Promise<unknown[]> {
    const captured: unknown[] = [];
    const responseBody =
      body ?? (status < 400
        ? { success: true, message: 'Thank you for your message!' }
        : { success: false, message: 'Stubbed server error' });

    await this.page.route(ContactPage.submitEndpoint, async (route) => {
      const request = route.request();

      // Only fake the submission itself; let anything else on this URL pass to the guard.
      if (request.method() !== 'POST') return route.fallback();

      // The form sends JSON; fall back to the raw string if a body ever isn't JSON.
      try {
        captured.push(request.postDataJSON());
      } catch {
        captured.push(request.postData());
      }

      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(responseBody) });
    });

    return captured;
  }
}