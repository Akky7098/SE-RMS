/* =========================================================
   FKWEB COMMAND STATE

   Development / demo command queue.

   Kept in its own module so:
   - controller
   - routes
   - scripts

   all share the SAME state object.
========================================================= */

const state = {
  requestTodayLogs: false,

  commandSent: false,

  commandSentAt: null,

  commandResult: "",

  importedCount: 0,
};

const queueTodayLogs =
  () => {
    state.requestTodayLogs =
      true;

    state.commandSent =
      false;

    state.commandSentAt =
      null;

    state.commandResult =
      "";

    state.importedCount =
      0;

    console.log(
      "📌 GET_LOG_DATA QUEUED"
    );

    console.log({
      requestTodayLogs:
        state.requestTodayLogs,

      commandSent:
        state.commandSent,
    });

    return {
      ...state,
    };
  };

const markCommandSent =
  () => {
    state.requestTodayLogs =
      false;

    state.commandSent =
      true;

    state.commandSentAt =
      new Date();

    return {
      ...state,
    };
  };

const setCommandResult =
  (
    result
  ) => {
    state.commandResult =
      String(
        result || ""
      );

    return {
      ...state,
    };
  };

const incrementImported =
  () => {
    state.importedCount +=
      1;

    return state.importedCount;
  };

const getState =
  () => ({
    ...state,
  });

module.exports = {
  queueTodayLogs,
  markCommandSent,
  setCommandResult,
  incrementImported,
  getState,
};