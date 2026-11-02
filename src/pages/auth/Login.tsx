import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";
import {
  Heart,
  Building2,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const from = (location.state as any)?.from?.pathname || "/";
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const [portalType, setPortalType] = useState<UserRole>("donor_hospital");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const isDonor = portalType === "donor_hospital";

  const handlePortalSwitch = (type: UserRole) => {
    setPortalType(type);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      await login({
        username,
        password,
        portal_type: portalType,
      });
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMsg(
        err.message || "Invalid credentials. Please verify your username and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7faf8] flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[#174D40] bg-[#0F3D32] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white shadow-sm">
              🫀
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                OrganMatch
              </h1>
              <p className="text-xs text-emerald-100/70">
                Clinical Decision Support
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-100/80">
            Transplant Coordination Center
          </span>
        </div>
      </header>

      {/* Main Centered Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
            
            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Hospital Sign In
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Select your hospital department and enter your credentials
              </p>
            </div>

            {/* Portal Selection Tabs (Donor Hospital vs Recipient Hospital) */}
            <div className="mb-6">
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => handlePortalSwitch("donor_hospital")}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition ${
                    isDonor
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Heart size={15} />
                  <span>Donor Hospital</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePortalSwitch("recipient_hospital")}
                  className={`flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-semibold transition ${
                    !isDonor
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Building2 size={15} />
                  <span>Recipient Hospital</span>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="flex-1">{errorMsg}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {isDonor ? "Donor Hospital Username" : "Recipient Hospital Username"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isDonor ? "donor_hospital" : "recipient_hospital"}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600">
                  Remember this device
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-4 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
        <p>OrganMatch Clinical Decision Support System</p>
      </footer>
    </div>
  );
}
