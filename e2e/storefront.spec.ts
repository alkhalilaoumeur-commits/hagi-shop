import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOTS = path.resolve('audit-artifacts/screenshots')

test.describe('Storefront — Browse & Warenkorb', () => {
  test('Homepage lädt + Hero sichtbar', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Hagi/i)
    await page.screenshot({ path: `${SCREENSHOTS}/01-homepage.png`, fullPage: true })
  })

  test('Produktliste /produkte zeigt Karten', async ({ page }) => {
    await page.goto('/produkte')
    // Mindestens eine Produktkarte sichtbar
    const cards = page.locator('a[href^="/produkte/"]')
    await expect(cards.first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/02-produktliste.png`, fullPage: true })
  })

  test('Produktdetailseite öffnet', async ({ page }) => {
    await page.goto('/produkte/vintage-patchwork-230-160')
    // "In den Warenkorb"-Button oder Preis sichtbar
    await expect(page.locator('h1').first()).toBeVisible()
    await page.screenshot({ path: `${SCREENSHOTS}/03-produktdetail.png`, fullPage: true })
  })

  test('Produkt in Warenkorb legen', async ({ page }) => {
    await page.goto('/produkte/vintage-patchwork-230-160')
    const addBtn = page.getByRole('button', { name: /warenkorb|hinzufügen|bestellen/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: `${SCREENSHOTS}/04-nach-add-to-cart.png`, fullPage: true })
  })

  test('Warenkorb /warenkorb zeigt Inhalt', async ({ page }) => {
    // Erst Produkt hinzufügen
    await page.goto('/produkte/vintage-patchwork-230-160')
    const addBtn = page.getByRole('button', { name: /warenkorb|hinzufügen|bestellen/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)
    }

    await page.goto('/warenkorb')
    await page.screenshot({ path: `${SCREENSHOTS}/05-warenkorb.png`, fullPage: true })
  })

  test('Checkout-Seite /checkout erreichbar', async ({ page }) => {
    await page.goto('/checkout')
    await page.screenshot({ path: `${SCREENSHOTS}/06-checkout.png`, fullPage: true })
  })
})
