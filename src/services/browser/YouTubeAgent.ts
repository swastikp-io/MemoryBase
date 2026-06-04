import { BrowserManager } from "./BrowserManager.js";
import { BrowserExecutionResult } from "./BrowserActionTypes.js";
import fs from "fs";
import path from "path";

export class YouTubeAgent {
  public async playVideo(query: string): Promise<BrowserExecutionResult> {
    const startTime = Date.now();
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

      this.logTelemetry({
        action: "play_youtube",
        query,
        duration: Date.now() - startTime,
        success: true,
      });

      return {
        success: true,
        message: "Opening YouTube search.",
        url: searchUrl
      };

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
