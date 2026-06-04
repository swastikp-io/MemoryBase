import { BrowserManager } from "./BrowserManager.js";
import { BrowserExecutionResult } from "./BrowserActionTypes.js";
import fs from "fs";
import path from "path";

export class YouTubeAgent {
  public async playVideo(query: string): Promise<BrowserExecutionResult> {
    const startTime = Date.now();
    let success = false;
    let page;

    try {
      const browserManager = BrowserManager.getInstance();
      page = await browserManager.getPage();

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

      // Handle consent dialogs if present (e.g., in EU)
      try {
        const acceptButton = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
        if (await acceptButton.isVisible({ timeout: 2000 })) {
          await acceptButton.click();
        }
      } catch (e) {
        // Ignore consent dialog errors, maybe none exists
      }

      // Wait for search results
      await page.waitForSelector("ytd-video-renderer", { timeout: 15000 });

      // Select first playable video
      const firstVideo = page.locator("ytd-video-renderer a#video-title").first();
      await firstVideo.waitFor({ state: "visible", timeout: 5000 });
      
      const href = await firstVideo.getAttribute("href");
      if (!href) {
        throw new Error("Could not extract video URL.");
      }

      const videoUrl = `https://www.youtube.com${href}`;

      // Clean up the page
      await page.close();

      this.logTelemetry({
        action: "play_youtube",
        query,
        duration: Date.now() - startTime,
        success: true,
      });

      return {
        success: true,
        message: "Your video is now playing.",
        url: videoUrl
      };

    } catch (error: any) {
      this.logTelemetry({
        action: "play_youtube",
        query,
        duration: Date.now() - startTime,
        success: false,
      });

      return {
        success: false,
        code: "VIDEO_NOT_FOUND",
        message: error.message || "No playable video found."
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
