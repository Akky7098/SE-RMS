import React, {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  forgotPassword,
} from "../../services/authService";

import "./ForgotPasswordWeb.css";

const ForgotPasswordWeb =
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
            "Enter your company email."
          );

          return;
        }

        try {
          setLoading(true);
          setError("");
          setMessage("");

          const response =
            await forgotPassword(
              email.trim()
            );

          setMessage(
            response?.data
              ?.message ||
              "If the account exists, a reset link has been sent."
          );
        } catch (
          requestError
        ) {
          setError(
            requestError?.response
              ?.data?.message ||
              "Unable to process password reset."
          );
        } finally {
          setLoading(false);
        }
      };

    return (
      <main className="se-web-forgot-page">
        <div className="se-web-forgot-background" />

        <div className="se-web-forgot-overlay" />

        <section className="se-web-forgot-card">
          <img
            src="/se-logo.png"
            alt="Sandeep Edgetech"
            className="se-web-forgot-logo"
          />

          <span className="se-web-forgot-eyebrow">
            ACCOUNT RECOVERY
          </span>

          <h1>
            Reset your password
          </h1>

          <p className="se-web-forgot-description">
            Enter your registered
            company email. We'll send
            password reset
            instructions if the
            account is eligible.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
          >
            <label htmlFor="se-web-forgot-email">
              Company email
            </label>

            <input
              id="se-web-forgot-email"
              type="email"
              value={email}
              disabled={
                loading
              }
              placeholder="name@sandeepedgetech.com"
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
              <div className="se-web-forgot-error">
                {error}
              </div>
            ) : null}

            {message ? (
              <div className="se-web-forgot-success">
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
            className="se-web-forgot-back"
            onClick={() =>
              navigate(
                "/login"
              )
            }
          >
            ← Back to sign in
          </button>
        </section>
      </main>
    );
  };

export default ForgotPasswordWeb;