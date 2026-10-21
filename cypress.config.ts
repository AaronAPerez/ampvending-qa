/**
 * Cypress configuration.
 *
 * baseUrl reads the same BASE_URL variable as playwright.config.ts, so one
 * environment variable points both suites at the same site:
 *   $env:BASE_URL="http://localhost:3000"; npx cypress run
 */
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL ?? 'https://ampvendingmachines.com', // TODO(verify)
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    // Videos slow every run and bloat CI artifacts. Failure screenshots are still on by default.
    video: false,
  },
});