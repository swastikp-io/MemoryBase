// Playwright imported dynamically to avoid serverless crash
import type { Browser, BrowserContext, Page } from "playwright";

export class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private constructor() {}

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  public async getPage(): Promise<Page> {
    if (!this.browser) {
      try {
        const { chromium } = await import("playwright");
        this.browser = await chromium.launch({
          headless: true, // Run in background to avoid opening a new visible browser
        });
      } catch (error) {
        console.error("Playwright is not available in this environment", error);
        throw new Error("Browser automation is not supported in the current environment.");
      }
    }

    if (!this.context) {
      this.context = await this.browser.newContext();
    }

    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
    }

    return this.page;
  }

  public async cleanup(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
    this.page = null;

    if (this.context) {
      await this.context.close();
    }
    this.context = null;

    if (this.browser) {
      await this.browser.close();
    }
    this.browser = null;
  }

  public async getNewPage(): Promise<Page> {
    if (!this.browser || !this.context) {
        return this.getPage();
    }
    return await this.context.newPage();
  }
}
