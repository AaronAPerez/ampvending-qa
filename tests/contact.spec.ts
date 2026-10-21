/**
 * Contact form tests.
 *
 * - Each title starts with its Test Case ID from TEST_PLAN.md (traceability).
 * - @smoke marks the fast must-pass subset: npx playwright test --grep "@smoke"
 * - Every submission is stubbed or blocked (see fixtures/index.ts), so the live
 *   site never sends a real email.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures';
// Test data is shared with the Cypress suite, so both frameworks test identical inputs.
import { INVALID_EMAILS, VALID_LEAD } from '../shared/contact';

test.describe('Contact form', () => {
  test.beforeEach(async ({ contactPage }) => {
    await contactPage.goto();
  });

  test('TC-CF-001 valid submission shows confirmation and sends the lead @smoke', async ({
    contactPage,
  }) => {
    const requests = await contactPage.stubSubmission();

    await contactPage.submitForm(VALID_LEAD);

    await expect(contactPage.successMessage).toBeVisible();
    expect(requests).toHaveLength(1);
    // Payload shape depends on the app; this checks the email arrived unaltered.
    expect(JSON.stringify(requests[0])).toContain(VALID_LEAD.email);
  });

  test('TC-CF-002 empty form is blocked and focus moves to the first required field', async ({
    contactPage,
  }) => {
    const requests = await contactPage.stubSubmission();

    await contactPage.submit();

    // Focus on the first invalid field is both the browser's native behavior and an
    // accessibility best practice. It's also a reliable signal validation has run,
    // which avoids checking "nothing was sent" before a request could even start.
    await expect(contactPage.nameInput).toBeFocused(); // TODO(verify): first required field
    expect(requests).toHaveLength(0);
  });

  // Data-driven: one test per invalid email, so the report shows exactly which one failed.
  for (const email of INVALID_EMAILS) {
    test(`TC-CF-003 rejects invalid email "${email}"`, async ({ contactPage }) => {
      const requests = await contactPage.stubSubmission();

      await contactPage.submitForm({ ...VALID_LEAD, email });

      await expect(contactPage.emailInput).toBeFocused();
      expect(requests).toHaveLength(0);
    });
  }

  test('TC-CF-005 server error shows an error and keeps the typed input', async ({
    contactPage,
  }) => {
    await contactPage.stubSubmission({ status: 500 });

    await contactPage.submitForm(VALID_LEAD);

    await expect(contactPage.errorMessage).toBeVisible();
    await expect(contactPage.successMessage).toBeHidden();
    // Wiping the visitor's message on failure loses the lead. Treat it as a real bug.
    await expect(contactPage.messageInput).toHaveValue(VALID_LEAD.message);
  });

  test('TC-A11Y-001 no WCAG 2.1 A/AA violations detected by axe @smoke', async ({
    page,
  }, testInfo) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Attach the full results so failures can be debugged from the CI HTML report.
    await testInfo.attach('axe-violations', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });

    // Compare readable IDs, not raw objects, so a failure lists what's wrong at a glance.
    expect(results.violations.map((v) => `${v.id} (${v.impact})`)).toEqual([]);
  });
});