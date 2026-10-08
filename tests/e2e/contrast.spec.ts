import { test, expect, type Locator } from '@playwright/test';
async function contrast(locator: Locator, selection = false) {
  return locator.evaluate((node, selection) => {
    const style = getComputedStyle(node, selection ? '::selection' : undefined);
    const rgb = (value: string) =>
      value
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (value: string) => {
      const c = rgb(value).map((v) => {
        v /= 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    };
    const a = luminance(style.color),
      b = luminance(style.backgroundColor);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selection);
}
test('selection and cookie/theme button states stay readable in all eleven palettes', async ({
  page,
}) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  for (let index = 0; index < 11; index++) {
    const trigger = page.getByRole('button', { name: 'Change theme' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Make the arena yours.' });
    await dialog.locator('.theme-option').nth(index).click();
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('button', { name: 'Cookie settings', exact: true }).click();
    for (const control of [
      trigger,
      page.getByRole('button', { name: 'Essential only', exact: true }),
      page.getByRole('button', { name: 'Allow saved preferences', exact: true }),
    ]) {
      expect(await contrast(control, true)).toBeGreaterThanOrEqual(4.5);
      await control.hover();
      await expect
        .poll(() => contrast(control), {
          message: `palette ${index}, ${await control.innerText()}, hover`,
        })
        .toBeGreaterThanOrEqual(4.5);
      await page.mouse.down();
      await expect
        .poll(() => contrast(control), {
          message: `palette ${index}, ${await control.innerText()}, pressed`,
        })
        .toBeGreaterThanOrEqual(4.5);
      await page.mouse.move(0, 0);
      await page.mouse.up();
      await page.keyboard.press('Tab');
      await control.focus();
      await expect.poll(() => contrast(control)).toBeGreaterThanOrEqual(4.5);
      expect(await control.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe('solid');
    }
    await page.getByRole('button', { name: 'Essential only', exact: true }).click();
  }
});
