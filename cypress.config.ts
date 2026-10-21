/**
 * Cypress configuration.
 *
 * baseUrl reads the same BASE_URL variable as playwright.config.ts, so one
 * environment variable points both suites at the same site:
 *   $env:BASE_URL="http://localhost:3000"; npx cypress run
 */
import { defineConfig } from 'cypress';

export default defineConfig({
  /**
   * Don't let Cypress rewrite the site's HTML and JavaScript as it loads.
   *
   * With the default (true), React reported hydration error #418 under Cypress only:
   * the page then gets rebuilt mid-test, and inputs detach while being typed into.
   * The same page showed no #418 in Edge InPrivate (desktop and 1000x660) or in
   * Playwright (TC-GEN-001), so the error came from the test tool, not the site.
   * This option exists to defeat frame-busting code, which this site doesn't have.
   */
  modifyObstructiveCode: false,

  e2e: {
    // www: the domain without www 301-redirects, which would slow every visit.
    baseUrl: process.env.BASE_URL ?? 'https://www.ampvendingmachines.com',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    // Videos slow every run and bloat CI artifacts. Failure screenshots are still on by default.
    video: false,
    // Match Playwright's default viewport so both suites test the same layout.
    viewportWidth: 1280,
    viewportHeight: 720,
  },
});