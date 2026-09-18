import React from "react";

import {
  Navigate,
} from "react-router-dom";

import {
  useAuth,
} from "../auth/AuthContext";

const ProtectedRoute = ({
  children,
}) => {
  const {
    isAuthenticated,
    authLoading,
  } = useAuth();

  if (authLoading) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6f8",
          fontSize: "14px",
          fontWeight: "700",
        }}
      >
        Loading SE-RMS...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;