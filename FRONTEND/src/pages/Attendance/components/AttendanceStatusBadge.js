import React from "react";

import {
  statusLabel,
} from "../utils/attendanceHelpers";

/* =========================================================
   STATUS VISUAL CONFIG
========================================================= */

const STATUS_CONFIG = {
  PRESENT: {
    icon: "✓",
    tone: "success",
  },

  ABSENT: {
    icon: "×",
    tone: "danger",
  },

  LATE: {
    icon: "◷",
    tone: "warning",
  },

  SHORT: {
    icon: "◴",
    tone: "warning",
  },

  MISSING: {
    icon: "!",
    tone: "danger",
  },

  LEAVE: {
    icon: "○",
    tone: "leave",
  },

  REMOTE: {
    icon: "⌂",
    tone: "remote",
  },

  VISIT: {
    icon: "⌖",
    tone: "field",
  },

  ON_DUTY: {
    icon: "◎",
    tone: "field",
  },

  WEEK_OFF: {
    icon: "−",
    tone: "neutral",
  },

  FUTURE: {
    icon: "·",
    tone: "neutral",
  },
};

/* =========================================================
   ATTENDANCE STATUS BADGE
========================================================= */

const AttendanceStatusBadge = ({
  status,
  compact = false,
}) => {
  const normalized =
    String(
      status || ""
    ).toUpperCase();

  const config =
    STATUS_CONFIG[
      normalized
    ] ||
    {
      icon: "•",
      tone: "neutral",
    };

  return (
    <span
      className={[
        "se-att-status",

        `se-att-status-${normalized.toLowerCase()}`,

        `se-att-status-tone-${config.tone}`,

        compact
          ? "compact"
          : "",
      ]
        .filter(
          Boolean
        )
        .join(" ")}
      title={
        statusLabel(
          normalized
        )
      }
    >
      <i
        className="se-att-status-icon"
        aria-hidden="true"
      >
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

export default AttendanceStatusBadge;