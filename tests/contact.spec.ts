/**
 * Contact form tests.
 *
 * - Each title starts with its Test Case ID from TEST_PLAN.md (traceability).
 * - @smoke marks the fast must-pass subset: npx playwright test --grep "@smoke"
 * - Every submission is stubbed or blocked (see fixtures/index.ts), so the live
 *   site never sends a real email.
 *
 * KNOWN BUGS
 * Tests that document a confirmed defect use test.fail(). They stay green while the
 * bug exists and turn red ("unexpectedly passed") once it's fixed, which is the cue
 * to delete the test.fail() line. Each description starts with its ID from
 * docs/BUG_REPORTS.md; add the GitHub issue number once it's filed.
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures';
import {
  FIELD_ERRORS,
  INVALID_EMAILS,
  SERVER_RULES,
  SERVER_VALIDATION_ERROR_BODY,
  VALID_LEAD,
  messageOfLength,
} from '../shared/contact';

/**
 * Confirmed defects, referenced by the test.fail() calls below.
 * IDs match docs/BUG_REPORTS.md. Once an issue is filed, add its number,
 * e.g. 'BUG-001 (#12): ...', so a failing test points straight to it.
 */
const KNOWN_BUGS = {
  messageLength:
    'BUG-001: the form only checks "not empty"; the server requires 10-1000 characters, ' +
    'so the visitor gets a generic error instead of a field message',
  serverErrors: "BUG-002: the form discards the server's validation message and shows a generic error",
  messageErrorHidden: 'BUG-003: the form sets "Message is required" but never displays it',
  focus:
    'BUG-004: focus is not moved to the first invalid field ' +
    '(accessibility best practice, supports WCAG 3.3.1)',
} as const;

/**
 * Accessibility violations already logged as bugs (docs/BUG_REPORTS.md).
 * TC-A11Y-001 tolerates exactly these, matched by axe rule + a snippet of the element's
 * HTML, so any NEW violation still fails it. When a fix ships, the entry is no longer
 * found and the test fails with a reminder to delete it (same idea as test.fail()).
 */
const KNOWN_A11Y_VIOLATIONS = [
  { bug: 'BUG-005', rule: 'color-contrast', htmlContains: '>Get In Touch<' },
  { bug: 'BUG-006', rule: 'label-content-name-mismatch', htmlContains: 'aria-label="Navigate to homepage"' },
] as const;

