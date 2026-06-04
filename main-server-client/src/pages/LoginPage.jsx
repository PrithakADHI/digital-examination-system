import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { completeTemporaryPassword, login } from "../api/auth.js";
import { setStoredRefreshToken, setStoredToken } from "../api/axiosInstance.js";
import { useTheme } from "../context/ThemeContext.jsx";

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/admin";

  const mutation = useMutation({
    mutationFn: (credentials) => login(credentials),
    onSuccess: (data) => {
      if (data?.requiresPasswordChange) {
        setRequiresPasswordChange(true);
        return;
      }

      if (data?.accessToken && data?.refreshToken) {
        setStoredToken(data.accessToken);
        setStoredRefreshToken(data.refreshToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
          
          // Redirect based on role if no specific path is requested
          if (!location.state?.from) {
            if (data.user.role === "TEACHER") {
              navigate("/teacher", { replace: true });
              return;
            }
            if (data.user.role === "STUDENT") {
              navigate("/student", { replace: true });
              return;
            }
          }

        }
        navigate(from, { replace: true });
      }
    },
  });

  const completePasswordMutation = useMutation({
    mutationFn: (payload) => completeTemporaryPassword(payload),
    onSuccess: (data) => {
      if (data?.accessToken && data?.refreshToken) {
        setStoredToken(data.accessToken);
        setStoredRefreshToken(data.refreshToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));

          if (!location.state?.from) {
            if (data.user.role === "TEACHER") {
              navigate("/teacher", { replace: true });
              return;
            }
            if (data.user.role === "STUDENT") {
              navigate("/student", { replace: true });
              return;
            }
          }
        }
        navigate(from, { replace: true });
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  const handleCompletePassword = (e) => {
    e.preventDefault();
    completePasswordMutation.mutate({
      email,
      currentPassword: password,
      newPassword,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-100 p-6 transition-colors duration-300 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Theme Toggle in Corner */}
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

      <div className="w-full max-w-[400px] flex flex-col items-center z-10">
        {/* Simplified Logo Area */}
        <div className="mb-12 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-content font-black text-xl mb-4 shadow-lg shadow-primary/20">
            D
          </div>
          <h1 className="text-xl font-bold text-base-content tracking-tight">Examinations System</h1>
          <p className="text-xs text-base-content/40 uppercase tracking-widest font-black mt-1">Admin Access</p>
        </div>

        {/* Minimalist Form */}
        <form onSubmit={requiresPasswordChange ? handleCompletePassword : handleSubmit} className="w-full space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-base-content/40 tracking-wider ml-1">Email</label>
            <input
              type="email"
              placeholder="admin@des.com"
              className="w-full px-4 h-12 bg-base-200 border border-base-content/10 rounded-xl focus:border-primary focus:ring-0 transition-all text-sm outline-none text-base-content"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-base-content/40 tracking-wider ml-1">
              {requiresPasswordChange ? "Temporary Password" : "Password"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 h-12 bg-base-200 border border-base-content/10 rounded-xl focus:border-primary focus:ring-0 transition-all text-sm outline-none text-base-content"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
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

          {requiresPasswordChange ? (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-base-content/40 tracking-wider ml-1">New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                className="w-full px-4 h-12 bg-base-200 border border-base-content/10 rounded-xl focus:border-primary focus:ring-0 transition-all text-sm outline-none text-base-content"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          ) : null}

          {mutation.isError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-fade-in">
              <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold text-red-600">
                {mutation.error?.response?.data?.error ?? mutation.error?.message ?? "Invalid credentials."}
              </span>
            </div>
          )}

          {completePasswordMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-fade-in">
              <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-bold text-red-600">
                {completePasswordMutation.error?.response?.data?.error ?? completePasswordMutation.error?.message ?? "Could not update password."}
              </span>
            </div>
          )}

          {requiresPasswordChange ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-bold text-amber-700">First login detected. Set a new password to continue.</span>
            </div>
          ) : null}

          <button 
            type="submit" 
            className="w-full h-12 bg-primary text-primary-content rounded-xl text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-primary/20"
            disabled={mutation.isPending || completePasswordMutation.isPending}
          >
            {mutation.isPending || completePasswordMutation.isPending ? (
              <span className="loading loading-spinner loading-sm text-primary-content"></span>
            ) : (
              requiresPasswordChange ? "Save New Password" : "Sign in"
            )}
          </button>

          {!requiresPasswordChange ? (
            <button
              type="button"
              onClick={() => navigate("/forgot-password", { state: { email } })}
              className="w-full text-center text-xs font-bold text-primary hover:opacity-80 transition-opacity"
            >
              Forgot password?
            </button>
          ) : null}
        </form>

        <p className="mt-12 text-[10px] font-bold text-base-content/20 uppercase tracking-tighter">
          Powered by Digital Examination System v2.0
        </p>
      </div>
    </div>
  );
}
