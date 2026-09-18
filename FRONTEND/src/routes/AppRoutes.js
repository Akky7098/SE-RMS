import React from "react";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

/* =========================================================
   PUBLIC
========================================================= */

import LoginPage from "../pages/Login/LoginPage";

/* =========================================================
   DASHBOARD
========================================================= */

import DashboardPage from "../pages/Dashboard/DashboardPage";

/* =========================================================
   PEOPLE — DETAIL WORKSPACES
========================================================= */

import EmployeeDetailPage from "../pages/People/Employees/EmployeeDetailPage";

import EmployeeFormPage from "../pages/People/Employees/EmployeeFormPage";

import EmployeeDocumentVaultPage from "../pages/People/Employees/EmployeeDocumentVaultPage";

import EmployeeHierarchyPage from "../pages/People/Employees/EmployeeHierarchyPage";

import EmployeeOnboardingPage from "../pages/People/Onboarding/EmployeeOnboardingPage";

/* =========================================================
   TIMESHEET

   Attendance + Shift + Leave are rendered inside
   DashboardPage using:

   /dashboard?app=people&page=attendance
   /dashboard?app=people&page=leave
   /dashboard?app=people&page=shifts

   Therefore DO NOT import standalone AttendancePage,
   LeavePage or ShiftPage here.
========================================================= */

import TimesheetPage from "../pages/Timesheet/TimesheetPage";

/* =========================================================
   ROUTE GUARD
========================================================= */

import ProtectedRoute from "./ProtectedRoute";

/* =========================================================
   APP ROUTES
========================================================= */

const AppRoutes = () => {
  return (
    <Routes>

      {/* =====================================================
          ROOT
      ====================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* =====================================================
          LOGIN
      ====================================================== */}

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />

      {/* =====================================================
          MAIN DASHBOARD SHELL

          People:
          /dashboard?app=people&page=overview
          /dashboard?app=people&page=employees
          /dashboard?app=people&page=onboarding
          /dashboard?app=people&page=attendance
          /dashboard?app=people&page=leave
          /dashboard?app=people&page=shifts
      ====================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          PEOPLE OVERVIEW

          Rendered inside DashboardPage.
      ====================================================== */}

      <Route
        path="/people"
        element={
          <Navigate
            to="/dashboard?app=people&page=overview"
            replace
          />
        }
      />

      {/* =====================================================
          EMPLOYEE DIRECTORY

          Rendered inside DashboardPage.
      ====================================================== */}

      <Route
        path="/people/employees"
        element={
          <Navigate
            to="/dashboard?app=people&page=employees"
            replace
          />
        }
      />

      {/* =====================================================
          ONBOARDING REGISTER

          Rendered inside DashboardPage.
      ====================================================== */}

      <Route
        path="/people/onboarding"
        element={
          <Navigate
            to="/dashboard?app=people&page=onboarding"
            replace
          />
        }
      />

      {/* =====================================================
          ATTENDANCE

          AttendancePage itself is rendered by DashboardPage
          for:

          app=people
          page=attendance

          Keep standalone URLs as legacy redirects.
      ====================================================== */}

      <Route
        path="/attendance"
        element={
          <Navigate
            to="/dashboard?app=people&page=attendance"
            replace
          />
        }
      />

      <Route
        path="/people/attendance"
        element={
          <Navigate
            to="/dashboard?app=people&page=attendance"
            replace
          />
        }
      />

      {/* =====================================================
          LEAVE MANAGEMENT

          LeavePage itself is rendered by DashboardPage for:

          app=people
          page=leave

          Main URL:
          /dashboard?app=people&page=leave

          Keep standalone URLs as redirects so old links
          and direct navigation still enter the People shell.
      ====================================================== */}

      <Route
        path="/leave"
        element={
          <Navigate
            to="/dashboard?app=people&page=leave"
            replace
          />
        }
      />

      <Route
        path="/people/leave"
        element={
          <Navigate
            to="/dashboard?app=people&page=leave"
            replace
          />
        }
      />

      {/* =====================================================
          SHIFT MANAGEMENT

          Also rendered inside the People dashboard shell.

          Normal employee:
          → My Shift

          Manager:
          → Team visibility according to backend scope

          Head:
          → Department roster

          HR / Super Admin:
          → Review / publish / shift master according to
            permissions
      ====================================================== */}

      <Route
        path="/shifts"
        element={
          <Navigate
            to="/dashboard?app=people&page=shifts"
            replace
          />
        }
      />

      <Route
        path="/people/shifts"
        element={
          <Navigate
            to="/dashboard?app=people&page=shifts"
            replace
          />
        }
      />

      {/* =====================================================
          CREATE EMPLOYEE

          IMPORTANT:
          Keep specific routes before :employeeId.
      ====================================================== */}

      <Route
        path="/people/employees/new"
        element={
          <ProtectedRoute>
            <EmployeeFormPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EDIT EMPLOYEE
      ====================================================== */}

      <Route
        path="/people/employees/:employeeId/edit"
        element={
          <ProtectedRoute>
            <EmployeeFormPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE ONBOARDING
      ====================================================== */}

      <Route
        path="/people/employees/:employeeId/onboarding"
        element={
          <ProtectedRoute>
            <EmployeeOnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE DOCUMENT VAULT

          IMPORTANT:
          This route MUST exist before the generic
          :employeeId Employee Detail route.
      ====================================================== */}

      <Route
        path="/people/employees/:employeeId/documents"
        element={
          <ProtectedRoute>
            <EmployeeDocumentVaultPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE HIERARCHY

          Keep before generic employee detail route.
      ====================================================== */}

      <Route
        path="/people/employees/:employeeId/hierarchy"
        element={
          <ProtectedRoute>
            <EmployeeHierarchyPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          EMPLOYEE DETAIL

          Generic employee route stays AFTER:
          /new
          /edit
          /onboarding
          /documents
          /hierarchy
      ====================================================== */}

      <Route
        path="/people/employees/:employeeId"
        element={
          <ProtectedRoute>
            <EmployeeDetailPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          LEGACY EMPLOYEE ROUTES
      ====================================================== */}

      <Route
        path="/employees"
        element={
          <Navigate
            to="/dashboard?app=people&page=employees"
            replace
          />
        }
      />

      <Route
        path="/employees/:employeeId"
        element={
          <Navigate
            to="/dashboard?app=people&page=employees"
            replace
          />
        }
      />

      {/* =====================================================
          TIMESHEET

          Keep existing route unchanged for now.
      ====================================================== */}

      <Route
        path="/timesheet"
        element={
          <ProtectedRoute>
            <TimesheetPage />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          FALLBACK

          Only genuinely unknown URLs should reach here.
      ====================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

    </Routes>
  );
};

export default AppRoutes;