/** Short timeout for assertions that are expected to fail, so known bugs don't slow the run. */
const EXPECTED_FAIL_TIMEOUT = { timeout: 2_000 };

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
    // The lead must reach the API intact: check the fields the business needs to reply.
    expect(requests[0]).toMatchObject({
      email: VALID_LEAD.email,
      companyName: VALID_LEAD.companyName,
      message: VALID_LEAD.message,
    });
  });

  test('TC-CF-002 empty form is blocked and the required fields show errors', async ({
    contactPage,
  }) => {
    const requests = await contactPage.stubSubmission();

    await contactPage.submit();

    // The message error is checked separately in TC-CF-010 (known bug: never rendered).
    for (const message of [
      FIELD_ERRORS.firstName,
      FIELD_ERRORS.lastName,
      FIELD_ERRORS.email,
      FIELD_ERRORS.companyName,
    ]) {
      await expect(contactPage.fieldError(message)).toBeVisible();
    }
    expect(requests).toHaveLength(0);
  });

  test('TC-CF-010 an empty message shows a field error and nothing is sent', async ({
    contactPage,
  }) => {
    test.fail(true, KNOWN_BUGS.messageErrorHidden);
    const requests = await contactPage.stubSubmission();

    await contactPage.submitForm({ ...VALID_LEAD, message: '' });

    expect(requests).toHaveLength(0); // passes today: the form does block the submit
    await expect(contactPage.fieldError(FIELD_ERRORS.message)).toBeVisible(EXPECTED_FAIL_TIMEOUT);
  });

  test('TC-A11Y-004 failed submit moves focus to the first invalid field', async ({
    contactPage,
  }) => {
    test.fail(true, KNOWN_BUGS.focus);

    await contactPage.submit();

    await expect(contactPage.firstNameInput).toBeFocused(EXPECTED_FAIL_TIMEOUT);
  });

  // Data-driven: one test per invalid email, so the report shows exactly which one failed.
  for (const email of INVALID_EMAILS) {
    test(`TC-CF-003 rejects invalid email "${email}"`, async ({ contactPage }) => {
      const requests = await contactPage.stubSubmission();

      await contactPage.submitForm({ ...VALID_LEAD, email });

      await expect(contactPage.fieldError(FIELD_ERRORS.invalidEmail)).toBeVisible();
      expect(requests).toHaveLength(0);
    });
  }

  /**
   * Boundary value analysis on the message length the SERVER enforces (10-1000).
   * Lengths just outside the range should be stopped by the form before any request
   * is sent. Today they aren't (see KNOWN_BUGS.messageLength).
   */
  // expectedError: the server's own wording, which the form should show once it shares the schema.
  const messageBoundaries = [
    { length: SERVER_RULES.messageMin - 1, accepted: false, expectedError: /at least 10 characters/i },
    { length: SERVER_RULES.messageMin, accepted: true, expectedError: null },
    { length: SERVER_RULES.messageMax, accepted: true, expectedError: null },
    { length: SERVER_RULES.messageMax + 1, accepted: false, expectedError: /less than 1,?000 characters/i },
  ];

  for (const { length, accepted, expectedError } of messageBoundaries) {
    test(`TC-CF-004 message of ${length} characters is ${accepted ? 'accepted' : 'rejected before sending'}`, async ({
      contactPage,
    }) => {
      if (!accepted) test.fail(true, KNOWN_BUGS.messageLength);
      const requests = await contactPage.stubSubmission();

      await contactPage.submitForm({ ...VALID_LEAD, message: messageOfLength(length) });

      if (accepted) {
        await expect(contactPage.successMessage).toBeVisible();
        expect(requests).toHaveLength(1);
      } else {
        // Expected: a message-specific error and no request at all.
        await expect(contactPage.fieldError(expectedError!)).toBeVisible(EXPECTED_FAIL_TIMEOUT);
        expect(requests).toHaveLength(0);
      }
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

  test("TC-CF-009 server validation error (400) shows the server's message", async ({
    contactPage,
  }) => {
    test.fail(true, KNOWN_BUGS.serverErrors);
    // Reproduce the API's real 400 response so the UI's handling can be checked safely.
    await contactPage.stubSubmission({ status: 400, body: SERVER_VALIDATION_ERROR_BODY });

    await contactPage.submitForm(VALID_LEAD);

    await expect(
      contactPage.main.getByText(/at least 10 characters|check your form data/i),
    ).toBeVisible(EXPECTED_FAIL_TIMEOUT);
  });

  test('TC-A11Y-001 no WCAG 2.1 A/AA violations beyond the logged ones @smoke', async ({
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

    // One entry per failing element, so each can be compared with the known list.
    const found = results.violations.flatMap((violation) =>
      violation.nodes.map((node) => ({
        rule: violation.id,
        impact: violation.impact,
        html: node.html,
        target: node.target.join(' '),
      })),
    );
    const matches = (known: (typeof KNOWN_A11Y_VIOLATIONS)[number], item: (typeof found)[number]) =>
      known.rule === item.rule && item.html.includes(known.htmlContains);

    // New problems: fail with the rule, impact and element, so the report says what to fix.
    const unexpected = found
      .filter((item) => !KNOWN_A11Y_VIOLATIONS.some((known) => matches(known, item)))
      .map((item) => `${item.rule} (${item.impact}): ${item.target}`);
    expect.soft(unexpected, 'New accessibility violations').toEqual([]);

    // Fixed problems: a logged violation that's gone means its entry should be removed.
    const nowFixed = KNOWN_A11Y_VIOLATIONS.filter(
      (known) => !found.some((item) => matches(known, item)),
    ).map((known) => `${known.bug} (${known.rule}) is fixed: remove it from KNOWN_A11Y_VIOLATIONS`);
    expect(nowFixed, 'Logged violations that no longer occur').toEqual([]);
  });
});

/**
 * Page health checks. Separate describe block (no beforeEach), so the error
 * listeners are attached BEFORE the page loads.
 */
test.describe('Contact page health', () => {
  test('TC-GEN-001 contact page loads without React hydration errors @smoke', async ({
    page,
    contactPage,
  }) => {
    // Only React errors count. The network guard blocks analytics beacons, and the
    // resulting network errors are expected noise, not site bugs.
    const isReactError = (text: string) => /Minified React error|hydrat/i.test(text);
    const reactErrors: string[] = [];
    page.on('pageerror', (error) => {
      if (isReactError(error.message)) reactErrors.push(error.message);
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && isReactError(message.text())) reactErrors.push(message.text());
    });

    await contactPage.goto();
    // React reports hydration errors after load, and no event signals "hydration
    // finished", so a short fixed wait is the reliable option for this check.
    await page.waitForLoadState('load');
    await page.waitForTimeout(2_000);

    expect(reactErrors).toEqual([]);
  });
});