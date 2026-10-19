import { publicAsset } from "../../config/urls";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../auth/AuthContext";
import { requestPasswordResetOtp, verifyPasswordResetOtp, resetPasswordWithOtp } from "../../services/authService";
import "./LoginApp.css";
const errorText = error => error?.response?.data?.message || "Something went wrong. Please try again.";
function AppIcon({
  kind,
  ...props
}) {
  const paths = {
    arrow: "M5 12h14M13 6l6 6-6 6",
    back: "M19 12H5m6-6-6 6 6 6",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zm7 4v3",
    check: "M5 12l4 4L19 6"
  };
  return <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d={paths[kind] || paths.lock} />
  </svg>;
}
function PasswordInput({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete = "current-password",
  minLength
}) {
  const [visible, setVisible] = useState(false);
  return (
  <div className="se-app-login__field">
    <label htmlFor={id}>
      {label}
    </label>
    <div className="se-app-login__password">
      <input
        id={id}
        name={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        required
        minLength={minLength}
      />
      <button
        type="button"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
        disabled={disabled}
      >
        <AppIcon kind="eye" />
      </button>
    </div>
  </div>
  );
}

export default function LoginApp() {
  const navigate = useNavigate();
  const {
    login,
    googleLogin,
    isAuthenticated
  } = useAuth();
  const [step, setStep] = useState("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [googleWidth, setGoogleWidth] = useState(280);
  const googleContainer = useRef(null);
  const heading = useRef(null);
  const pending = useRef(false);
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", {
      replace: true
    });
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (step !== "LOGIN") heading.current?.focus();
  }, [step]);
  useEffect(() => {
    const element = googleContainer.current;
    if (!element || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setGoogleWidth(Math.min(400, Math.floor(element.clientWidth))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [step, googleEnabled]);
  const changeStep = next => {
    if (pending.current) return;
    setError("");
    setNotice("");
    setStep(next);
    setOtp("");
    setNewPassword("");
    setConfirmation("");
    setPassword("");
  };
  const run = async action => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const sendCode = async () => {
    await requestPasswordResetOtp(resetEmail.trim().toLowerCase());
    setOtp("");
    setStep("OTP");
    setCooldown(30);
    setNotice("If your account is eligible, a code has been sent to your registered WhatsApp number.");
  };
  const submit = event => {
    event.preventDefault();
    run(async () => {
      if (step === "LOGIN") {
        await login(email.trim().toLowerCase(), password);
        navigate("/dashboard", {
          replace: true
        });
      } else if (step === "EMAIL") {
        await sendCode();
      } else if (step === "OTP") {
        if (!/^\d{6}$/.test(otp)) {
          setError("Enter the 6-digit code.");
          return;
        }
        await verifyPasswordResetOtp({
          email: resetEmail,
          otp
        });
        setNotice("");
        setStep("PASSWORD");
      } else if (step === "PASSWORD") {
        if (newPassword !== confirmation) {
          setError("Passwords do not match.");
          return;
        }
        await resetPasswordWithOtp({
          email: resetEmail,
          otp,
          newPassword
        });
        setEmail(resetEmail.trim().toLowerCase());
        setOtp("");
        setNewPassword("");
        setConfirmation("");
        setStep("SUCCESS");
      }
    });
  };
  const titles = {
    LOGIN: "Welcome back",
    EMAIL: "Forgot password?",
    OTP: "Check your WhatsApp",
    PASSWORD: "Set a new password",
    SUCCESS: "You’re all set"
  };
  const subtitles = {
    LOGIN: "Sign in to SE-ERP.",
    EMAIL: "Enter your registered company email.",
    OTP: "Enter your 6-digit verification code.",
    PASSWORD: "Use at least 8 characters.",
    SUCCESS: "Your password has been updated."
  };
  return <main
    className="se-app-login"
    style={{ "--se-login-photo": `url("${publicAsset("se-factory.jpg")}")` }}
  >
    <div className="se-app-login__shell">
      <header className="se-app-login__brand">
        <img
          className="se-app-login__logo"
          src={publicAsset("se-logo.png")}
          alt="Sandeep Edgetech Steel Solutions"
        />
        <span className="se-app-login__product">
          SE-ERP
        </span>
      </header>
      <section
        className="se-app-login__content"
        aria-labelledby="se-app-login-title"
      >
        {step !== "LOGIN" && <button
          className="se-app-login__back"
          type="button"
          onClick={() => changeStep("LOGIN")}
          disabled={busy}
        >
          <AppIcon kind="back" />
          Back to sign in
        </button>}
        <div className={`se-app-login__symbol${step === "SUCCESS" ? " is-success" : ""}`}>
          <AppIcon kind={step === "SUCCESS" ? "check" : "lock"} />
        </div>
        <h1
          id="se-app-login-title"
          ref={heading}
          tabIndex={-1}
        >
          {titles[step]}
        </h1>
        <p className="se-app-login__subtitle">
          {subtitles[step]}
        </p>
        {error && <p
          className="se-app-login__error"
          role="alert"
        >
          {error}
        </p>}
        {notice && <p
          className="se-app-login__notice"
          role="status"
        >
          {notice}
        </p>}
        {step === "SUCCESS" ? <button
          className="se-app-login__primary"
          type="button"
          onClick={() => changeStep("LOGIN")}
        >
          Back to sign in 
          <AppIcon kind="arrow" />
        </button> : <form
          onSubmit={submit}
          aria-busy={busy}
        >
          {step === "LOGIN" && <>
            <div className="se-app-login__field">
              <label htmlFor="se-app-email">
                Company email
              </label>
              <input
                id="se-app-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@company.com"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                disabled={busy}
              />
            </div>
            <PasswordInput
              id="se-app-password"
              label="Password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              disabled={busy}
            />
            <div className="se-app-login__recovery">
              <button
                type="button"
                onClick={() => {
                setResetEmail(email);
                changeStep("EMAIL");
                }}
                disabled={busy}
              >
                Forgot password?
              </button>
            </div>
          </>}
          {step === "EMAIL" && <div className="se-app-login__field">
            <label htmlFor="se-app-reset-email">
              Company email
            </label>
            <input
              id="se-app-reset-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={resetEmail}
              onChange={event => setResetEmail(event.target.value)}
              required
              disabled={busy}
            />
          </div>}
          {step === "OTP" && <>
            <div className="se-app-login__field">
              <label htmlFor="se-app-otp">
                Verification code
              </label>
              <input
                id="se-app-otp"
                className="se-app-login__otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={event => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={busy}
              />
            </div>
            <div className="se-app-login__recovery">
              <button
                type="button"
                disabled={busy || cooldown > 0}
                onClick={() => run(sendCode)}
              >
                {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          </>}
          {step === "PASSWORD" && <>
            <PasswordInput
              id="se-app-new-password"
              label="New password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              disabled={busy}
              autoComplete="new-password"
              minLength={8}
            />
            <PasswordInput
              id="se-app-confirm-password"
              label="Confirm password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              disabled={busy}
              autoComplete="new-password"
              minLength={8}
            />
          </>}
          <button
            className="se-app-login__primary"
            type="submit"
            disabled={busy}
          >
            {busy ? "Please wait…" : {
            LOGIN: "Sign in",
            EMAIL: "Send verification code",
            OTP: "Verify code",
            PASSWORD: "Update password"
            }[step]}
            {busy ? <span
              className="se-app-login__spinner"
              aria-hidden="true"
            /> : <AppIcon kind="arrow" />}
          </button>
        </form>}
        {step === "LOGIN" && googleEnabled && <>
          <div className="se-app-login__divider">
            <span>
              or
            </span>
          </div>
          <div
            className="se-app-login__google"
            ref={googleContainer}
          >
            <fieldset
              disabled={busy}
              aria-label="Google sign in"
              style={busy ? {
              pointerEvents: "none",
              opacity: 0.6
              } : undefined}
            >
              <GoogleLogin
                onSuccess={response => {
                if (!response?.credential) {
                setError("Google sign-in failed. Please try again.");
                return;
                }
                run(async () => {
                await googleLogin(response.credential);
                navigate("/dashboard", {
                replace: true
                });
                });
                }}
                onError={() => setError("Google sign-in failed. Please try again.")}
                width={String(googleWidth)}
                theme="outline"
                size="large"
                shape="pill"
                text="continue_with"
              />
            </fieldset>
          </div>
        </>}
      </section>
      <footer className="se-app-login__footer">
        <span className="se-app-login__footer-line" />
        Sandeep Edgetech Pvt. Ltd.
      </footer>
    </div>
  </main>;
}
