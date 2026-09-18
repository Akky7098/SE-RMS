import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  GoogleLogin,
} from "@react-oauth/google";

import {
  useAuth,
} from "../../auth/AuthContext";

import "./LoginPwa.css";

const LoginPwa = () => {
  const navigate =
    useNavigate();

  const {
    login,
    googleLogin,
    isAuthenticated,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    }
  }, [
    isAuthenticated,
    navigate,
  ]);

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (loading) {
        return;
      }

      setErrorMessage("");

      if (
        !email.trim() ||
        !password
      ) {
        setErrorMessage(
          "Enter email and password."
        );

        return;
      }

      try {
        setLoading(true);

        await login(
          email,
          password
        );

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (error) {
        setErrorMessage(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Unable to sign in."
        );
      } finally {
        setLoading(false);
      }
    };

  const handleGoogleSuccess =
    async (
      googleResponse
    ) => {
      const credential =
        googleResponse
          ?.credential;

      if (!credential) {
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");

        await googleLogin(
          credential
        );

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (error) {
        setErrorMessage(
          error?.response?.data
            ?.message ||
            "Google sign-in failed."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
   <main className="se-pwa-login-page">
  <div
    className="se-pwa-login-background"
    style={{
      backgroundImage: "url('/se-factory.jpg')",
    }}
  />

  <div className="se-pwa-login-overlay" />

      <section className="se-pwa-login-content">
        <div className="se-pwa-login-top">
          <img
            src="/se-logo.png"
            alt="Sandeep Edgetech"
            className="se-pwa-login-logo"
          />

          <span className="se-pwa-login-system-name">
            SE-RMS
          </span>
        </div>

        <form
          className="se-pwa-login-card"
          onSubmit={
            handleSubmit
          }
        >
          <span className="se-pwa-login-eyebrow">
            SECURE WORKSPACE
          </span>

          <h1>
            Welcome back
          </h1>

          <p className="se-pwa-login-subtitle">
            Access your SE-RMS
            workspace securely.
          </p>

          <div className="se-pwa-login-field">
            <label htmlFor="se-pwa-email">
              Company email
            </label>

            <input
              id="se-pwa-email"
              type="email"
              value={email}
              disabled={
                loading
              }
              placeholder="name@sandeepedgetech.com"
              autoComplete="email"
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
            />
          </div>

          <div className="se-pwa-login-field">
            <div className="se-pwa-login-password-heading">
              <label htmlFor="se-pwa-password">
                Password
              </label>

              <button
                type="button"
                className="se-pwa-login-forgot"
                onClick={() =>
                  navigate(
                    "/forgot-password"
                  )
                }
              >
                Forgot?
              </button>
            </div>

            <div className="se-pwa-login-password">
              <input
                id="se-pwa-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                disabled={
                  loading
                }
                placeholder="Password"
                autoComplete="current-password"
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="se-pwa-login-error">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            className="se-pwa-login-submit"
            disabled={
              loading
            }
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>

          <div className="se-pwa-login-separator">
            <span />
            <p>OR</p>
            <span />
          </div>

          <div className="se-pwa-login-google">
            <GoogleLogin
              onSuccess={
                handleGoogleSuccess
              }
              onError={() =>
                setErrorMessage(
                  "Google sign-in failed."
                )
              }
              width="300"
              theme="outline"
              size="large"
              text="continue_with"
            />
          </div>

          <p className="se-pwa-login-company">
            Sandeep Edgetech
            Pvt. Ltd.
          </p>
        </form>
      </section>
    </main>
  );
};

export default LoginPwa;