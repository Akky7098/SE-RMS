import React from "react";

import {
  statusLabel,
} from "../utils/timesheetHelpers";

const CONFIG = {
  SUBMITTED: {
    icon: "✓",
    tone: "submitted",
  },

  PENDING: {
    icon: "◷",
    tone: "pending",
  },

  REVIEWED: {
    icon: "✓",
    tone: "reviewed",
  },

  NEEDS_ATTENTION: {
    icon: "!",
    tone:
      "needs-attention",
  },
};

const TimesheetStatusBadge = ({
  status,
}) => {
  const normalized =
    String(
      status || ""
    ).toUpperCase();

  const config =
    CONFIG[
      normalized
    ] ||
    {
      icon: "•",
      tone: "neutral",
    };

  return (
    <span
      className={`se-ts-status se-ts-status-${config.tone}`}
    >
      <i>
        {config.icon}
      </i>

      <span>
        {statusLabel(
          normalized
        )}
      </span>
    </span>
  );
};

export default TimesheetStatusBadge;