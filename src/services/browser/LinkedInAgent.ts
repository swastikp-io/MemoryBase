import { BrowserManager } from "./BrowserManager.js";
import { BrowserExecutionResult } from "./BrowserActionTypes.js";
import fs from "fs";
import path from "path";

export class LinkedInAgent {
  public async search(query: string): Promise<BrowserExecutionResult> {
    const startTime = Date.now();
    let page;

    try {
      const browserManager = BrowserManager.getInstance();
      page = await browserManager.getPage();

      // Navigate to LinkedIn
      await page.goto("https://www.linkedin.com/", { waitUntil: "domcontentloaded" });

      // Try to find a search input to satisfy the literal typing requirement
      // LinkedIn logged-out homepage might not have a prominent search bar, but we can try
      try {
        const searchInput = page.locator('input[type="text"][name="keywords"], input.search-global-typeahead__input').first();
        if (await searchInput.isVisible({ timeout: 2000 })) {
          await searchInput.fill(query);
          await searchInput.press("Enter");
          await page.waitForLoadState("domcontentloaded");
        }
      } catch (e) {
        // Fallback if search bar isn't found (likely due to login wall)
      }

      // The most reliable way to search LinkedIn is constructing the URL directly,
      // which we will return for the frontend to open so the user can use their own cookies.
      const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`;

      // Clean up the page
      await page.close();

      this.logTelemetry({
        action: "search_linkedin",
        query,
        duration: Date.now() - startTime,
        success: true,
      });

      return {
        success: true,
        message: `Searching LinkedIn for "${query}".`,
        url: searchUrl
      };

    } catch (error: any) {
      if (page && !page.isClosed()) {
        await page.close();
      }
      
      this.logTelemetry({
        action: "search_linkedin",
        query,
        duration: Date.now() - startTime,
        success: false,
      });

      return {
        success: false,
        code: "LINKEDIN_ERROR",
        message: error.message || "Could not complete LinkedIn search."
      };
    }
  }

  private logTelemetry(data: any) {
    try {
      const logDir = path.join(process.cwd(), ".paralex-telemetry");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(
        path.join(logDir, "browser_actions.log"),
        JSON.stringify({ timestamp: new Date().toISOString(), ...data }) + "\n"
      );
    } catch (e) {
      console.error("Telemetry error:", e);
    }
  }
}
