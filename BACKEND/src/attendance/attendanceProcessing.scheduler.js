const attendanceService =
  require("./attendance.service");

const PROCESS_INTERVAL_MS =
  5 * 60 * 1000;

let processorTimer = null;
let processorRunning = false;

const processAttendanceQueue =
  async () => {
    if (processorRunning) {
      return;
    }

    processorRunning = true;

    try {
      const result =
        await attendanceService
          .processPendingPunches({
            limit: 5000,
          });

      console.log(
        "[ATTENDANCE PROCESSOR]",
        result
      );
    } catch (error) {
      console.error(
        "[ATTENDANCE PROCESSOR] Failed:",
        error?.message ||
          error
      );
    } finally {
      processorRunning = false;
    }
  };

const startAttendanceProcessingScheduler =
  () => {
    if (processorTimer) {
      return;
    }

    console.log(
      "[ATTENDANCE PROCESSOR] Started - every 5 minutes"
    );

    /*
     * Process existing backlog shortly
     * after application startup.
     */
    setTimeout(
      processAttendanceQueue,
      15000
    );

    processorTimer =
      setInterval(
        processAttendanceQueue,
        PROCESS_INTERVAL_MS
      );

    processorTimer.unref?.();
  };

module.exports = {
  startAttendanceProcessingScheduler,
  processAttendanceQueue,
};