import { useState } from "react";
import axios from "axios";
import { Lock, Mail, RefreshCcw, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";

const PROXY_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(`${PROXY_URL}/auth/login`, { email, password });
      const { accessToken, user } = response.data;
      
      // Store token in session (not localStorage for security as per requirement)
      // The requirement says "once out of the admin panel we should always have to log in again"
      // So stay in memory/state.
      onLoginSuccess({ token: accessToken, user });
      toast.success("Admin Login Successful!");
    } catch (err) {
      console.error("Login failed:", err);
      toast.error(err.response?.data?.error || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-2xl border border-base-300/50 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 text-primary rounded-3xl group-hover:rotate-12 transition-transform duration-300">
            <Lock className="w-12 h-12" />
          </div>
        </div>
        <h2 className="text-3xl font-black tracking-tight">Admin Portal</h2>
        <p className="text-sm text-base-content/60 font-medium">Please authenticate to manage this terminal.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-[10px] uppercase tracking-widest opacity-40">Admin Email</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input 
                type="email" 
                placeholder="admin@example.com" 
                className="input input-bordered w-full pl-12 rounded-2xl bg-base-200/50 border-base-300/50 focus:border-primary/50 transition-all font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-bold text-[10px] uppercase tracking-widest opacity-40">Password</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="input input-bordered w-full pl-12 pr-12 rounded-2xl bg-base-200/50 border-base-300/50 focus:border-primary/50 transition-all font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="btn btn-primary btn-lg w-full rounded-2xl shadow-xl shadow-primary/20 text-lg font-bold gap-3 py-4"
        >
          {isLoading ? (
            <RefreshCcw className="w-6 h-6 animate-spin" />
          ) : (
            <ShieldCheck className="w-6 h-6" />
          )}
          {isLoading ? "Authenticating..." : "Login to Portal"}
        </button>
      </form>
    </div>
  );
}
