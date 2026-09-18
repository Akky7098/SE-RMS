import React, {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  forgotPassword,
} from "../../services/authService";

import "./ForgotPasswordPwa.css";

const ForgotPasswordPwa =
  () => {
    const navigate =
      useNavigate();

    const [email, setEmail] =
      useState("");

    const [
      loading,
      setLoading,
    ] = useState(false);

    const [
      message,
      setMessage,
    ] = useState("");

    const [
      error,
      setError,
    ] = useState("");

    const handleSubmit =
      async (event) => {
        event.preventDefault();

        if (!email.trim()) {
          setError(
            "Enter your email."
          );

          return;
        }

        try {
          setLoading(true);
          setError("");

          const response =
            await forgotPassword(
              email.trim()
            );

          setMessage(
            response?.data
              ?.message ||
              "Reset instructions have been requested."
          );
        } catch (
          requestError
        ) {
          setError(
            requestError?.response
              ?.data?.message ||
              "Request failed."
          );
        } finally {
          setLoading(false);
        }
      };

    return (
      <main className="se-pwa-forgot-page">
        <div className="se-pwa-forgot-background" />
        <div className="se-pwa-forgot-overlay" />

        <section className="se-pwa-forgot-content">
          <img
            src="/se-logo.png"
            alt="Sandeep Edgetech"
            className="se-pwa-forgot-logo"
          />

          <div className="se-pwa-forgot-card">
            <span className="se-pwa-forgot-eyebrow">
              PASSWORD RECOVERY
            </span>

            <h1>
              Forgot password?
            </h1>

            <p>
              Enter your registered
              company email.
            </p>

            <form
              onSubmit={
                handleSubmit
              }
            >
              <input
                type="email"
                value={email}
                disabled={
                  loading
                }
                placeholder="Company email"
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target
                      .value
                  )
                }
              />

              {error ? (
                <div className="se-pwa-forgot-error">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="se-pwa-forgot-success">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  loading
                }
              >
                {loading
                  ? "Sending..."
                  : "Send reset link"}
              </button>
            </form>

            <button
              type="button"
              className="se-pwa-forgot-back"
              onClick={() =>
                navigate(
                  "/login"
                )
              }
            >
              Back to sign in
            </button>
          </div>
        </section>
      </main>
    );
  };

export default ForgotPasswordPwa;