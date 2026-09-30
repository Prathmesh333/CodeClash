import { test, expect } from '@playwright/test';
test('arena is responsive and sign-in has real local accounts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Compete. Solve./ })).toBeVisible();
  await expect(page.getByText('Local setup in progress.')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'artifacts/arena-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Find a match' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'artifacts/arena-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'AdaByte' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('two users pair, ready, reconnect, see unavailable judge honestly, and persist a forfeit', async ({
  browser,
}) => {
  test.setTimeout(180000);
  const a = await browser.newContext(),
    b = await browser.newContext();
  const pa = await a.newPage(),
    pb = await b.newPage();
  const errors: string[] = [];
  pa.on('pageerror', (e) => errors.push(e.message));
  pb.on('pageerror', (e) => errors.push(e.message));
  try {
    for (const [page, name] of [
      [pa, 'AdaByte'],
      [pb, 'LoopRunner'],
    ] as const) {
      await page.goto('/');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: new RegExp(name) })
        .click();
      await expect(page.getByRole('button', { name: new RegExp(name + ' Sign out') })).toBeVisible({
        timeout: 15000,
      });
    }
    await pa.getByRole('button', { name: 'Find a match', exact: true }).click();
    await pb.getByRole('button', { name: 'Find a match', exact: true }).click();
    await expect(pa.getByRole('button', { name: 'I’m ready' })).toBeVisible({ timeout: 15000 });
    await expect(pb.getByRole('button', { name: 'I’m ready' })).toBeVisible();
    await pa.getByRole('button', { name: 'I’m ready' }).click();
    await pb.getByRole('button', { name: 'I’m ready' }).click();
    await expect(pa.locator('.problem-content h2')).toBeVisible({ timeout: 15000 });
    await expect(pb.locator('.problem-content h2')).toHaveText(
      await pa.locator('.problem-content h2').innerText(),
    );
    await expect(pa.locator('.monaco-editor')).toBeVisible();
    await pa.screenshot({ path: 'artifacts/match-desktop.png', fullPage: true });
    await pa.reload();
    await expect(pa.locator('.problem-content h2')).toBeVisible({ timeout: 15000 });
    const examples = await pa.locator('.example').evaluateAll((nodes) =>
      nodes.map((node) => {
        const values = node.querySelectorAll('pre');
        return { input: values[0].textContent!, output: values[1].textContent! };
      }),
    );
    const executionRequests: string[] = [];
    pa.on('request', (request) => {
      if (/\/api\/match\/.*\/(run|submit)$/.test(request.url()))
        executionRequests.push(request.url());
    });
    const editor = pa.getByRole('textbox', { name: 'Python solution editor' });
    const local = pa.getByLabel('Local Python results');
    async function enter(source: string) {
      await editor.focus();
      await pa.keyboard.press('ControlOrMeta+A');
      await pa.keyboard.insertText(source);
    }
    async function run(source: string, verdict: string) {
      await enter(source);
      await pa.getByRole('button', { name: 'Run', exact: true }).click();
      await expect(local.locator('article').first()).toContainText(verdict, { timeout: 60000 });
      await expect(pa.getByText('Live connection', { exact: true })).toBeVisible();
    }
    // Deliberately solving only the public examples must never settle a match.
    const mapping = Object.fromEntries(examples.map((e) => [e.input.trim(), e.output]));
    await run(
      `import sys, json
answers = json.loads(${JSON.stringify(JSON.stringify(mapping))})
sys.stdout.write(answers[sys.stdin.read().strip()])`,
      'Passed',
    );
    await expect(local.locator('article')).toHaveCount(examples.length);
    await run('print("local-output")', 'Wrong answer');
    await expect(local).toContainText('local-output');
    await run('import sys; sys.stdout.write("no-newline")', 'Wrong answer');
    await expect(local).toContainText('no-newline');
    await run('def broken(', 'Runtime error');
    await run('import sys; print(123); sys.exit(0)', 'Wrong answer');
    await run('import sys; sys.exit(1)', 'Runtime error');
    await run(
      'import js\nprint(hasattr(js,"fetch"),hasattr(js,"document"),hasattr(js,"localStorage"))',
      'Wrong answer',
    );
    await expect(local).toContainText('False False False');
    await run('print("x" * 20000)', 'Output limit');
    await run('while True: pass', 'Time limit');
    await enter('while True: pass');
    await pa.getByRole('button', { name: 'Run', exact: true }).click();
    await pa.getByRole('button', { name: 'Stop run', exact: true }).click();
    await expect(local).toContainText('Run stopped.');
    await run(
      'import os\nprint(os.path.exists("/tmp/previous-run"))\nopen("/tmp/previous-run","w").write("value")\nprint("你好")',
      'Wrong answer',
    );
    await expect(local).toContainText('False');
    await expect(local).toContainText('你好');
    await run('import os\nprint(os.path.exists("/tmp/previous-run"))', 'Wrong answer');
    await expect(local).toContainText('False');
    expect(executionRequests).toEqual([]);
    await expect(pa.getByRole('button', { name: 'Forfeit match', exact: true })).toBeVisible();
    await pa.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(pa.locator('.error-banner')).toContainText('Python judging is not available', {
      timeout: 30000,
    });
    pa.once('dialog', (d) => d.accept());
    await pa.getByRole('button', { name: 'Forfeit match', exact: true }).click();
    await expect(pb.getByRole('heading', { name: 'Victory. Well played.' })).toBeVisible({
      timeout: 15000,
    });
    await expect(pa.getByRole('heading', { name: 'A worthy opponent.' })).toBeVisible({
      timeout: 15000,
    });
    await pa.getByRole('button', { name: 'Rematch · unrated', exact: true }).click();
    await expect(pa.getByRole('button', { name: 'Waiting for rematch…', exact: true })).toBeVisible(
      { timeout: 15000 },
    );
    await pb.getByRole('button', { name: 'Rematch · unrated', exact: true }).click();
    await expect(pa.getByRole('button', { name: 'I’m ready' })).toBeVisible({ timeout: 15000 });
    await expect(pb.getByRole('button', { name: 'I’m ready' })).toBeVisible({ timeout: 15000 });
    await pa.getByRole('button', { name: 'Leave match', exact: true }).click();
    await pa.getByRole('button', { name: 'Match history', exact: true }).click();
    await expect(pa.locator('.history-row').filter({ hasText: 'Defeat' }).first()).toContainText(
      'Defeat',
      { timeout: 15000 },
    );
    expect(errors).toEqual([]);
  } finally {
    await a.close();
    await b.close();
  }
});
test('API denies cross-origin mutation and unauthenticated match access', async ({ request }) => {
  // A transport failure is not a response: retry it so the assertion still tests the status code.
  const send = async (
    method: 'GET' | 'POST',
    path: string,
    options?: Parameters<typeof request.post>[1],
  ) => {
    try {
      return await (method === 'GET' ? request.get(path) : request.post(path, options));
    } catch {
      return await (method === 'GET' ? request.get(path) : request.post(path, options));
    }
  };
  const cross = await send('POST', '/api/auth/local', {
    data: { id: 'alice' },
    headers: { Origin: 'https://evil.example' },
  });
  expect(cross.status()).toBe(403);
  const anonymous = await send('GET', '/api/match/not-a-match');
  expect(anonymous.status()).toBe(401);
});
