import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LoginApp from "./LoginApp";
import { useAuth } from "../../auth/AuthContext";
import { requestPasswordResetOtp, verifyPasswordResetOtp, resetPasswordWithOtp } from "../../services/authService";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../services/authService", () => ({ requestPasswordResetOtp: jest.fn(), verifyPasswordResetOtp: jest.fn(), resetPasswordWithOtp: jest.fn() }));
jest.mock("@react-oauth/google", () => ({ GoogleLogin: () => <button>Google sign in</button> }));
const mockLogin = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ login: mockLogin, googleLogin: jest.fn(), isAuthenticated: false });
  requestPasswordResetOtp.mockResolvedValue({});
  verifyPasswordResetOtp.mockResolvedValue({});
  resetPasswordWithOtp.mockResolvedValue({});
});

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });

test("signs in through the existing auth context and redirects", async () => {
  mockLogin.mockResolvedValue({});
  render(<LoginApp />);
  fill("Company email", "PERSON@COMPANY.COM"); fill("Password", "password123");
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true }));
  expect(mockLogin).toHaveBeenCalledWith("person@company.com", "password123");
});

test("blocks duplicate submissions and displays the API error", async () => {
  let fail;
  mockLogin.mockImplementation(() => new Promise((resolve, reject) => { fail = reject; }));
  render(<LoginApp />); fill("Company email", "person@company.com"); fill("Password", "password123");
  const button = screen.getByRole("button", { name: "Sign in" });
  fireEvent.click(button); fireEvent.submit(button.closest("form"));
  expect(mockLogin).toHaveBeenCalledTimes(1);
  fail({ response: { data: { message: "Invalid credentials" } } });
  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("supports password visibility without submitting the form", () => {
  render(<LoginApp />);
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text");
  expect(mockLogin).not.toHaveBeenCalled();
});

test("completes OTP recovery and validates password confirmation", async () => {
  render(<LoginApp />);
  fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
  fill("Company email", "person@company.com");
  fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
  await screen.findByLabelText("Verification code");
  expect(requestPasswordResetOtp).toHaveBeenCalledWith("person@company.com");
  expect(screen.getByRole("button", { name: "Resend in 30s" })).toBeDisabled();
  fill("Verification code", "123456");
  fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
  await screen.findByLabelText("New password", { exact: true });
  expect(verifyPasswordResetOtp).toHaveBeenCalledWith({ email: "person@company.com", otp: "123456" });
  fill("New password", "updated123"); fill("Confirm password", "different123");
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match.");
  expect(resetPasswordWithOtp).not.toHaveBeenCalled();
  fill("Confirm password", "updated123"); fireEvent.click(screen.getByRole("button", { name: "Update password" }));
  expect(await screen.findByRole("heading", { name: "You’re all set" })).toBeInTheDocument();
  expect(resetPasswordWithOtp).toHaveBeenCalledWith({ email: "person@company.com", otp: "123456", newPassword: "updated123" });
});

test("redirects an already signed-in user", async () => {
  useAuth.mockReturnValue({ isAuthenticated: true }); render(<LoginApp />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true }));
});
