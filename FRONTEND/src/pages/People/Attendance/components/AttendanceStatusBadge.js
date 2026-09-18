import React from "react";

import {
  statusLabel,
} from "../utils/attendanceHelpers";

function AttendanceStatusBadge({
  status,
}) {
  const normalized =
    String(
      status ||
      "NOT_MARKED"
    ).toUpperCase();

  return (
    <span
      className={`se-people-att-status se-people-att-status--${normalized
        .toLowerCase()
        .replaceAll(
          "_",
          "-"
        )}`}
    >
      <i />

      {statusLabel(
        normalized
      )}
    </span>
  );
}

export default AttendanceStatusBadge;