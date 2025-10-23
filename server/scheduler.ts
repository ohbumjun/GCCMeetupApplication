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

  console.log("✅ Schedulers initialized");
  console.log("  - Warning reset: Jan 1 & Jul 1 at 00:00 KST");
}
