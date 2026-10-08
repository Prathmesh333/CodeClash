import { test, expect } from '@playwright/test';
test('casual WASM completion is shared and stays unrated', async ({ browser }) => {
  test.skip(process.env.CASUAL_E2E !== 'true', 'Run with CASUAL_E2E=true');
  test.setTimeout(180000);
  const a = await browser.newContext(),
    b = await browser.newContext();
  try {
    const pa = await a.newPage(),
      pb = await b.newPage();
    for (const [page, name] of [
      [pa, 'AdaByte'],
      [pb, 'LoopRunner'],
    ] as const) {
      await page.goto('/app');
      await page.getByRole('button', { name: 'Allow saved preferences', exact: true }).click();
      await page.getByRole('button', { name: new RegExp(name) }).click();
      await expect(page.getByRole('button', { name: new RegExp(name + ' Sign out') })).toBeVisible({
        timeout: 15000,
      });
      await page.getByRole('button', { name: 'Find a casual match', exact: true }).click();
    }
    for (const page of [pa, pb]) await page.getByRole('button', { name: 'I’m ready' }).click();
    await expect(pa.locator('.problem-content h2')).toBeVisible({ timeout: 15000 });
    const examples = await pa.locator('.example').evaluateAll((nodes) =>
      nodes.map((node) => {
        const values = node.querySelectorAll('pre');
        return { input: values[0].textContent!, output: values[1].textContent! };
      }),
    );
    const editor = pa.getByRole('textbox', { name: 'Python solution editor' });
    async function enter(source: string) {
      await editor.focus();
      await pa.keyboard.press('ControlOrMeta+A');
      await pa.keyboard.insertText(source);
    }
    await expect(pa.locator('.monaco-editor')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await pa.screenshot({ path: 'artifacts/match-light.png', fullPage: true });
    await pa.getByRole('button', { name: 'Change theme' }).click();
    await pa
      .getByRole('dialog', { name: 'Make the arena yours.' })
      .getByRole('button', { name: /Midnight Mint/ })
      .click();
    await expect(pa.locator('.monaco-editor')).toHaveCSS('background-color', 'rgb(20, 28, 40)');
    await pa
      .getByRole('dialog', { name: 'Make the arena yours.' })
      .getByRole('button', { name: /CodeClash Light/ })
      .click();
    await pa
      .getByRole('dialog', { name: 'Make the arena yours.' })
      .getByRole('button', { name: 'Done', exact: true })
      .click();

    await enter('print("wrong")');
    await pa.getByRole('button', { name: 'Check & finish' }).click();
    await expect(pa.getByLabel('Local Python results')).toContainText('Wrong answer', {
      timeout: 60000,
    });
    await expect(pa.getByRole('button', { name: 'Check & finish' })).toBeEnabled();
    const mapping = Object.fromEntries(examples.map((e) => [e.input.trim(), e.output]));
    await enter(
      `import sys, json\nanswers=json.loads(${JSON.stringify(JSON.stringify(mapping))})\nsys.stdout.write(answers[sys.stdin.read().strip()])`,
    );
    await pa.getByRole('button', { name: 'Check & finish' }).click();
    for (const page of [pa, pb])
      await expect(
        page.locator('.result-banner').getByText(/Browser-reported completion · unverified/),
      ).toBeVisible({ timeout: 60000 });
    const account = await (await pa.request.get('/api/me')).json();
    expect(account.user.rating).toBe(1200);
    expect(account.user.games_played).toBe(0);
  } finally {
    await a.close();
    await b.close();
  }
});
