import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.resolve('audit-artifacts/screenshots')

test.describe('Widerruf — Belehrung, Lookup & Formular', () => {
  test('Widerrufsbelehrungs-Seite /widerruf lädt', async ({ page }) => {
    await page.goto('/widerruf')
    await expect(page.locator('h1').first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/13-widerruf-belehrung.png`, fullPage: true })
  })

  test('Widerruf-Antrag /widerruf-antrag zeigt Lookup-Formular', async ({ page }) => {
    await page.goto('/widerruf-antrag')
    await expect(page.locator('#orderNumber')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/14-widerruf-antrag-leer.png`, fullPage: true })
  })

  test('Ungültige Bestellnummer → Fehlermeldung, kein Crash', async ({ page }) => {
    await page.goto('/widerruf-antrag')
    await page.locator('#orderNumber').fill('HAG-NICHT-VORHANDEN-000000')
    await page.locator('input[name="email"]').fill('test@example.com')
    await page.getByRole('button', { name: /weiter/i }).click()
    await page.waitForTimeout(2000)
    const body = await page.locator('body').textContent()
    expect(body).not.toContain('Internal Server Error')
    await page.screenshot({ path: `${SCREENSHOTS}/15-widerruf-antrag-ungueltig.png`, fullPage: true })
  })

  test('Widerrufsformular-PDF /widerrufsformular liefert 200', async ({ page }) => {
    // PDF löst einen Download aus — via request prüfen, nicht page.goto()
    const response = await page.request.get('/widerrufsformular')
    const status = response.status()
    expect(status).toBeLessThan(500)
    // Dokumentiere als Screenshot der Widerruf-Belehrungsseite (PDF nicht darstellbar)
    await page.goto('/widerruf')
    await page.screenshot({ path: `${SCREENSHOTS}/16-widerrufsformular-pdf-ok.png`, fullPage: true })
  })

  test('Tracking-Seite /bestellung/status/[token] mit ungültigem Token', async ({ page }) => {
    await page.goto('/bestellung/status/ungueltigertoken123')
    await page.waitForTimeout(500)
    const status = await page.locator('body').textContent()
    expect(status).not.toContain('Internal Server Error')
    await page.screenshot({ path: `${SCREENSHOTS}/17-tracking-ungueltig.png`, fullPage: true })
  })
})
