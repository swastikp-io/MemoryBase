import { ReflectionEngine } from './reflectionEngine.ts';
import db from '../../db/database.ts';
import { MemoryService } from '../memoryService.ts';
import { EpisodeRepository } from '../../repositories/episodeRepository.ts';

export class MemoryJobs {
  private static reflectionEngine = new ReflectionEngine();
  private static memoryService = new MemoryService();
  private static episodeRepository = new EpisodeRepository();

  static async runNightlyReflection() {
    console.log('[MemoryJobs] Running nightly reflection for all users...');
    try {
      // Get all unique users who have memories
      const stmt = db.prepare('SELECT DISTINCT user_id FROM memories');
      const users = stmt.all() as { user_id: string }[];

      for (const user of users) {
        await this.reflectionEngine.runReflection(user.user_id);
      }
      console.log('[MemoryJobs] Nightly reflection complete.');
    } catch (e) {
      console.error('[MemoryJobs] Nightly reflection error:', e);
    }
  }

  static async runWeeklyCleanup() {
    console.log('[MemoryJobs] Running weekly memory cleanup...');
    try {
      // Cleanup very low importance memories or old un-accessed ones
      const stmt = db.prepare('DELETE FROM memories WHERE importance < 0.2 AND created_at < datetime("now", "-30 days")');
      const info = stmt.run();
      console.log(`[MemoryJobs] Weekly cleanup deleted ${info.changes} low-importance memories.`);
      
      // Cleanup old episodes (e.g., > 90 days)
      const epStmt = db.prepare('DELETE FROM episodes WHERE created_at < datetime("now", "-90 days")');
      const epInfo = epStmt.run();
      console.log(`[MemoryJobs] Weekly cleanup deleted ${epInfo.changes} old episodes.`);

    } catch (e) {
      console.error('[MemoryJobs] Weekly cleanup error:', e);
    }
  }

  static startSchedules() {
    // Nightly at 3 AM: 24 * 60 * 60 * 1000 = 86400000ms
    // For this implementation, we will use a naive interval.
    setInterval(() => {
      const hours = new Date().getHours();
      if (hours === 3) {
        this.runNightlyReflection();
      }
    }, 60 * 60 * 1000); // Check every hour

    // Weekly cleanup (simplified as every 7 days)
    setInterval(() => {
      this.runWeeklyCleanup();
    }, 7 * 24 * 60 * 60 * 1000);
  }
}
