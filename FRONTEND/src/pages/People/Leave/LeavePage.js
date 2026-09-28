import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./Leave.css";

import {
  adjustLeaveBalance,
  applyLeave,
  approveLeave,
  cancelLeave,
  getLeaveApprovalDashboard,
  getLeaveErrorMessage,
  getLeaveRequest,
  getMyLeaveDashboard,
  rejectLeave,
} from "../../../services/leaveService";

import MyLeaveOverview from "./components/MyLeaveOverview";
import LeaveRequestList from "./components/LeaveRequestList";
import LeaveApplyModal from "./components/LeaveApplyModal";
import LeaveApprovalList from "./components/LeaveApprovalList";
import LeaveApprovalDrawer from "./components/LeaveApprovalDrawer";
import LeaveRegister from "./components/LeaveRegister";
import LeaveBalanceAdmin from "./components/LeaveBalanceAdmin";
import LeaveEmptyState from "./components/LeaveEmptyState";

/* =========================================================
   ICONS
========================================================= */

const CalendarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </svg>
);

const PlusIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const RefreshIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 11a8 8 0 1 0 1.3 4.4" />
    <path d="M20 4v7h-7" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m14 7 5 5-5 5" />
  </svg>
);

const OverviewIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <rect x="14" y="14" width="6" height="6" rx="1.5" />
  </svg>
);

const RequestIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </svg>
);

const ApprovalIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3 4.5 6v5.2c0 4.6 3.1 8.8 7.5 9.8 4.4-1 7.5-5.2 7.5-9.8V6L12 3Z" />
    <path d="m8.7 12 2.1 2.1 4.5-4.5" />
  </svg>
);

const TeamIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c.4-3.2 2.4-5 5.5-5s5.1 1.8 5.5 5" />
    <circle cx="17" cy="9" r="2.2" />
    <path d="M15.5 14.5c2.8-.5 4.6.9 5 3.5" />
  </svg>
);

/* =========================================================
   HELPERS
========================================================= */

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getIdString = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    return String(
      value?._id ||
      value?.id ||
      ""
    );
  }

  return String(value);
};

const getLeaveTypeId = (item) =>
  getIdString(
    item?.leaveTypeId ||
    item?.leaveType ||
    item?.typeId ||
    item?.type ||
    ""
  );

const formatLeaveCode = (balance) =>
  balance?.leaveTypeCode ||
  balance?.code ||
  balance?.leaveType?.code ||
  balance?.typeCode ||
  "";

const formatLeaveName = (balance) =>
  balance?.leaveTypeName ||
  balance?.name ||
  balance?.leaveType?.name ||
  balance?.typeName ||
  "";

const getAvailableBalance = (balance) => {
  const value =
    balance?.available ??
    balance?.availableBalance ??
    balance?.balance ??
    balance?.remaining ??
    0;

  return Number(value) || 0;
};

const getUsedBalance = (balance) => {
  const value =
    balance?.used ??
    balance?.usedBalance ??
    balance?.availed ??
    balance?.consumed ??
    0;

  return Number(value) || 0;
};

/* =========================================================
   LEAVE PAGE
========================================================= */

