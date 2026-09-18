import React from "react";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import {
  GoogleOAuthProvider,
} from "@react-oauth/google";

import {
  AuthProvider,
} from "./auth/AuthContext";

import AppRoutes from "./routes/AppRoutes";

import CandidateSelectionPortal from "./pages/Recruitment/CandidatePortal/CandidateSelectionPortal";

import "./App.css";

/* =========================================================
   INTERNAL ERP
========================================================= */

const InternalErpApp =
  () => {
    return (
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    );
  };

/* =========================================================
   APP
========================================================= */

function App() {
  const googleClientId =
    process.env
      .REACT_APP_GOOGLE_CLIENT_ID ||
    "";

  return (
    <GoogleOAuthProvider
      clientId={
        googleClientId
      }
    >
      <BrowserRouter>
        <Routes>

          {/* ===============================================
              PUBLIC CANDIDATE PORTAL

              OUTSIDE AUTH PROVIDER
              OUTSIDE ERP
          ================================================ */}

          <Route
            path="/candidate/selection/:token"
            element={
              <CandidateSelectionPortal />
            }
          />

          <Route
            path="/candidate"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

          <Route
            path="/candidate/selection"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

          {/* ===============================================
              INTERNAL SE-RMS
          ================================================ */}

          <Route
            path="/*"
            element={
              <InternalErpApp />
            }
          />

        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;