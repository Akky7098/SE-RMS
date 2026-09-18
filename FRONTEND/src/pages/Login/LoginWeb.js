import React, {
  useEffect,
  useMemo,
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

import "./LoginWeb.css";

const LoginWeb = () => {
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
    isLoggingIn,
    setIsLoggingIn,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    slideIndex,
    setSlideIndex,
  ] = useState(0);

  /* =========================================================
     COMPANY UPDATE SLIDES
  ========================================================= */

  const slides =
    useMemo(
      () => [
        {
          eyebrow:
            "ONE CONNECTED PLATFORM",

          title:
            "One system for the entire organisation.",

          description:
            "People, attendance, timesheets, operations and business workflows connected through a single secure platform.",

          statistic:
            "SE-RMS",

          statisticLabel:
            "Enterprise Resource Management",
        },

        {
          eyebrow:
            "WORKFORCE",

          title:
            "Employee operations without fragmented systems.",

          description:
            "Organisation hierarchy, attendance, approvals and timesheets built around actual reporting structures.",

          statistic:
            "01",

          statisticLabel:
            "Employee identity across modules",
        },

        {
          eyebrow:
            "OPERATIONS",

          title:
            "Built for manufacturing workflows.",

          description:
            "SE-RMS will connect manufacturing, quality, dispatch, inventory and future Industry 4.0 information.",

          statistic:
            "4.0",

          statisticLabel:
            "Industry-ready architecture",
        },

        {
          eyebrow:
            "MANAGEMENT",

          title:
            "The right information for the right person.",

          description:
            "Role permissions and data scopes ensure employees, managers, heads and administrators see only what they need.",

          statistic:
            "360°",

          statisticLabel:
            "Organisation visibility",
        },
      ],
      []
    );

  /* =========================================================
     SLIDE ROTATION
  ========================================================= */

  useEffect(() => {
    const timer =
      window.setInterval(
        () => {
          setSlideIndex(
            (current) =>
              (current + 1) %
              slides.length
          );
        },
        5500
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [slides.length]);

  /* =========================================================
     AUTH REDIRECT
  ========================================================= */

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

  /* =========================================================
     PASSWORD LOGIN
  ========================================================= */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (isLoggingIn) {
        return;
      }

      setErrorMessage("");

      if (
        !email.trim() ||
        !password
      ) {
        setErrorMessage(
          "Enter your company email and password."
        );

        return;
      }

      try {
        setIsLoggingIn(
          true
        );

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
            "Login failed. Please check your credentials."
        );
      } finally {
        setIsLoggingIn(
          false
        );
      }
    };

  /* =========================================================
     GOOGLE LOGIN
  ========================================================= */

  const handleGoogleSuccess =
    async (
      credentialResponse
    ) => {
      const credential =
        credentialResponse
          ?.credential;

      if (!credential) {
        setErrorMessage(
          "Google sign-in did not return a valid credential."
        );

        return;
      }

      try {
        setIsLoggingIn(
          true
        );

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
            error?.message ||
            "Google sign-in failed."
        );
      } finally {
        setIsLoggingIn(
          false
        );
      }
    };

  const currentSlide =
    slides[slideIndex];

  /* =========================================================
     RENDER
  ========================================================= */

  return (
  <main className="se-web-login-page">
    <div
      className="se-web-login-backdrop"
      style={{
        backgroundImage: "url('/se-factory.jpg')",
      }}
    />

    <div className="se-web-login-shade" />

      <section className="se-web-login-shell">
        {/* ================================================
            LEFT - LOGIN
        ================================================= */}

        <div className="se-web-login-auth">
          <div className="se-web-login-brand">
            <img
              src="/se-logo.png"
              alt="Sandeep Edgetech"
              className="se-web-login-logo"
            />

            <div>
              <span className="se-web-login-product">
                SE-RMS
              </span>

              <span className="se-web-login-product-sub">
                Enterprise Resource
                Management
              </span>
            </div>
          </div>

          <div className="se-web-login-heading">
            <span className="se-web-login-eyebrow">
              SECURE WORKSPACE
            </span>

            <h1>
              Welcome back
            </h1>

            <p>
              Sign in to continue
              to your Sandeep
              Edgetech workspace.
            </p>
          </div>

          <form
            className="se-web-login-form"
            onSubmit={
              handleSubmit
            }
          >
            <div className="se-web-login-field">
              <label htmlFor="se-web-email">
                Company email
              </label>

              <input
                id="se-web-email"
                type="email"
                value={email}
                disabled={
                  isLoggingIn
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

            <div className="se-web-login-field">
              <div className="se-web-login-password-label">
                <label htmlFor="se-web-password">
                  Password
                </label>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/forgot-password"
                    )
                  }
                  className="se-web-login-forgot"
                >
                  Forgot password?
                </button>
              </div>

              <div className="se-web-login-password-box">
                <input
                  id="se-web-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  disabled={
                    isLoggingIn
                  }
                  placeholder="Enter password"
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
                  className="se-web-login-password-toggle"
                  disabled={
                    isLoggingIn
                  }
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
              <div className="se-web-login-error">
                {errorMessage}
              </div>
            ) : null}

            <button
              className="se-web-login-primary"
              type="submit"
              disabled={
                isLoggingIn
              }
            >
              <span>
                {isLoggingIn
                  ? "Signing in..."
                  : "Sign in to SE-RMS"}
              </span>

              {!isLoggingIn ? (
                <span className="se-web-login-arrow">
                  →
                </span>
              ) : null}
            </button>

            <div className="se-web-login-divider">
              <span />
              <p>
                OR CONTINUE WITH
              </p>
              <span />
            </div>

            <div className="se-web-login-google">
              <GoogleLogin
                onSuccess={
                  handleGoogleSuccess
                }
                onError={() =>
                  setErrorMessage(
                    "Google sign-in was cancelled or failed."
                  )
                }
                useOneTap={
                  false
                }
                theme="outline"
                size="large"
                width="360"
                text="continue_with"
                shape="rectangular"
              />
            </div>

            <p className="se-web-login-domain-note">
              Google sign-in is
              restricted to authorised{" "}
              <strong>
                @sandeepedgetech.com
              </strong>{" "}
              accounts.
            </p>
          </form>

          <div className="se-web-login-footer">
            <span>
              Sandeep Edgetech
              Pvt. Ltd.
            </span>

            <span className="se-web-login-footer-dot">
              •
            </span>

            <span>
              Secure internal
              platform
            </span>
          </div>
        </div>

        {/* ================================================
            RIGHT - COMPANY / PRODUCT SLIDES
        ================================================= */}

        <aside className="se-web-login-insight">
          <div className="se-web-login-insight-top">
            <span>
              SANDEEP EDGETECH
            </span>

            <span className="se-web-login-live">
              INTERNAL
            </span>
          </div>

          <div
            className="se-web-login-slide"
            key={
              slideIndex
            }
          >
            <span className="se-web-login-slide-eyebrow">
              {
                currentSlide.eyebrow
              }
            </span>

            <h2>
              {
                currentSlide.title
              }
            </h2>

            <p>
              {
                currentSlide.description
              }
            </p>

            <div className="se-web-login-slide-stat">
              <strong>
                {
                  currentSlide.statistic
                }
              </strong>

              <span>
                {
                  currentSlide.statisticLabel
                }
              </span>
            </div>
          </div>

          <div className="se-web-login-slide-dots">
            {slides.map(
              (
                slide,
                index
              ) => (
                <button
                  key={
                    slide.eyebrow
                  }
                  type="button"
                  aria-label={`Show slide ${
                    index + 1
                  }`}
                  className={
                    index ===
                    slideIndex
                      ? "se-web-login-dot active"
                      : "se-web-login-dot"
                  }
                  onClick={() =>
                    setSlideIndex(
                      index
                    )
                  }
                />
              )
            )}
          </div>

          <div className="se-web-login-insight-bottom">
            <span className="se-web-login-insight-line" />

            <p>
              Built around the
              organisation. Designed
              to scale with the
              business.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default LoginWeb;