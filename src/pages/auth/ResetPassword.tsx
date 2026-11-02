import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      navigate("/login");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf8] text-slate-800 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-6 border border-emerald-200">
          <Lock size={24} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Create New Password</h2>
        <p className="mt-2 text-sm text-slate-600">
          Please enter your updated clinical terminal credentials.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 text-center">
            <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
            <p className="mt-2 text-sm font-semibold">Password Reset Successful</p>
            <p className="mt-1 text-xs text-emerald-700">
              Redirecting you to the hospital sign-in portal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Update Password
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="text-xs text-slate-600 hover:text-slate-900 transition"
              >
                Cancel and return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
