/**
 * Custom Playwright fixtures. Specs import `test` and `expect` from HERE,
 * not from '@playwright/test'.
 *
 * 1. NETWORK SAFETY GUARD
 *    Overrides the built-in `page` fixture so every test blocks ALL POST requests
 *    by default. The suite runs against the live site; without this guard, a form
 *    test could send a real email to the business.
 *    Stubs a test registers later (e.g. contactPage.stubSubmission) still win,
 *    because Playwright runs route handlers in REVERSE registration order:
 *    newest handler first, this guard last.
 *
 * 2. PAGE OBJECTS
 *    `contactPage` is created for any test that asks for it, so specs don't
 *    repeat `new ContactPage(page)`. Add future page objects (HomePage, NavBar) here.
 */
import { test as base, expect } from '@playwright/test';
import { ContactPage } from '../pages/ContactPage';

/** Page objects available to every test via destructuring: ({ contactPage }) => ... */
type PageObjects = {
  contactPage: ContactPage;
};

export const test = base.extend<PageObjects>({
  // Network safety guard: abort every POST that no test-specific stub handled.
  // GET requests (pages, scripts, images) pass through untouched.
  page: async ({ page }, use) => {
    await page.route('**/*', (route) =>
      route.request().method() === 'POST' ? route.abort('blockedbyclient') : route.fallback(),
    );
    await use(page);
  },

  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
});

export { expect };