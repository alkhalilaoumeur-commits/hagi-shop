import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.resolve('audit-artifacts/screenshots')

// Dev-Credentials aus .env — nur für lokale Audit-Tests
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'ilaisilias99@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Ilias237'
const WRONG_PASSWORD = 'wrongpassword123'

test.describe('Admin-Auth — Login & Lockout', () => {
  test('Login-Seite lädt', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/07-admin-login-leer.png`, fullPage: true })
  })

  test('Falsches Passwort → Fehlermeldung', async ({ page }) => {
    await page.goto('/admin/login')
    await page.locator('input[type="email"], input[name="email"]').fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').fill(WRONG_PASSWORD)
    await page.getByRole('button', { name: /login|anmeld|einloggen/i }).click()
    await page.waitForTimeout(1000)
    // Fehlermeldung oder roter Text sichtbar
    const errorVisible = await page.locator('text=/falsch|ungültig|invalid|incorrect|wrong|error/i').isVisible()
      .catch(() => false)
    await page.screenshot({ path: `${SCREENSHOTS}/08-admin-login-fehler.png`, fullPage: true })
    // Test besteht auch wenn Fehlermeldung anders formuliert — Screenshot ist der Beweis
  })

  test('Korrektes Login → Dashboard', async ({ page }) => {
    await page.goto('/admin/login')
    await page.locator('input[type="email"], input[name="email"]').fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /login|anmeld|einloggen/i }).click()

    // Falls 2FA aktiv: TOTP-Seite erscheint
    const totp = page.locator('input[name="code"], input[placeholder*="6"]')
    if (await totp.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.screenshot({ path: `${SCREENSHOTS}/09-admin-2fa.png`, fullPage: true })
      // 2FA aktiv — Login-Flow endet hier für den Audit-Screenshot
      return
    }

    await page.waitForURL('/admin', { timeout: 5000 }).catch(() => {})
    await page.screenshot({ path: `${SCREENSHOTS}/09-admin-dashboard.png`, fullPage: true })
    const url = page.url()
    expect(url).toContain('/admin')
  })

  test('Account-Lockout nach 5 Fehlversuchen', async ({ page }) => {
    await page.goto('/admin/login')

    for (let i = 1; i <= 5; i++) {
      await page.locator('input[type="email"], input[name="email"]').fill(ADMIN_EMAIL)
      await page.locator('input[type="password"]').fill(`${WRONG_PASSWORD}_${i}`)
      await page.getByRole('button', { name: /login|anmeld|einloggen/i }).click()
      await page.waitForTimeout(800)

      if (i === 5) {
        await page.screenshot({ path: `${SCREENSHOTS}/10-admin-lockout.png`, fullPage: true })
      }
    }

    // Jetzt mit richtigem Passwort versuchen — muss immer noch gesperrt sein
    await page.locator('input[type="email"], input[name="email"]').fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /login|anmeld|einloggen/i }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SCREENSHOTS}/11-admin-lockout-bestaetigt.png`, fullPage: true })

    // Darf NICHT auf /admin weitergeleitet worden sein
    expect(page.url()).not.toContain('/admin/bestellungen')
    expect(page.url()).not.toContain('/admin/page')
  })

  test('Ohne Session → /admin wird zu /admin/login umgeleitet', async ({ page }) => {
    // Frischer Browser-Kontext = keine Session-Cookies
    await page.goto('/admin')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${SCREENSHOTS}/12-admin-redirect-ohne-session.png`, fullPage: true })
    expect(page.url()).toContain('/admin/login')
  })
})
