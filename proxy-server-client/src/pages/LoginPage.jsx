import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { login } from "../api/auth.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { Server } from "lucide-react";

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/registration";

  const mutation = useMutation({
    mutationFn: (credentials) => login(credentials),
    onSuccess: (data) => {
      if (data?.accessToken) {
        setToken(data.accessToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        navigate(from, { replace: true });
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ email, password });
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
          <div className="relative w-6 h-6 flex items-center justify-center">
            {theme === "light" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </div>
        </button>
      </div>

      <div className="w-full max-w-[400px] flex flex-col items-center z-10">
        <div className="mb-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-primary-content mb-4 shadow-xl shadow-primary/20 transform hover:scale-105 transition-transform duration-300">
            <Server className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-base-content tracking-tight">Proxy Setup</h1>
          <p className="text-[10px] text-base-content/40 uppercase tracking-[0.2em] font-black mt-2">Node Authentication</p>
        </div>

        <div className="glass-card w-full p-8 border-base-content/5 shadow-2xl">
            <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-base-content/40 tracking-widest ml-1">Email</label>
                <input
                type="email"
                placeholder="node-admin@des.com"
                className="w-full px-5 h-14 bg-base-200/50 border border-base-content/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm outline-none text-base-content font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-base-content/40 tracking-widest ml-1">Password</label>
                <div className="relative">
                    <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-5 pr-12 h-14 bg-base-200/50 border border-base-content/5 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-sm outline-none text-base-content font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    />
                    <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
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

            {mutation.isError && (
                <div className="p-4 bg-error/10 border border-error/10 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm shadow-error/5">
                <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                <span className="text-xs font-bold text-error">
                    {mutation.error?.response?.data?.error ?? mutation.error?.message ?? "Invalid credentials."}
                </span>
                </div>
            )}

            <button 
                type="submit" 
                className="w-full h-14 bg-primary text-primary-content rounded-2xl text-sm font-black uppercase tracking-widest hover:opacity-90 active:scale-[0.98] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-xl shadow-primary/20 group"
                disabled={mutation.isPending}
            >
                {mutation.isPending ? (
                <span className="loading loading-spinner text-primary-content"></span>
                ) : (
                <span className="flex items-center gap-2">
                    Sign in <Server className="w-4 h-4 opacity-40 group-hover:scale-110 transition-transform" />
                </span>
                )}
            </button>
            </form>
        </div>

        <p className="mt-12 text-[10px] font-black text-base-content/10 uppercase tracking-[0.3em]">
          Node Management System
        </p>
      </div>
    </div>
  );
}