function LeavePage() {
  const currentYear = new Date().getFullYear();

  const [activeTab, setActiveTab] = useState("overview");

  const [employee, setEmployee] = useState(null);
  const [types, setTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);

  const [approvals, setApprovals] = useState([]);
  const [register, setRegister] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [message, setMessage] = useState(null);

  const [
    managementAvailable,
    setManagementAvailable,
  ] = useState(false);

  const [adminAvailable, setAdminAvailable] =
    useState(false);

  /* =======================================================
     MESSAGE
  ======================================================= */

  const showMessage = useCallback((type, text) => {
    setMessage({
      type,
      text,
    });
  }, []);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
    }, 4500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  /* =======================================================
     SELF DATA
  ======================================================= */

  const loadSelfData = useCallback(async () => {
    const result = await getMyLeaveDashboard(
      currentYear
    );

    setEmployee(result?.employee || null);
    setTypes(result?.types || []);
    setBalances(result?.balances || []);
    setRequests(result?.requests || []);
  }, [currentYear]);

  /* =======================================================
     MANAGEMENT DATA
  ======================================================= */

  const loadManagementData =
    useCallback(async () => {
      try {
        const result =
          await getLeaveApprovalDashboard();

        setApprovals(result?.pending || []);
        setRegister(result?.register || []);

        setManagementAvailable(true);
      } catch (error) {
        if (error?.response?.status === 403) {
          setApprovals([]);
          setRegister([]);
          setManagementAvailable(false);
          return;
        }

        throw error;
      }
    }, []);

  /* =======================================================
     PAGE LOAD
  ======================================================= */

  const loadPage = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        await loadSelfData();

        try {
          await loadManagementData();
        } catch (error) {
          console.error(
            "[Leave] Management data:",
            error
          );
        }
      } catch (error) {
        showMessage(
          "error",
          getLeaveErrorMessage(
            error,
            "Unable to load leave management."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      loadSelfData,
      loadManagementData,
      showMessage,
    ]
  );

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  /* =======================================================
     ADMIN
  ======================================================= */

  useEffect(() => {
    setAdminAvailable(false);
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await loadPage({
      silent: true,
    });
  };

  /* =======================================================
     APPLY LEAVE
  ======================================================= */

  const handleApply = async (payload) => {
    setSubmitting(true);

    try {
      await applyLeave(payload);

      setApplyOpen(false);

      showMessage(
        "success",
        "Leave request submitted successfully."
      );

      await loadPage({
        silent: true,
      });
    } catch (error) {
      showMessage(
        "error",
        getLeaveErrorMessage(
          error,
          "Unable to submit leave request."
        )
      );

      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     REQUEST DETAILS
  ======================================================= */

  const handleOpenRequest = async (request) => {
    if (!request?._id) {
      return;
    }

    setSelectedRequest(request);
    setDrawerLoading(true);

    try {
      const details = await getLeaveRequest(
        request._id
      );

      setSelectedRequest(details);
    } catch (error) {
      showMessage(
        "error",
        getLeaveErrorMessage(
          error,
          "Unable to load leave request."
        )
      );
    } finally {
      setDrawerLoading(false);
    }
  };

  /* =======================================================
     APPROVE
  ======================================================= */

  const handleApprove = async (
    request,
    comment
  ) => {
    if (!request?._id) {
      return;
    }

    setProcessing(true);

    try {
      await approveLeave(
        request._id,
        comment
      );

      setSelectedRequest(null);

      showMessage(
        "success",
        "Leave request approved."
      );

      await loadPage({
        silent: true,
      });
    } catch (error) {
      showMessage(
        "error",
        getLeaveErrorMessage(
          error,
          "Unable to approve leave."
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =======================================================
     REJECT
  ======================================================= */

  const handleReject = async (
    request,
    comment
  ) => {
    if (!request?._id) {
      return;
    }

    setProcessing(true);

    try {
      await rejectLeave(
        request._id,
        comment
      );

      setSelectedRequest(null);

      showMessage(
        "success",
        "Leave request rejected."
      );

      await loadPage({
        silent: true,
      });
    } catch (error) {
      showMessage(
        "error",
        getLeaveErrorMessage(
          error,
          "Unable to reject leave."
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =======================================================
     CANCEL
  ======================================================= */

  const handleCancel = async (request) => {
    const reason = window.prompt(
      request?.status === "APPROVED"
        ? "Reason for cancelling this approved leave:"
        : "Reason for cancelling this leave request:"
    );

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      showMessage(
        "error",
        "Cancellation reason is required."
      );

      return;
    }

    setProcessing(true);

    try {
      const result = await cancelLeave(
        request._id,
        reason.trim()
      );

      setSelectedRequest(null);

      showMessage(
        "success",
        result?.status === "CANCEL_REQUESTED"
          ? "Leave cancellation request submitted."
          : "Leave request cancelled."
      );

      await loadPage({
        silent: true,
      });
    } catch (error) {
      showMessage(
        "error",
        getLeaveErrorMessage(
          error,
          "Unable to cancel leave request."
        )
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =======================================================
     ADMIN BALANCE
  ======================================================= */

  const handleBalanceAdjustment = async (
    payload
  ) => {
    setSubmitting(true);

    try {
      await adjustLeaveBalance(payload);

      showMessage(
        "success",
        "Leave balance adjusted successfully."
      );

      await loadPage({
        silent: true,
      });
    } catch (error) {
      showMessage(
        "error",
        getLeaveErrorMessage(
          error,
          "Unable to adjust leave balance."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     DERIVED DATA
  ======================================================= */


  const balanceCards = useMemo(() => {
  if (!Array.isArray(balances)) {
    return [];
  }

  return balances.map((balance, index) => {
    const balanceTypeId = getLeaveTypeId(balance);

    const matchedType = Array.isArray(types)
      ? types.find((type) => {
          const typeId = getIdString(
            type?._id ||
            type?.id ||
            type?.leaveTypeId
          );

          return (
            balanceTypeId &&
            typeId &&
            balanceTypeId === typeId
          );
        })
      : null;

    const code =
      formatLeaveCode(balance) ||
      matchedType?.code ||
      matchedType?.leaveTypeCode ||
      matchedType?.shortCode ||
      `LV${index + 1}`;

    const name =
      formatLeaveName(balance) ||
      matchedType?.name ||
      matchedType?.leaveTypeName ||
      matchedType?.label ||
      code;

    return {
      ...balance,

      resolvedLeaveType: matchedType || null,

      displayCode: String(code).toUpperCase(),

      displayName: String(name),

      available: getAvailableBalance(balance),

      used: getUsedBalance(balance),
    };
  });
}, [balances, types]);


  const pendingMyRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          normalizeStatus(request?.status) ===
          "PENDING_APPROVAL"
      ),
    [requests]
  );

  const approvedRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          normalizeStatus(request?.status) ===
          "APPROVED"
      ),
    [requests]
  );

  const availableDays = useMemo(
    () =>
      balances.reduce(
        (total, balance) =>
          total +
          getAvailableBalance(balance),
        0
      ),
    [balances]
  );

  const usedDays = useMemo(
    () =>
      balances.reduce(
        (total, balance) =>
          total + getUsedBalance(balance),
        0
      ),
    [balances]
  );

  const employeeName =
    employee?.fullName ||
    employee?.name ||
    "My Leave";

  const employeeDesignation =
    employee?.designation ||
    employee?.jobTitle ||
    "";

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const navigation = useMemo(() => {
    const items = [
      {
        key: "overview",
        label: "Overview",
        description: "Balance & upcoming",
        icon: <OverviewIcon />,
      },
      {
        key: "requests",
        label: "My Requests",
        description: "Track my leave",
        icon: <RequestIcon />,
        count: pendingMyRequests.length,
      },
    ];

    if (managementAvailable) {
      items.push(
        {
          key: "approvals",
          label: "Approvals",
          description: "Needs your action",
          icon: <ApprovalIcon />,
          count: approvals.length,
          priority: approvals.length > 0,
        },
        {
          key: "register",
          label: "Team",
          description: "Team leave view",
          icon: <TeamIcon />,
        }
      );
    }

    if (adminAvailable) {
      items.push({
        key: "admin",
        label: "Administration",
        description: "Balance controls",
        icon: <TeamIcon />,
      });
    }

    return items;
  }, [
    pendingMyRequests.length,
    managementAvailable,
    approvals.length,
    adminAvailable,
  ]);

  useEffect(() => {
    const exists = navigation.some(
      (item) => item.key === activeTab
    );

    if (!exists) {
      setActiveTab("overview");
    }
  }, [navigation, activeTab]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="se-leave-page">
        <div className="se-leave-premium-loading">
          <div className="se-leave-premium-loading-orbit">
            <span />
            <strong>LV</strong>
          </div>

          <div>
            <strong>Leave Management</strong>
            <span>Loading your workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="se-leave-page se-leave-v2">
      {/* TOAST */}
      {message ? (
        <div
          className={`se-leave-toast se-leave-toast--${message.type}`}
          role="status"
        >
          <span>
            {message.type === "success"
              ? "✓"
              : "!"}
          </span>

          <p>{message.text}</p>

          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      {/* ===================================================
          PREMIUM HEADER
      =================================================== */}

      <section className="se-leave-v2-hero">
        <div className="se-leave-v2-hero-glow se-leave-v2-hero-glow--one" />
        <div className="se-leave-v2-hero-glow se-leave-v2-hero-glow--two" />
        <div className="se-leave-v2-hero-grid" />

        <div className="se-leave-v2-hero-content">
          <div className="se-leave-v2-hero-copy">
            <div className="se-leave-v2-eyebrow">
              <span className="se-leave-v2-eyebrow-line" />
              PEOPLE · LEAVE
            </div>

            <div className="se-leave-v2-title-row">
              <div className="se-leave-v2-title-icon">
                <CalendarIcon />
              </div>

              <div>
                <h1>Leave Management</h1>

                <p>
                  {employeeName}
                  {employeeDesignation
                    ? ` · ${employeeDesignation}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="se-leave-v2-hero-actions">
            <div className="se-leave-v2-year">
              <span>LEAVE YEAR</span>
              <strong>{currentYear}</strong>
            </div>

            <button
              type="button"
              className="se-leave-v2-refresh"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh leave data"
            >
              <RefreshIcon />

              <span>
                {refreshing
                  ? "Refreshing"
                  : "Refresh"}
              </span>
            </button>

            <button
              type="button"
              className="se-leave-v2-apply"
              onClick={() =>
                setApplyOpen(true)
              }
            >
              <span className="se-leave-v2-apply-icon">
                <PlusIcon />
              </span>

              <span>
                <small>NEW REQUEST</small>
                <strong>Apply Leave</strong>
              </span>

              <ArrowIcon />
            </button>
          </div>
        </div>

        <div className="se-leave-v2-hero-bottom">
          <div>
            <span>AVAILABLE</span>
            <strong>{availableDays}</strong>
            <small>days</small>
          </div>

          <i />

          <div>
            <span>USED</span>
            <strong>{usedDays}</strong>
            <small>days</small>
          </div>

          <i />

          <div>
            <span>MY PENDING</span>
            <strong>
              {pendingMyRequests.length}
            </strong>
            <small>requests</small>
          </div>

          {managementAvailable ? (
            <>
              <i />

              <button
                type="button"
                className={
                  approvals.length > 0
                    ? "se-leave-v2-approval-stat se-leave-v2-approval-stat--attention"
                    : "se-leave-v2-approval-stat"
                }
                onClick={() =>
                  setActiveTab("approvals")
                }
              >
                <span>TO APPROVE</span>

                <strong>
                  {approvals.length}
                </strong>

                <small>
                  {approvals.length === 1
                    ? "request"
                    : "requests"}
                </small>
              </button>
            </>
          ) : null}
        </div>
      </section>

      {/* ===================================================
          PRIMARY NAVIGATION
      =================================================== */}

      <nav
        className="se-leave-v2-nav"
        aria-label="Leave workspace"
      >
        {navigation.map((item) => (
          <button
            key={item.key}
            type="button"
            className={[
              "se-leave-v2-nav-item",
              activeTab === item.key
                ? "se-leave-v2-nav-item--active"
                : "",
              item.priority
                ? "se-leave-v2-nav-item--priority"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              setActiveTab(item.key)
            }
          >
            <span className="se-leave-v2-nav-icon">
              {item.icon}
            </span>

            <span className="se-leave-v2-nav-copy">
              <strong>{item.label}</strong>
              <small>
                {item.description}
              </small>
            </span>

            {Number(item.count) > 0 ? (
              <span className="se-leave-v2-nav-count">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* ===================================================
          OVERVIEW
      =================================================== */}

      {activeTab === "overview" ? (
        <div className="se-leave-v2-overview">
          {/* BALANCE CARDS */}
          <section className="se-leave-v2-section">
            <div className="se-leave-v2-section-heading">
              <div>
                <span>MY BALANCE</span>
                <h2>Leave balance</h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setApplyOpen(true)
                }
              >
                Apply Leave
                <ArrowIcon />
              </button>
            </div>

           <div className="se-leave-v2-balance-grid">
  {balanceCards.length ? (
    balanceCards.map((balance, index) => {
      const available = balance.available;
      const used = balance.used;

      const total =
        available + used;

      const percentage =
        total > 0
          ? Math.min(
              100,
              Math.max(
                0,
                (available / total) * 100
              )
            )
          : 0;

      return (
        <article
          key={
            balance?._id ||
            balance?.leaveTypeId ||
            balance?.resolvedLeaveType?._id ||
            `${balance.displayCode}-${index}`
          }
          className="se-leave-v2-balance-card"
        >
          <div className="se-leave-v2-balance-top">
            <span className="se-leave-v2-balance-code">
              {balance.displayCode}
            </span>

            <strong>
              {available}
            </strong>
          </div>

          <h3>
            {balance.displayName}
          </h3>

          <div className="se-leave-v2-balance-progress">
            <span
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>

          <div className="se-leave-v2-balance-meta">
            <span>
              <strong>
                {available}
              </strong>{" "}
              available
            </span>

            <span>
              {used} used
            </span>
          </div>
        </article>
      );
    })
  ) : (
    <div className="se-leave-v2-no-balance">
      No leave balance available.
    </div>
  )}
</div>
          </section>

          {/* MANAGER ACTION */}
          {managementAvailable &&
          approvals.length > 0 ? (
            <section className="se-leave-v2-manager-action">
              <div className="se-leave-v2-manager-action-icon">
                <ApprovalIcon />
              </div>

              <div className="se-leave-v2-manager-action-copy">
                <span>ACTION REQUIRED</span>

                <h2>
                  {approvals.length}{" "}
                  {approvals.length === 1
                    ? "leave request"
                    : "leave requests"}{" "}
                  waiting for you
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("approvals")
                }
              >
                Review Requests
                <ArrowIcon />
              </button>
            </section>
          ) : null}

          {/* EXISTING MY LEAVE CONTENT */}
          <section className="se-leave-v2-main-card">
            <MyLeaveOverview
              requests={requests}
              onApply={() =>
                setApplyOpen(true)
              }
              onOpenRequest={
                handleOpenRequest
              }
            />
          </section>
        </div>
      ) : null}

      {/* ===================================================
          MY REQUESTS
      =================================================== */}

      {activeTab === "requests" ? (
        <section className="se-leave-v2-workspace-card">
          <div className="se-leave-v2-workspace-head">
            <div>
              <span>MY LEAVE</span>
              <h2>Leave requests</h2>
            </div>

            <button
              type="button"
              className="se-leave-v2-small-action"
              onClick={() =>
                setApplyOpen(true)
              }
            >
              <PlusIcon />
              Apply Leave
            </button>
          </div>

          <LeaveRequestList
            requests={requests}
            onOpen={handleOpenRequest}
            onCancel={handleCancel}
            onApply={() =>
              setApplyOpen(true)
            }
          />
        </section>
      ) : null}

      {/* ===================================================
          APPROVALS
      =================================================== */}

      {activeTab === "approvals" &&
      managementAvailable ? (
        <section className="se-leave-v2-workspace-card se-leave-v2-workspace-card--approvals">
          <div className="se-leave-v2-workspace-head">
            <div>
              <span>MANAGER WORKSPACE</span>
              <h2>
                Requests awaiting approval
              </h2>
            </div>

            <div className="se-leave-v2-workspace-count">
              <strong>
                {approvals.length}
              </strong>

              <span>
                {approvals.length === 1
                  ? "request"
                  : "requests"}
              </span>
            </div>
          </div>

          {approvals.length ? (
            <LeaveApprovalList
              requests={approvals}
              onReview={
                handleOpenRequest
              }
            />
          ) : (
            <LeaveEmptyState
              title="No approvals pending"
              description="Your approval queue is clear."
            />
          )}
        </section>
      ) : null}

      {/* ===================================================
          TEAM
      =================================================== */}

      {activeTab === "register" &&
      managementAvailable ? (
        <section className="se-leave-v2-workspace-card">
          <div className="se-leave-v2-workspace-head">
            <div>
              <span>TEAM VIEW</span>
              <h2>Team leave register</h2>
            </div>

            <div className="se-leave-v2-workspace-count">
              <strong>
                {register.length}
              </strong>

              <span>records</span>
            </div>
          </div>

          <LeaveRegister
            requests={register}
            onOpen={handleOpenRequest}
          />
        </section>
      ) : null}

      {/* ===================================================
          ADMIN
      =================================================== */}

      {activeTab === "admin" &&
      adminAvailable ? (
        <section className="se-leave-v2-workspace-card">
          <div className="se-leave-v2-workspace-head">
            <div>
              <span>ADMINISTRATION</span>
              <h2>
                Leave balance controls
              </h2>
            </div>
          </div>

          <LeaveBalanceAdmin
            types={types}
            submitting={submitting}
            onSubmit={
              handleBalanceAdjustment
            }
          />
        </section>
      ) : null}

      {/* ===================================================
          APPLY MODAL
      =================================================== */}

      <LeaveApplyModal
        open={applyOpen}
        types={types}
        balances={balances}
        submitting={submitting}
        onClose={() =>
          setApplyOpen(false)
        }
        onSubmit={handleApply}
      />

      {/* ===================================================
          REQUEST / APPROVAL DRAWER
      =================================================== */}

      <LeaveApprovalDrawer
        request={selectedRequest}
        loading={drawerLoading}
        processing={processing}
        onClose={() =>
          setSelectedRequest(null)
        }
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

export default LeavePage;