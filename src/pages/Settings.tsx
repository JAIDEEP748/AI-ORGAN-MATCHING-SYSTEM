import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCheck,
  LogOut,
  Hospital,
  Building2,
  Clock,
  Bell,
  Lock,
  Download,
  CheckCircle2,
  AlertCircle,
  Activity,
  HeartPulse,
  Save,
  Check,
} from "lucide-react";

import Card from "../components/common/Card";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";
import { matchRuns } from "../data/datasets/matchRuns";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Hospital Readiness States
  const [icuAvailable, setIcuAvailable] = useState(true);
  const [theatreAvailable, setTheatreAvailable] = useState(true);
  const [teamAvailable, setTeamAvailable] = useState(true);
  const [savingReadiness, setSavingReadiness] = useState(false);
  const [readinessSaved, setReadinessSaved] = useState(false);

  // Offer & Notification preferences (stored in localStorage)
  const [responseWindow, setResponseWindow] = useState(() => {
    return localStorage.getItem("setting_response_window") || "5";
  });
  const [autoForward, setAutoForward] = useState(() => {
    return localStorage.getItem("setting_auto_forward") !== "false";
  });
  const [audioAlerts, setAudioAlerts] = useState(() => {
    return localStorage.getItem("setting_audio_alerts") !== "false";
  });
  const [prefSaved, setPrefSaved] = useState(false);

  // Security / Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Load existing hospital readiness
  useEffect(() => {
    async function fetchHospitalData() {
      if (!user?.hospital_id) return;
      try {
        const hospitals = await apiRequest("/api/hospitals");
        const currentHosp = hospitals.find(
          (h: any) => h.hospital_id === user.hospital_id
        );
        if (currentHosp) {
          setIcuAvailable(Boolean(currentHosp.icu_available));
          setTheatreAvailable(Boolean(currentHosp.operating_theatre_available));
          setTeamAvailable(Boolean(currentHosp.transplant_team_available));
        }
      } catch (err) {
        console.warn("Could not load hospital readiness, using default:", err);
      }
    }
    fetchHospitalData();
  }, [user?.hospital_id]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Save hospital readiness to backend
  const handleSaveReadiness = async () => {
    setSavingReadiness(true);
    setReadinessSaved(false);
    try {
      if (user?.hospital_id) {
        await apiRequest(`/api/hospitals/${user.hospital_id}/readiness`, {
          method: "PUT",
          body: JSON.stringify({
            icu_available: icuAvailable,
            operating_theatre_available: theatreAvailable,
            transplant_team_available: teamAvailable,
          }),
        });
      }
      setReadinessSaved(true);
      setTimeout(() => setReadinessSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update readiness:", err);
    } finally {
      setSavingReadiness(false);
    }
  };

  // Save workflow preferences
  const handleSavePreferences = () => {
    localStorage.setItem("setting_response_window", responseWindow);
    localStorage.setItem("setting_auto_forward", String(autoForward));
    localStorage.setItem("setting_audio_alerts", String(audioAlerts));
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 3000);
  };

  // Update password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setPasswordSuccess("Password successfully updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Export Audit CSV
  const handleExportCSV = () => {
    const headers = [
      "Match ID",
      "Organ ID",
      "Donor ID",
      "Recipient ID",
      "Organ Type",
      "Urgency Score",
      "Distance (km)",
      "Priority Score",
    ];
    const rows = matchRuns.map((r: any) => [
      r.match_id || r.id,
      r.organ_id || r.organId,
      r.donor_id || r.donorId,
      r.recipient_id || r.recipientId,
      r.organ_type || r.organType,
      r.urgency_score || 0,
      r.distance_km || 0,
      r.priority_score || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OrganMatch_Audit_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAllReady = icuAvailable && theatreAvailable && teamAvailable;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage preferences that are available in this OrganMatch system."
      />

      {/* 1. Account & Log Out Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <UserCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">
                  {user?.full_name || "Dr. Rajesh Choudhury"}
                </h2>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  {user?.role === "recipient_hospital"
                    ? "Recipient Hospital"
                    : "Donor Hospital"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {user?.hospital_name || "Choudhury Transplant Centre"} • Connected Session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      </Card>

      {/* 2. Hospital Infrastructure & Readiness Controls */}
      <Card className="overflow-hidden">
        <div className="border-b border-emerald-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Hospital className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Hospital Infrastructure & Readiness
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Live hospital status directly feeds the AI allocation algorithm’s readiness score.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isAllReady
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            <Activity size={13} />
            {isAllReady ? "Status: Ready (100%)" : "Status: Partially Ready"}
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ICU Toggle */}
            <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  ICU Bed Availability
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Critical post-op beds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIcuAvailable(!icuAvailable)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  icuAvailable ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    icuAvailable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Operating Theatre Toggle */}
            <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Operating Theatres
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clean surgical suites
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTheatreAvailable(!theatreAvailable)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  theatreAvailable ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    theatreAvailable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Surgical Team Toggle */}
            <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Transplant Surgical Team
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  On-call transplant surgeon
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTeamAvailable(!teamAvailable)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  teamAvailable ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    teamAvailable ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {readinessSaved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check size={14} />
                Readiness status updated in database
              </span>
            )}
            <button
              type="button"
              disabled={savingReadiness}
              onClick={handleSaveReadiness}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Save size={14} />
              <span>{savingReadiness ? "Updating..." : "Save Readiness State"}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 3. Organ Offer Response & Notification Preferences */}
      <Card className="overflow-hidden">
        <div className="border-b border-emerald-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Emergency Offer & Workflow Timers
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Define timeout response thresholds and automatic forwarding logic for organ allocations.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Countdown Window Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Hospital Offer Response Window
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "5 Minutes (Demo)", value: "5" },
                  { label: "15 Minutes", value: "15" },
                  { label: "30 Minutes", value: "30" },
                  { label: "60 Minutes", value: "60" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setResponseWindow(item.value)}
                    className={`rounded-xl border py-2.5 px-3 text-xs font-semibold transition ${
                      responseWindow === item.value
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Deadline given to the recipient hospital coordinator to ACCEPT or REJECT an offer.
              </p>
            </div>

            {/* Automated Actions */}
            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-xl border border-slate-200 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Automatic Forwarding on Expiry
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automatically re-assign and alert rank #2 recipient if offer expires.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoForward}
                  onChange={(e) => setAutoForward(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-start justify-between rounded-xl border border-slate-200 p-3.5">
                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Audio Chimes on Urgent Matches
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Audible warning notification when countdown is under 2 minutes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={audioAlerts}
                  onChange={(e) => setAudioAlerts(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100">
            {prefSaved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check size={14} />
                Preferences saved locally
              </span>
            )}
            <button
              type="button"
              onClick={handleSavePreferences}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
            >
              <Save size={14} />
              <span>Save Workflow Preferences</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 4. Clinical Allocation Advisory Thresholds */}
      <Card className="overflow-hidden">
        <div className="border-b border-emerald-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Clinical Cold Ischemia Maximum Advisory Limits
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Established organ survival parameters used in distance and transportation feasibility checks.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-2xl">❤️</span>
              <p className="text-xs font-semibold text-slate-700 mt-2">Heart</p>
              <p className="text-lg font-bold text-emerald-700">4 Hours</p>
              <p className="text-[10px] text-slate-500">Max preservation</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-2xl">🫁</span>
              <p className="text-xs font-semibold text-slate-700 mt-2">Lungs</p>
              <p className="text-lg font-bold text-emerald-700">6 Hours</p>
              <p className="text-[10px] text-slate-500">Max preservation</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-2xl">🫘</span>
              <p className="text-xs font-semibold text-slate-700 mt-2">Liver</p>
              <p className="text-lg font-bold text-emerald-700">12 Hours</p>
              <p className="text-[10px] text-slate-500">Max preservation</p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <span className="text-2xl">🩺</span>
              <p className="text-xs font-semibold text-slate-700 mt-2">Kidneys</p>
              <p className="text-lg font-bold text-emerald-700">24 Hours</p>
              <p className="text-[10px] text-slate-500">Pulsatile perfusion</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Security & Password Update */}
      <Card className="overflow-hidden">
        <div className="border-b border-emerald-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Security & Password Management
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Update coordinator account authentication credentials.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4 max-w-xl">
          {passwordError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPassword}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Lock size={14} />
            <span>{updatingPassword ? "Updating..." : "Update Password"}</span>
          </button>
        </form>
      </Card>

      {/* 6. Audit Data Export */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Export System Allocation Audit Log
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Download complete CSV report of all historical match runs and ranking scores for clinical compliance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shrink-0"
          >
            <Download size={15} />
            <span>Download Audit CSV</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
