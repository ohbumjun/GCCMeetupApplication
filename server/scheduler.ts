import cron from "node-cron";
import { storage } from "./storage";

export function setupSchedulers() {
  // 경고 6개월 자동 리셋 - 매년 1월 1일, 7월 1일 00:00 (KST 기준)
  cron.schedule("0 0 1 1,7 *", async () => {
    console.log("[Scheduler] Running semi-annual warning reset...");
    try {
      const result = await storage.resetAllWarnings();
      console.log(`[Scheduler] Successfully reset ${result.count} warnings`);
    } catch (error) {
      console.error("[Scheduler] Error resetting warnings:", error);
    }
  }, {
    timezone: "Asia/Seoul"
  });

  // Vote 데드라인 체크 - 매주 수요일 19:30 (KST 기준)
  cron.schedule("30 19 * * 3", async () => {
    console.log("[Scheduler] Running vote deadline check...");
    try {
      const results = await storage.processVoteDeadlines();
      const totalNonVoters = results.reduce((sum, r) => sum + r.nonVotersCount, 0);
      console.log(`[Scheduler] Processed ${results.length} votes, ${totalNonVoters} total non-voters penalized`);
    } catch (error) {
      console.error("[Scheduler] Error processing vote deadlines:", error);
    }
  }, {
    timezone: "Asia/Seoul"
  });

  console.log("✅ Schedulers initialized");
  console.log("  - Warning reset: Jan 1 & Jul 1 at 00:00 KST");
  console.log("  - Vote deadline check: Every Wednesday at 19:30 KST");
}
