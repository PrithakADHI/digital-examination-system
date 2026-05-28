import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from "../api/auth.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { toast } from "react-hot-toast";

const STEP_LABELS = ["Email", "Verify OTP", "Reset Password"];

export default function ForgotPasswordPage() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(location.state?.email ?? "");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const requestOtpMutation = useMutation({
    mutationFn: requestPasswordResetOtp,
    onSuccess: () => {
      setStep(2);
      toast.success("OTP sent to your email.");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error ?? "Could not send OTP.");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: verifyPasswordResetOtp,
    onSuccess: () => {
      setStep(3);
      toast.success("OTP verified.");
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error ?? "OTP verification failed.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetPasswordWithOtp,
    onSuccess: () => {
      toast.success("Password reset successfully.");
      navigate("/login", { replace: true, state: { email } });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error ?? "Could not reset password.");
    },
  });

  const handleRequestOtp = (e) => {
    e.preventDefault();
    requestOtpMutation.mutate({ email });
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    verifyOtpMutation.mutate({ email, otp });
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    resetPasswordMutation.mutate({
      email,
      otp,
      newPassword,
      confirmNewPassword,
    });
  };

  const loading =
    requestOtpMutation.isPending || verifyOtpMutation.isPending || resetPasswordMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 p-6 transition-colors duration-300 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="absolute top-6 right-6 z-10">
        <button
          type="button"
          className="btn btn-ghost btn-circle rounded-xl hover:bg-base-200 transition-all duration-300"
          onClick={toggleTheme}
        >
          <div className="relative w-6 h-6">
            <div className={`absolute inset-0 transform transition-all duration-500 ${theme === "light" ? "rotate-0 opacity-100 scale-100" : "rotate-90 opacity-0 scale-0"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className={`absolute inset-0 transform transition-all duration-500 ${theme === "dark" ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-0"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      <div className="w-full max-w-[440px] flex flex-col items-center z-10">
        <div className="mb-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black text-xl mb-4 shadow-lg shadow-primary/20">
            D
          </div>
          <h1 className="text-xl font-bold text-base-content tracking-tight">Reset Password</h1>
          <p className="text-xs text-base-content/40 uppercase tracking-widest font-black mt-1">OTP verification flow</p>
        </div>

        <div className="w-full mb-6">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-base-content/40 mb-2">
            {STEP_LABELS.map((label, index) => (
              <span key={label} className={step === index + 1 ? "text-primary" : ""}>
                {label}
              </span>
            ))}
          </div>
          <div className="h-2 rounded-full bg-base-200 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        <form
          onSubmit={step === 1 ? handleRequestOtp : step === 2 ? handleVerifyOtp : handleResetPassword}
          className="w-full space-y-4"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-base-content/40 tracking-wider ml-1">Email</label>
            <input
              type="email"
              placeholder="name@domain.com"
              className="w-full px-4 h-12 bg-base-200 border border-base-content/10 rounded-xl focus:border-primary focus:ring-0 transition-all text-sm outline-none text-base-content"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {step >= 2 ? (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-base-content/40 tracking-wider ml-1">OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="1234"
                className="w-full px-4 h-12 bg-base-200 border border-base-content/10 rounded-xl focus:border-primary focus:ring-0 transition-all text-sm outline-none text-base-content tracking-[0.4em] text-center"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
          ) : null}

          {step === 3 ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-base-content/40 tracking-wider ml-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    className="w-full px-4 pr-12 h-12 bg-base-200 border border-base-content/10 rounded-xl focus:border-primary focus:ring-0 transition-all text-sm outline-none text-base-content"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                    onClick={() => setShowNewPassword((value) => !value)}
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-base-content/40 tracking-wider ml-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="w-full px-4 pr-12 h-12 bg-base-200 border border-base-content/10 rounded-xl focus:border-primary focus:ring-0 transition-all text-sm outline-none text-base-content"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                    onClick={() => setShowConfirmNewPassword((value) => !value)}
                    aria-label={showConfirmNewPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          <div className="flex gap-3 pt-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="h-12 px-4 rounded-xl border border-base-content/10 text-sm font-bold text-base-content/70 hover:bg-base-200 transition-all"
                disabled={loading}
              >
                Back
              </button>
            ) : null}

            <button
              type="submit"
              className="flex-1 h-12 bg-primary text-primary-content rounded-xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm text-primary-content" />
              ) : step === 1 ? (
                "Send OTP"
              ) : step === 2 ? (
                "Verify OTP"
              ) : (
                "Reset Password"
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login", { replace: true, state: { email } })}
            className="w-full text-center text-xs font-bold text-base-content/50 hover:text-primary transition-colors"
          >
            Back to login
          </button>
        </form>

        <p className="mt-12 text-[10px] font-bold text-base-content/20 uppercase tracking-tighter">
          Powered by Digital Examination System v2.0
        </p>
      </div>
    </div>
  );
}