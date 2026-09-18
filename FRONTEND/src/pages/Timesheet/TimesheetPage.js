import React from "react";

import TimesheetWeb from "./TimesheetWeb";
import TimesheetPwa from "./TimesheetPwa";

/* =========================================================
   DEVICE MODE

   Web and PWA remain completely separate UIs.
========================================================= */

const isPwaMode =
  () => {
    const standalone =
      window.matchMedia?.(
        "(display-mode: standalone)"
      )?.matches;

    const iosStandalone =
      window.navigator
        ?.standalone ===
      true;

    const smallScreen =
      window.innerWidth <=
      768;

    return Boolean(
      standalone ||
      iosStandalone ||
      smallScreen
    );
  };

const TimesheetPage =
  () => {
    return isPwaMode() ? (
      <TimesheetPwa />
    ) : (
      <TimesheetWeb />
    );
  };

export default TimesheetPage;