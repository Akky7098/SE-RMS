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

import LeaveHeader from "./components/LeaveHeader";
import LeaveBalanceCards from "./components/LeaveBalanceCards";
import LeaveTabs from "./components/LeaveTabs";
import MyLeaveOverview from "./components/MyLeaveOverview";
import LeaveRequestList from "./components/LeaveRequestList";
import LeaveApplyModal from "./components/LeaveApplyModal";
import LeaveApprovalList from "./components/LeaveApprovalList";
import LeaveApprovalDrawer from "./components/LeaveApprovalDrawer";
import LeaveRegister from "./components/LeaveRegister";
import LeaveBalanceAdmin from "./components/LeaveBalanceAdmin";
import LeavePolicyView from "./components/LeavePolicyView";
import LeaveEmptyState from "./components/LeaveEmptyState";

/* =========================================================
   LEAVE PAGE

   IMPORTANT:
   Backend remains authoritative for:
   - SELF
   - TEAM
   - DEPARTMENT
   - ALL
   - approval ownership

   UI visibility is convenience only.
========================================================= */

function LeavePage() {
  const currentYear =
    new Date()
      .getFullYear();

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "overview"
  );

  const [
    employee,
    setEmployee,
  ] = useState(null);

  const [
    types,
    setTypes,
  ] = useState([]);

  const [
    balances,
    setBalances,
  ] = useState([]);

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    approvals,
    setApprovals,
  ] = useState([]);

  const [
    register,
    setRegister,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    applyOpen,
    setApplyOpen,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState(null);

  const [
    drawerLoading,
    setDrawerLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState(null);

  /*
   * We intentionally do not hard-code:
   *
   * role === "MANAGER"
   * role === "HEAD"
   *
   * Backend API determines whether scoped/approval
   * data is available.
   */
  const [
    managementAvailable,
    setManagementAvailable,
  ] = useState(false);

  const [
    adminAvailable,
    setAdminAvailable,
  ] = useState(false);

  const showMessage =
    useCallback(
      (
        type,
        text
      ) => {
        setMessage({
          type,
          text,
        });
      },
      []
    );

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setMessage(
            null
          );
        },
        4500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [message]);

  /* =======================================================
     SELF DATA
  ======================================================= */

  const loadSelfData =
    useCallback(
      async () => {
        const result =
          await getMyLeaveDashboard(
            currentYear
          );

        setEmployee(
          result.employee ||
            null
        );

        setTypes(
          result.types ||
            []
        );

        setBalances(
          result.balances ||
            []
        );

        setRequests(
          result.requests ||
            []
        );
      },
      [currentYear]
    );

  /* =======================================================
     MANAGEMENT DATA

     403 means this employee does not have that workspace.
     We don't treat that as a broken page.
  ======================================================= */

  const loadManagementData =
    useCallback(
      async () => {
        try {
          const result =
            await getLeaveApprovalDashboard();

          setApprovals(
            result.pending ||
              []
          );

          setRegister(
            result.register ||
              []
          );

          setManagementAvailable(
            true
          );
        } catch (error) {
          if (
            error?.response
              ?.status === 403
          ) {
            setApprovals(
              []
            );

            setRegister(
              []
            );

            setManagementAvailable(
              false
            );

            return;
          }

          throw error;
        }
      },
      []
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  const loadPage =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!silent) {
          setLoading(
            true
          );
        }

        try {
          await loadSelfData();

          /*
           * Management APIs are isolated so normal
           * employees still get a fully working page.
           */
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
          setLoading(
            false
          );

          setRefreshing(
            false
          );
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
     ADMIN CAPABILITY

     Until your access capability endpoint is connected,
     this remains false.

     Do NOT infer HR/admin merely from employee department.
  ======================================================= */

  useEffect(() => {
    setAdminAvailable(
      false
    );
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh =
    async () => {
      setRefreshing(
        true
      );

      await loadPage({
        silent: true,
      });
    };

  /* =======================================================
     APPLY
  ======================================================= */

  const handleApply =
    async (
      payload
    ) => {
      setSubmitting(
        true
      );

      try {
        await applyLeave(
          payload
        );

        setApplyOpen(
          false
        );

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
        setSubmitting(
          false
        );
      }
    };

  /* =======================================================
     REQUEST DETAILS
  ======================================================= */

  const handleOpenRequest =
    async (
      request
    ) => {
      setSelectedRequest(
        request
      );

      setDrawerLoading(
        true
      );

      try {
        const details =
          await getLeaveRequest(
            request._id
          );

        setSelectedRequest(
          details
        );
      } catch (error) {
        showMessage(
          "error",
          getLeaveErrorMessage(
            error,
            "Unable to load leave request."
          )
        );
      } finally {
        setDrawerLoading(
          false
        );
      }
    };

  /* =======================================================
     APPROVE
  ======================================================= */

  const handleApprove =
    async (
      request,
      comment
    ) => {
      setProcessing(
        true
      );

      try {
        await approveLeave(
          request._id,
          comment
        );

        setSelectedRequest(
          null
        );

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
        setProcessing(
          false
        );
      }
    };

  /* =======================================================
     REJECT
  ======================================================= */

  const handleReject =
    async (
      request,
      comment
    ) => {
      setProcessing(
        true
      );

      try {
        await rejectLeave(
          request._id,
          comment
        );

        setSelectedRequest(
          null
        );

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
        setProcessing(
          false
        );
      }
    };

  /* =======================================================
     CANCEL
  ======================================================= */

  const handleCancel =
    async (
      request
    ) => {
      const reason =
        window.prompt(
          request.status ===
            "APPROVED"
            ? "Why do you want to request cancellation of this approved leave?"
            : "Why do you want to cancel this leave request?"
        );

      if (
        reason === null
      ) {
        return;
      }

      if (
        !reason.trim()
      ) {
        showMessage(
          "error",
          "Cancellation reason is required."
        );

        return;
      }

      setProcessing(
        true
      );

      try {
        const result =
          await cancelLeave(
            request._id,
            reason.trim()
          );

        setSelectedRequest(
          null
        );

        showMessage(
          "success",
          result?.status ===
            "CANCEL_REQUESTED"
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
        setProcessing(
          false
        );
      }
    };

  /* =======================================================
     ADMIN BALANCE ADJUSTMENT
  ======================================================= */

  const handleBalanceAdjustment =
    async (
      payload
    ) => {
      setSubmitting(
        true
      );

      try {
        await adjustLeaveBalance(
          payload
        );

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
        setSubmitting(
          false
        );
      }
    };

  /* =======================================================
     TABS
  ======================================================= */

  const tabs =
    useMemo(() => {
      const result = [
        {
          key:
            "overview",
          label:
            "My Leave",
        },

        {
          key:
            "requests",
          label:
            "My Requests",
          count:
            requests.filter(
              (request) =>
                request.status ===
                "PENDING_APPROVAL"
            ).length,
        },
      ];

      if (
        managementAvailable
      ) {
        result.push(
          {
            key:
              "approvals",
            label:
              "Approvals",
            count:
              approvals.length,
          },
          {
            key:
              "register",
            label:
              "Team / Department",
          }
        );
      }

      result.push({
        key:
          "policy",
        label:
          "Policy",
      });

      if (
        adminAvailable
      ) {
        result.push({
          key:
            "admin",
          label:
            "Administration",
        });
      }

      return result;
    }, [
      requests,
      approvals,
      managementAvailable,
      adminAvailable,
    ]);

  useEffect(() => {
    if (
      !tabs.some(
        (tab) =>
          tab.key ===
          activeTab
      )
    ) {
      setActiveTab(
        "overview"
      );
    }
  }, [
    tabs,
    activeTab,
  ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="se-leave-page">
        <div className="se-leave-loading">
          <div className="se-leave-loading-mark">
            LV
          </div>

          <strong>
            Loading Leave Management
          </strong>

          <span>
            Preparing balances,
            requests and approvals...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="se-leave-page">
      {message ? (
        <div
          className={`se-leave-toast se-leave-toast--${message.type}`}
          role="status"
        >
          <span>
            {message.type ===
            "success"
              ? "✓"
              : "!"}
          </span>

          <p>
            {message.text}
          </p>

          <button
            type="button"
            onClick={() =>
              setMessage(
                null
              )
            }
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <LeaveHeader
        employee={
          employee
        }
        year={
          currentYear
        }
        onApply={() =>
          setApplyOpen(
            true
          )
        }
        refreshing={
          refreshing
        }
        onRefresh={
          handleRefresh
        }
      />

      <LeaveBalanceCards
        balances={
          balances
        }
      />

      <div className="se-leave-workspace">
        <LeaveTabs
          tabs={tabs}
          activeTab={
            activeTab
          }
          onChange={
            setActiveTab
          }
        />

        <main className="se-leave-content">
          {activeTab ===
          "overview" ? (
            <MyLeaveOverview
              requests={
                requests
              }
              onApply={() =>
                setApplyOpen(
                  true
                )
              }
              onOpenRequest={
                handleOpenRequest
              }
            />
          ) : null}

          {activeTab ===
          "requests" ? (
            <LeaveRequestList
              requests={
                requests
              }
              onOpen={
                handleOpenRequest
              }
              onCancel={
                handleCancel
              }
              onApply={() =>
                setApplyOpen(
                  true
                )
              }
            />
          ) : null}

          {activeTab ===
          "approvals" ? (
            <LeaveApprovalList
              requests={
                approvals
              }
              onReview={
                handleOpenRequest
              }
            />
          ) : null}

          {activeTab ===
          "register" ? (
            <LeaveRegister
              requests={
                register
              }
              onOpen={
                handleOpenRequest
              }
            />
          ) : null}

          {activeTab ===
          "policy" ? (
            <LeavePolicyView
              types={
                types
              }
            />
          ) : null}

          {activeTab ===
          "admin" &&
          adminAvailable ? (
            <LeaveBalanceAdmin
              types={
                types
              }
              submitting={
                submitting
              }
              onSubmit={
                handleBalanceAdjustment
              }
            />
          ) : null}

          {![
            "overview",
            "requests",
            "approvals",
            "register",
            "policy",
            "admin",
          ].includes(
            activeTab
          ) ? (
            <LeaveEmptyState
              title="Section unavailable"
              description="This Leave Management section is not available."
            />
          ) : null}
        </main>
      </div>

      <LeaveApplyModal
        open={
          applyOpen
        }
        types={
          types
        }
        balances={
          balances
        }
        submitting={
          submitting
        }
        onClose={() =>
          setApplyOpen(
            false
          )
        }
        onSubmit={
          handleApply
        }
      />

      <LeaveApprovalDrawer
        request={
          selectedRequest
        }
        loading={
          drawerLoading
        }
        processing={
          processing
        }
        onClose={() =>
          setSelectedRequest(
            null
          )
        }
        onApprove={
          handleApprove
        }
        onReject={
          handleReject
        }
      />
    </div>
  );
}

export default LeavePage;