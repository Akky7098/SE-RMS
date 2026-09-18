export const LEAVE_STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RETURNED: "Returned",
  CANCEL_REQUESTED: "Cancellation Pending",
  CANCELLED: "Cancelled",
  AVAILED: "Availed",
};

export const formatLeaveStatus = (
  status
) => {
  return (
    LEAVE_STATUS_LABELS[
      status
    ] ||
    String(status || "")
      .replaceAll("_", " ")
  );
};

export const formatLeaveDate = (
  value
) => {
  if (!value) return "—";

  const date = new Date(
    `${String(value).slice(0, 10)}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

export const formatLeaveDateShort = (
  value
) => {
  if (!value) return "—";

  const date = new Date(
    `${String(value).slice(0, 10)}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  ).format(date);
};

export const formatDateTime = (
  value
) => {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};

export const formatDays = (
  value
) => {
  const number =
    Number(value || 0);

  if (
    Number.isInteger(
      number
    )
  ) {
    return `${number}`;
  }

  return number.toFixed(1);
};

export const getLeaveType = (
  request
) => {
  return (
    request?.leaveTypeId ||
    request?.leaveType ||
    {}
  );
};

export const getEmployee = (
  request
) => {
  return (
    request?.employeeId ||
    request?.employee ||
    {}
  );
};

export const getLeaveTypeName = (
  request
) => {
  const type =
    getLeaveType(request);

  return (
    type?.name ||
    type?.shortName ||
    type?.code ||
    "Leave"
  );
};

export const getLeaveTypeCode = (
  request
) => {
  const type =
    getLeaveType(request);

  return (
    type?.code ||
    "LV"
  );
};

export const getEmployeeName = (
  request
) => {
  const employee =
    getEmployee(request);

  return (
    employee?.fullName ||
    employee?.name ||
    "Employee"
  );
};

export const getEmployeeInitials = (
  name
) => {
  return String(name || "E")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");
};

export const getBalanceType = (
  balance
) => {
  return (
    balance?.leaveTypeId ||
    balance?.leaveType ||
    {}
  );
};

export const getAvailableBalance = (
  balance
) => {
  if (
    Number.isFinite(
      Number(
        balance?.available
      )
    )
  ) {
    return Number(
      balance.available
    );
  }

  return (
    Number(
      balance?.openingBalance ||
        0
    ) +
    Number(
      balance?.carriedForward ||
        0
    ) +
    Number(
      balance?.accrued ||
        0
    ) +
    Number(
      balance?.adjustment ||
        0
    ) -
    Number(
      balance?.used ||
        0
    ) -
    Number(
      balance?.pending ||
        0
    ) -
    Number(
      balance?.expired ||
        0
    )
  );
};

export const getBalanceEntitlement = (
  balance
) => {
  return (
    Number(
      balance?.openingBalance ||
        0
    ) +
    Number(
      balance?.carriedForward ||
        0
    ) +
    Number(
      balance?.accrued ||
        0
    ) +
    Number(
      balance?.adjustment ||
        0
    )
  );
};

export const isPendingLeave = (
  request
) =>
  request?.status ===
  "PENDING_APPROVAL";

export const canCancelLeave = (
  request
) =>
  [
    "PENDING_APPROVAL",
    "APPROVED",
  ].includes(
    request?.status
  );

export const toDateInputValue = (
  date
) => {
  const target =
    date instanceof Date
      ? date
      : new Date(date);

  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return "";
  }

  const year =
    target.getFullYear();

  const month =
    String(
      target.getMonth() +
        1
    ).padStart(2, "0");

  const day =
    String(
      target.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};