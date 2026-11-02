import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7faf8] text-slate-800 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-6 border border-emerald-200">
          <Mail size={24} />
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Reset Hospital Access</h2>
        <p className="mt-2 text-sm text-slate-600">
          Enter your registered hospital coordinator email address to receive password reset instructions.
        </p>

        {submitted ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-center gap-2 font-semibold text-emerald-800">
              <CheckCircle2 size={18} className="text-emerald-600" />
              Reset Link Dispatched
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              If an active hospital account is associated with <strong>{email}</strong>, a recovery link has been sent.
            </p>
            <div className="mt-4">
              <Link
                to="/login"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Hospital Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coordinator@hospital.org"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              Send Recovery Instructions
            </button>

            <div className="pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition"
              >
                <ArrowLeft size={14} />
                Back to Hospital Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
