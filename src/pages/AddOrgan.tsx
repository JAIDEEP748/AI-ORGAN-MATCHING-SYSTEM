import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, HeartPulse, Building2, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import Card from "../components/common/Card";
import PageHeader from "../components/common/PageHeader";

const API_URL = "http://127.0.0.1:8000";

const STANDARD_HOURS: Record<string, number> = {
  Heart: 4,
  Lung: 6,
  Liver: 12,
  Kidney: 24,
  Pancreas: 12,
  Intestine: 8,
};

export default function AddOrgan() {
  const navigate = useNavigate();

  // Helper for current local ISO datetime string (YYYY-MM-DDTHH:mm)
  const getNowLocalIso = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    organ_id: `O${Math.floor(10000 + Math.random() * 90000)}`,
    donor_id: "D00001",
    organ_type: "Kidney",
    retrieval_datetime: getNowLocalIso(),
    preservation_method: "Cold_Storage",
    organ_condition_category: "Good",
    status: "Available",
    current_hospital_id: "H0001",
    max_preservation_hours: 24,
    expiry_datetime: "",
  });

  const [demoQuickExpire, setDemoQuickExpire] = useState(false);
  const [quickExpireMinutes, setQuickExpireMinutes] = useState(5);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Recalculate expiry whenever organ_type, retrieval_datetime, or demo settings change
  useEffect(() => {
    const baseHours = STANDARD_HOURS[formData.organ_type] || 12;
    const finalHours =
      formData.preservation_method === "Machine_Perfusion"
        ? baseHours + (formData.organ_type === "Kidney" ? 12 : 2)
        : baseHours;

    let expiryDate: Date;
    if (demoQuickExpire) {
      // Set expiry in N minutes from now for live test
      expiryDate = new Date(Date.now() + quickExpireMinutes * 60 * 1000);
    } else {
      const retrievalDate = new Date(formData.retrieval_datetime || Date.now());
      expiryDate = new Date(retrievalDate.getTime() + finalHours * 3600 * 1000);
    }

    setFormData((prev) => ({
      ...prev,
      max_preservation_hours: demoQuickExpire ? quickExpireMinutes / 60 : finalHours,
      expiry_datetime: expiryDate.toISOString(),
    }));
  }, [
    formData.organ_type,
    formData.preservation_method,
    formData.retrieval_datetime,
    demoQuickExpire,
    quickExpireMinutes,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/organs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || JSON.stringify(data));
      }

      setMessage(
        `Organ ${formData.organ_id} registered successfully! Auto-expiration timer active.`
      );

      setTimeout(() => {
        navigate("/organs");
      }, 1200);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to add organ.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Register Donor Organ"
        description="Add a harvested organ with Cold Ischemia limits, donor hospital registry, and automatic expiration removal."
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Organ & Retrieval Parameters
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Organ ID */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Organ Identifier
              </label>
              <input
                type="text"
                name="organ_id"
                value={formData.organ_id}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Donor ID */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Linked Donor ID
              </label>
              <input
                type="text"
                name="donor_id"
                value={formData.donor_id}
                onChange={handleChange}
                placeholder="D00001"
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Organ Type */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Organ Type
              </label>
              <select
                name="organ_type"
                value={formData.organ_type}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500"
              >
                <option value="Kidney">Kidney (Max 24h)</option>
                <option value="Heart">Heart (Max 4h)</option>
                <option value="Liver">Liver (Max 12h)</option>
                <option value="Lung">Lung (Max 6h)</option>
                <option value="Pancreas">Pancreas (Max 12h)</option>
                <option value="Intestine">Intestine (Max 8h)</option>
              </select>
            </div>

            {/* Preservation Method */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Preservation Technique
              </label>
              <select
                name="preservation_method"
                value={formData.preservation_method}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
              >
                <option value="Cold_Storage">Static Cold Storage (Standard)</option>
                <option value="Machine_Perfusion">Hypothermic Machine Perfusion (+Extends time)</option>
              </select>
            </div>

            {/* Retrieval Date */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Retrieval Timestamp
              </label>
              <input
                type="datetime-local"
                name="retrieval_datetime"
                value={formData.retrieval_datetime}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Hospital */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Donor Procurement Hospital ID
              </label>
              <input
                type="text"
                name="current_hospital_id"
                value={formData.current_hospital_id}
                onChange={handleChange}
                placeholder="H0001"
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Organ Condition */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Clinical Condition
              </label>
              <select
                name="organ_condition_category"
                value={formData.organ_condition_category}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Acceptable">Acceptable</option>
                <option value="Marginal">Marginal</option>
              </select>
            </div>

            {/* Initial Status */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Initial Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-emerald-700 outline-none focus:border-emerald-500"
              >
                <option value="Available">Available for Matching</option>
                <option value="Reserved">Reserved</option>
                <option value="Allocated">Allocated</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Cold Ischemia & Auto-Expiration Calculation Card */}
        <Card className="p-6 border-emerald-100 bg-emerald-50/30 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              Cold Ischemia & Automated Removal Configuration
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <span className="text-xs text-slate-500">Calculated Preservation Window</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {formData.max_preservation_hours} Hours
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard safe preservation limit for {formData.organ_type}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <span className="text-xs text-slate-500">Scheduled Expiry Timestamp</span>
              <p className="text-sm font-mono font-bold text-slate-800 mt-1 truncate">
                {formData.expiry_datetime ? new Date(formData.expiry_datetime).toLocaleString() : "Calculating..."}
              </p>
              <p className="text-xs text-amber-600 font-medium mt-0.5">
                Organ will auto-remove from matching when this time is reached.
              </p>
            </div>
          </div>

          {/* Quick Demo Test Option */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-600" />
                <span className="text-xs font-bold text-amber-900">
                  Quick Demo: Test Short Expiration Timer
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={demoQuickExpire}
                  onChange={(e) => setDemoQuickExpire(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Enable Short Test Timer</span>
              </label>
            </div>

            {demoQuickExpire && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-amber-800">Expire in:</span>
                {[2, 5, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setQuickExpireMinutes(mins)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                      quickExpireMinutes === mins
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-amber-800 border-amber-200 hover:bg-amber-100"
                    }`}
                  >
                    {mins} mins
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/organs")}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? "Registering & Running Matches..." : "Save Organ & Activate Countdown"}
          </button>
        </div>
      </form>
    </div>
  );
}
