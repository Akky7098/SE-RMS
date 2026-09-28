import React, {
  useEffect,
  useMemo,
  useRef,
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

import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "../../services/authService";

import "./LoginWeb.css";

const RESET_STEPS = {
  EMAIL: "EMAIL",
  OTP: "OTP",
  PASSWORD: "PASSWORD",
  SUCCESS: "SUCCESS",
};

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

  const [password, setPassword] =
    useState("");

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
     PASSWORD RESET MODAL
  ========================================================= */

  const [
    resetOpen,
    setResetOpen,
  ] = useState(false);

  const [
    resetStep,
    setResetStep,
  ] = useState(
    RESET_STEPS.EMAIL
  );

  const [
    resetEmail,
    setResetEmail,
  ] = useState("");

  const [
    resetOtp,
    setResetOtp,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    resetLoading,
    setResetLoading,
  ] = useState(false);

  const [
    resetError,
    setResetError,
  ] = useState("");

  const [
    resetMessage,
    setResetMessage,
  ] = useState("");

  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0);

  const otpInputRef =
    useRef(null);

  /* =========================================================
     COMPANY / PRODUCT SLIDES
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
            "SE-RMS connects workforce operations with manufacturing-ready business processes and future Industry 4.0 information.",

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
              (
                current + 1
              ) %
              slides.length
          );
        },
        5500
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    slides.length,
  ]);

  /* =========================================================
     AUTH REDIRECT
  ========================================================= */

  useEffect(() => {
    if (
      isAuthenticated
    ) {
      navigate(
        "/dashboard",
        {
          replace:
            true,
        }
      );
    }
  }, [
    isAuthenticated,
    navigate,
  ]);

  /* =========================================================
     RESET COUNTDOWN
  ========================================================= */

  useEffect(() => {
    if (
      resendSeconds <= 0
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(
        () => {
          setResendSeconds(
            (current) =>
              Math.max(
                0,
                current - 1
              )
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, [
    resendSeconds,
  ]);

  /* =========================================================
     MODAL KEYBOARD / BODY LOCK
  ========================================================= */

  useEffect(() => {
    if (!resetOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key ===
          "Escape" &&
        !resetLoading
      ) {
        closeResetModal();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    resetOpen,
    resetLoading,
  ]);

  /* =========================================================
     PASSWORD LOGIN
  ========================================================= */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        isLoggingIn
      ) {
        return;
      }

      setErrorMessage("");

      if (
        !email.trim() ||
        !password
      ) {
        setErrorMessage(
          "Enter your registered email address and password."
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
            replace:
              true,
          }
        );
      } catch (
        error
      ) {
        setErrorMessage(
          error
            ?.response
            ?.data
            ?.message ||
            error
              ?.message ||
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

      if (
        !credential
      ) {
        setErrorMessage(
          "Google sign-in did not return a valid credential."
        );

        return;
      }

      try {
        setIsLoggingIn(
          true
        );

        setErrorMessage(
          ""
        );

        await googleLogin(
          credential
        );

        navigate(
          "/dashboard",
          {
            replace:
              true,
          }
        );
      } catch (
        error
      ) {
        setErrorMessage(
          error
            ?.response
            ?.data
            ?.message ||
            error
              ?.message ||
            "Google sign-in failed."
        );
      } finally {
        setIsLoggingIn(
          false
        );
      }
    };

  /* =========================================================
     RESET HELPERS
  ========================================================= */

  const resetRecoveryState =
    () => {
      setResetStep(
        RESET_STEPS.EMAIL
      );

      setResetOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setShowNewPassword(
        false
      );

      setShowConfirmPassword(
        false
      );

      setResetLoading(
        false
      );

      setResetError("");
      setResetMessage("");

      setResendSeconds(
        0
      );
    };

  const openResetModal =
    () => {
      resetRecoveryState();

      setResetEmail(
        email
          .trim()
          .toLowerCase()
      );

      setResetOpen(
        true
      );
    };

  const closeResetModal =
    () => {
      if (
        resetLoading
      ) {
        return;
      }

      setResetOpen(
        false
      );

      window.setTimeout(
        () => {
          resetRecoveryState();
        },
        180
      );
    };

  const getResetError =
    (
      error,
      fallback
    ) =>
      error
        ?.response
        ?.data
        ?.message ||
      error
        ?.message ||
      fallback;

  /* =========================================================
     REQUEST WHATSAPP OTP
  ========================================================= */

  const handleRequestOtp =
    async (
      event
    ) => {
      event?.preventDefault();

      if (
        resetLoading
      ) {
        return;
      }

      const normalizedEmail =
        resetEmail
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail
      ) {
        setResetError(
          "Enter your registered email address."
        );

        return;
      }

      try {
        setResetLoading(
          true
        );

        setResetError("");
        setResetMessage("");

        await requestPasswordResetOtp(
          normalizedEmail
        );

        setResetEmail(
          normalizedEmail
        );

        setResetOtp("");

        setResetStep(
          RESET_STEPS.OTP
        );

        setResetMessage(
          "If the account is eligible for recovery, a 6-digit verification code has been sent to the registered WhatsApp number."
        );

        setResendSeconds(
          30
        );

        window.setTimeout(
          () => {
            otpInputRef
              .current
              ?.focus();
          },
          100
        );
      } catch (
        error
      ) {
        setResetError(
          getResetError(
            error,
            "Unable to start password recovery. Please try again."
          )
        );
      } finally {
        setResetLoading(
          false
        );
      }
    };

  /* =========================================================
     RESEND OTP
  ========================================================= */

  const handleResendOtp =
    async () => {
      if (
        resetLoading ||
        resendSeconds > 0
      ) {
        return;
      }

      try {
        setResetLoading(
          true
        );

        setResetError("");
        setResetMessage("");

        await requestPasswordResetOtp(
          resetEmail
        );

        setResetOtp("");

        setResetMessage(
          "A new verification code has been sent to your registered WhatsApp number."
        );

        setResendSeconds(
          30
        );

        window.setTimeout(
          () => {
            otpInputRef
              .current
              ?.focus();
          },
          100
        );
      } catch (
        error
      ) {
        setResetError(
          getResetError(
            error,
            "Unable to resend the verification code."
          )
        );
      } finally {
        setResetLoading(
          false
        );
      }
    };

  /* =========================================================
     VERIFY OTP
  ========================================================= */

 const handleVerifyOtp =
  async (
    event
  ) => {
    event.preventDefault();

    if (
      resetLoading
    ) {
      return;
    }

    const normalizedEmail =
      resetEmail
        .trim()
        .toLowerCase();

    const normalizedOtp =
      String(
        resetOtp || ""
      )
        .replace(
          /\D/g,
          ""
        )
        .slice(
          0,
          6
        );

    if (
      !normalizedEmail
    ) {
      setResetError(
        "Email address is missing. Please restart password recovery."
      );

      return;
    }

    if (
      normalizedOtp.length !==
      6
    ) {
      setResetError(
        "Enter the complete 6-digit verification code."
      );

      return;
    }

    try {
      setResetLoading(
        true
      );

      setResetError("");
      setResetMessage("");

      await verifyPasswordResetOtp({
        email:
          normalizedEmail,

        otp:
          normalizedOtp,
      });

      setResetOtp(
        normalizedOtp
      );

      setResetStep(
        RESET_STEPS.PASSWORD
      );

      setResetMessage(
        "WhatsApp verification successful. Create your new SE-RMS password."
      );
    } catch (
      error
    ) {
      setResetError(
        getResetError(
          error,
          "The verification code is incorrect or has expired."
        )
      );
    } finally {
      setResetLoading(
        false
      );
    }
  };

  /* =========================================================
     SET NEW PASSWORD
  ========================================================= */

  const handleResetPassword =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        resetLoading
      ) {
        return;
      }

      setResetError("");

      if (
        !newPassword
      ) {
        setResetError(
          "Enter your new password."
        );

        return;
      }

      if (
        newPassword.length <
        8
      ) {
        setResetError(
          "Password must contain at least 8 characters."
        );

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setResetError(
          "New password and confirm password do not match."
        );

        return;
      }

      try {
        setResetLoading(
          true
        );

        setResetMessage("");

        await resetPasswordWithOtp({
          email:
            resetEmail,

          otp:
            resetOtp,

          newPassword,
        });

        setPassword("");

        setResetStep(
          RESET_STEPS.SUCCESS
        );

        setResetMessage("");
      } catch (
        error
      ) {
        setResetError(
          getResetError(
            error,
            "Unable to update your password. Please request a new verification code and try again."
          )
        );
      } finally {
        setResetLoading(
          false
        );
      }
    };

  const handleReturnToLogin =
    () => {
      setEmail(
        resetEmail
      );

      setResetOpen(
        false
      );

      resetRecoveryState();
    };

  /* =========================================================
     OTP INPUT
  ========================================================= */

  const handleOtpChange =
    (
      event
    ) => {
      const value =
        event.target.value
          .replace(
            /\D/g,
            ""
          )
          .slice(
            0,
            6
          );

      setResetOtp(
        value
      );

      setResetError(
        ""
      );
    };

  /* =========================================================
     CURRENT SLIDE
  ========================================================= */

  const currentSlide =
    slides[
      slideIndex
    ];

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <main
        className="se-web-login-page"
      >
        <div
          className="se-web-login-backdrop"
          style={{
            backgroundImage:
              "url('/se-factory.jpg')",
          }}
        />

        <div
          className="se-web-login-shade"
        />

        <section
          className="se-web-login-shell"
        >
          {/* ================================================
              LEFT - AUTHENTICATION
          ================================================= */}

          <div
            className="se-web-login-auth"
          >
            <div
              className="se-web-login-brand"
            >
              <img
                src="/se-logo.png"
                alt="Sandeep Edgetech"
                className="se-web-login-logo"
              />

              <div
                className="se-web-login-brand-copy"
              >
                <span
                  className="se-web-login-product"
                >
                  SE-RMS
                </span>

                <span
                  className="se-web-login-product-sub"
                >
                  Enterprise Resource
                  Management
                </span>
              </div>
            </div>

            <div
              className="se-web-login-heading"
            >
              <span
                className="se-web-login-eyebrow"
              >
                SECURE WORKSPACE
              </span>

              <h1>
                Welcome back
              </h1>

              <p>
                Sign in to access your
                Sandeep Edgetech workspace
                securely.
              </p>
            </div>

            <form
              className="se-web-login-form"
              onSubmit={
                handleSubmit
              }
            >
              <div
                className="se-web-login-field"
              >
                <label
                  htmlFor="se-web-email"
                >
                  Registered email
                </label>

                <input
                  id="se-web-email"
                  type="email"
                  value={
                    email
                  }
                  disabled={
                    isLoggingIn
                  }
                  placeholder="Enter your registered email"
                  autoComplete="email"
                  spellCheck="false"
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event
                        .target
                        .value
                    )
                  }
                />
              </div>

              <div
                className="se-web-login-field"
              >
                <div
                  className="se-web-login-password-label"
                >
                  <label
                    htmlFor="se-web-password"
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={
                      openResetModal
                    }
                    className="se-web-login-forgot"
                  >
                    Forgot password?
                  </button>
                </div>

                <div
                  className="se-web-login-password-box"
                >
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
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event
                          .target
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
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowPassword(
                        (
                          current
                        ) =>
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
                <div
                  className="se-web-login-error"
                  role="alert"
                >
                  <span
                    className="se-web-login-error-mark"
                  >
                    !
                  </span>

                  <span>
                    {
                      errorMessage
                    }
                  </span>
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
                  <span
                    className="se-web-login-arrow"
                    aria-hidden="true"
                  >
                    →
                  </span>
                ) : (
                  <span
                    className="se-web-login-spinner"
                    aria-hidden="true"
                  />
                )}
              </button>

              <div
                className="se-web-login-divider"
              >
                <span />

                <p>
                  OR CONTINUE WITH
                </p>

                <span />
              </div>

              <div
                className="se-web-login-google"
              >
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

              <div
                className="se-web-login-google-note"
              >
                <span
                  className="se-web-login-google-note-icon"
                  aria-hidden="true"
                >
                  ✓
                </span>

                <p>
                  Continue with any Google
                  account that matches an{" "}
                  <strong>
                    authorised SE-RMS user
                  </strong>
                  .
                </p>
              </div>
            </form>

            <div
              className="se-web-login-footer"
            >
              <span>
                Sandeep Edgetech
                Pvt. Ltd.
              </span>

              <span
                className="se-web-login-footer-dot"
              >
                •
              </span>

              <span>
                Secure internal platform
              </span>
            </div>
          </div>

          {/* ================================================
              RIGHT - COMPANY / PRODUCT
          ================================================= */}

          <aside
            className="se-web-login-insight"
          >
            <div
              className="se-web-login-insight-grid"
            />

            <div
              className="se-web-login-insight-top"
            >
              <span>
                SANDEEP EDGETECH
              </span>

              <span
                className="se-web-login-live"
              >
                <i />
                INTERNAL
              </span>
            </div>

            <div
              className="se-web-login-slide"
              key={
                slideIndex
              }
            >
              <span
                className="se-web-login-slide-eyebrow"
              >
                {
                  currentSlide
                    .eyebrow
                }
              </span>

              <h2>
                {
                  currentSlide
                    .title
                }
              </h2>

              <p>
                {
                  currentSlide
                    .description
                }
              </p>

              <div
                className="se-web-login-slide-stat"
              >
                <strong>
                  {
                    currentSlide
                      .statistic
                  }
                </strong>

                <span>
                  {
                    currentSlide
                      .statisticLabel
                  }
                </span>
              </div>
            </div>

            <div
              className="se-web-login-slide-dots"
            >
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

            <div
              className="se-web-login-insight-bottom"
            >
              <span
                className="se-web-login-insight-line"
              />

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

      {/* =====================================================
          PASSWORD RECOVERY MODAL
      ====================================================== */}

      {resetOpen ? (
        <div
          className="se-reset-overlay"
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !resetLoading
            ) {
              closeResetModal();
            }
          }}
        >
          <section
            className="se-reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="se-reset-title"
          >
            <div
              className="se-reset-accent"
            />

            <header
              className="se-reset-header"
            >
              <div
                className="se-reset-brand"
              >
                <img
                  src="/se-logo.png"
                  alt="Sandeep Edgetech"
                />

                <div>
                  <strong>
                    SE-RMS
                  </strong>

                  <span>
                    Secure account recovery
                  </span>
                </div>
              </div>

              {resetStep !==
              RESET_STEPS.SUCCESS ? (
                <button
                  type="button"
                  className="se-reset-close"
                  aria-label="Close password recovery"
                  disabled={
                    resetLoading
                  }
                  onClick={
                    closeResetModal
                  }
                >
                  ×
                </button>
              ) : null}
            </header>

            {resetStep !==
            RESET_STEPS.SUCCESS ? (
              <div
                className="se-reset-progress"
              >
                <div
                  className={
                    resetStep ===
                    RESET_STEPS.EMAIL
                      ? "se-reset-progress-item active"
                      : "se-reset-progress-item complete"
                  }
                >
                  <span>
                    {resetStep ===
                    RESET_STEPS.EMAIL
                      ? "1"
                      : "✓"}
                  </span>

                  <div>
                    <strong>
                      Account
                    </strong>

                    <small>
                      Registered email
                    </small>
                  </div>
                </div>

                <i />

                <div
                  className={
                    resetStep ===
                    RESET_STEPS.OTP
                      ? "se-reset-progress-item active"
                      : resetStep ===
                          RESET_STEPS.PASSWORD
                        ? "se-reset-progress-item complete"
                        : "se-reset-progress-item"
                  }
                >
                  <span>
                    {resetStep ===
                    RESET_STEPS.PASSWORD
                      ? "✓"
                      : "2"}
                  </span>

                  <div>
                    <strong>
                      Verify
                    </strong>

                    <small>
                      WhatsApp OTP
                    </small>
                  </div>
                </div>

                <i />

                <div
                  className={
                    resetStep ===
                    RESET_STEPS.PASSWORD
                      ? "se-reset-progress-item active"
                      : "se-reset-progress-item"
                  }
                >
                  <span>
                    3
                  </span>

                  <div>
                    <strong>
                      Password
                    </strong>

                    <small>
                      Secure reset
                    </small>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className="se-reset-content"
            >
              {resetStep ===
              RESET_STEPS.EMAIL ? (
                <form
                  onSubmit={
                    handleRequestOtp
                  }
                >
                  <div
                    className="se-reset-icon"
                  >
                    <span>
                      ✦
                    </span>
                  </div>

                  <span
                    className="se-reset-eyebrow"
                  >
                    ACCOUNT RECOVERY
                  </span>

                  <h2
                    id="se-reset-title"
                  >
                    Reset your password
                  </h2>

                  <p
                    className="se-reset-description"
                  >
                    Enter your registered
                    SE-RMS email address.
                    We'll send a secure
                    6-digit verification
                    code to the WhatsApp
                    number registered with
                    your employee account.
                  </p>

                  <label
                    className="se-reset-field"
                  >
                    <span>
                      Registered email
                    </span>

                    <div
                      className="se-reset-input-shell"
                    >
                      <span
                        className="se-reset-input-icon"
                      >
                        @
                      </span>

                      <input
                        type="email"
                        value={
                          resetEmail
                        }
                        autoFocus
                        autoComplete="email"
                        spellCheck="false"
                        disabled={
                          resetLoading
                        }
                        placeholder="Enter your registered email"
                        onChange={(
                          event
                        ) => {
                          setResetEmail(
                            event
                              .target
                              .value
                          );

                          setResetError(
                            ""
                          );
                        }}
                      />
                    </div>
                  </label>

                  <ResetFeedback
                    error={
                      resetError
                    }
                    message={
                      resetMessage
                    }
                  />

                  <button
                    type="submit"
                    className="se-reset-primary"
                    disabled={
                      resetLoading
                    }
                  >
                    {resetLoading ? (
                      <>
                        <span
                          className="se-reset-button-spinner"
                        />

                        Sending secure code...
                      </>
                    ) : (
                      <>
                        Send WhatsApp OTP

                        <span>
                          →
                        </span>
                      </>
                    )}
                  </button>

                  <div
                    className="se-reset-security"
                  >
                    <span>
                      ✓
                    </span>

                    <p>
                      For security, account
                      recovery is available
                      only for users already
                      registered in SE-RMS.
                    </p>
                  </div>
                </form>
              ) : null}

              {resetStep ===
              RESET_STEPS.OTP ? (
                <form
                  onSubmit={
                    handleVerifyOtp
                  }
                >
                  <div
                    className="se-reset-icon whatsapp"
                  >
                    <span>
                      ✓
                    </span>
                  </div>

                  <span
                    className="se-reset-eyebrow"
                  >
                    WHATSAPP VERIFICATION
                  </span>

                  <h2
                    id="se-reset-title"
                  >
                    Enter verification code
                  </h2>

                  <p
                    className="se-reset-description"
                  >
                    Enter the 6-digit code
                    sent to the WhatsApp
                    number registered with
                    <strong>
                      {" "}
                      {resetEmail}
                    </strong>
                    .
                  </p>

                  <label
                    className="se-reset-field"
                  >
                    <span>
                      6-digit OTP
                    </span>

                    <input
                      ref={
                        otpInputRef
                      }
                      className={
  resetError
    ? "se-reset-otp-input has-error"
    : "se-reset-otp-input"
}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={
                        resetOtp
                      }
                      disabled={
                        resetLoading
                      }
                      placeholder="• • • • • •"
                      onChange={
                        handleOtpChange
                      }
                    />
                  </label>

                  <div
                    className="se-reset-otp-meta"
                  >
                    <span>
                      Code expires in
                      approximately 5 minutes
                    </span>

                    <button
                      type="button"
                      disabled={
                        resetLoading ||
                        resendSeconds > 0
                      }
                      onClick={
                        handleResendOtp
                      }
                    >
                      {resendSeconds >
                      0
                        ? `Resend in ${resendSeconds}s`
                        : "Resend code"}
                    </button>
                  </div>

                  <ResetFeedback
                    error={
                      resetError
                    }
                    message={
                      resetMessage
                    }
                  />

                  <button
                    type="submit"
                    className="se-reset-primary"
                    disabled={
                      resetLoading ||
                      resetOtp.length !==
                        6
                    }
                  >
                    {resetLoading ? (
                      <>
                        <span
                          className="se-reset-button-spinner"
                        />

                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify OTP

                        <span>
                          →
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="se-reset-secondary"
                    disabled={
                      resetLoading
                    }
                    onClick={() => {
                      setResetStep(
                        RESET_STEPS.EMAIL
                      );

                      setResetOtp(
                        ""
                      );

                      setResetError(
                        ""
                      );

                      setResetMessage(
                        ""
                      );
                    }}
                  >
                    ← Change email address
                  </button>
                </form>
              ) : null}

              {resetStep ===
              RESET_STEPS.PASSWORD ? (
                <form
                  onSubmit={
                    handleResetPassword
                  }
                >
                  <div
                    className="se-reset-icon password"
                  >
                    <span>
                      ✓
                    </span>
                  </div>

                  <span
                    className="se-reset-eyebrow"
                  >
                    CREATE NEW PASSWORD
                  </span>

                  <h2
                    id="se-reset-title"
                  >
                    Secure your account
                  </h2>

                  <p
                    className="se-reset-description"
                  >
                    Verification complete.
                    Create a new password
                    for your SE-RMS account.
                  </p>

                  <label
                    className="se-reset-field"
                  >
                    <span>
                      New password
                    </span>

                    <div
                      className="se-reset-password-shell"
                    >
                      <input
                        type={
                          showNewPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          newPassword
                        }
                        disabled={
                          resetLoading
                        }
                        autoComplete="new-password"
                        placeholder="Enter new password"
                        onChange={(
                          event
                        ) => {
                          setNewPassword(
                            event
                              .target
                              .value
                          );

                          setResetError(
                            ""
                          );
                        }}
                      />

                      <button
                        type="button"
                        disabled={
                          resetLoading
                        }
                        onClick={() =>
                          setShowNewPassword(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                      >
                        {showNewPassword
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>
                  </label>

                  <label
                    className="se-reset-field"
                  >
                    <span>
                      Confirm password
                    </span>

                    <div
                      className="se-reset-password-shell"
                    >
                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        value={
                          confirmPassword
                        }
                        disabled={
                          resetLoading
                        }
                        autoComplete="new-password"
                        placeholder="Re-enter new password"
                        onChange={(
                          event
                        ) => {
                          setConfirmPassword(
                            event
                              .target
                              .value
                          );

                          setResetError(
                            ""
                          );
                        }}
                      />

                      <button
                        type="button"
                        disabled={
                          resetLoading
                        }
                        onClick={() =>
                          setShowConfirmPassword(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                      >
                        {showConfirmPassword
                          ? "Hide"
                          : "Show"}
                      </button>
                    </div>
                  </label>

                  <div
                    className="se-reset-password-rule"
                  >
                    <span
                      className={
                        newPassword
                          .length >=
                        8
                          ? "complete"
                          : ""
                      }
                    >
                      ✓
                    </span>

                    <p>
                      Use at least
                      8 characters.
                    </p>
                  </div>

                  <ResetFeedback
                    error={
                      resetError
                    }
                    message={
                      resetMessage
                    }
                  />

                  <button
                    type="submit"
                    className="se-reset-primary"
                    disabled={
                      resetLoading
                    }
                  >
                    {resetLoading ? (
                      <>
                        <span
                          className="se-reset-button-spinner"
                        />

                        Updating password...
                      </>
                    ) : (
                      <>
                        Update password

                        <span>
                          →
                        </span>
                      </>
                    )}
                  </button>
                </form>
              ) : null}

              {resetStep ===
              RESET_STEPS.SUCCESS ? (
                <div
                  className="se-reset-success"
                >
                  <div
                    className="se-reset-success-mark"
                  >
                    ✓
                  </div>

                  <span
                    className="se-reset-eyebrow"
                  >
                    PASSWORD UPDATED
                  </span>

                  <h2
                    id="se-reset-title"
                  >
                    You're ready to sign in
                  </h2>

                  <p>
                    Your SE-RMS password has
                    been changed successfully.
                    For account security,
                    previous authenticated
                    sessions should now be
                    signed out.
                  </p>

                  <button
                    type="button"
                    className="se-reset-primary"
                    onClick={
                      handleReturnToLogin
                    }
                  >
                    Continue to sign in

                    <span>
                      →
                    </span>
                  </button>
                </div>
              ) : null}
            </div>

            {resetStep !==
            RESET_STEPS.SUCCESS ? (
              <footer
                className="se-reset-footer"
              >
                <span>
                  🔒
                </span>

                <p>
                  Secure recovery •
                  SE-RMS internal platform
                </p>
              </footer>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
};

/* =========================================================
   RESET FEEDBACK
========================================================= */

const ResetFeedback = ({
  error,
  message,
}) => {
  if (
    !error &&
    !message
  ) {
    return null;
  }

  return (
    <div
      className={
        error
          ? "se-reset-feedback error"
          : "se-reset-feedback success"
      }
      role={
        error
          ? "alert"
          : "status"
      }
    >
      <span>
        {error
          ? "!"
          : "✓"}
      </span>

      <p>
        {error ||
          message}
      </p>
    </div>
  );
};

export default LoginWeb;