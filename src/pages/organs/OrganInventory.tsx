import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import {
  HeartPulse,
  Clock,
  AlertTriangle,
  MapPin,
  Sparkles,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Timer,
  Zap,
} from "lucide-react";

const API_URL = "http://127.0.0.1:8000";

type Organ = {
  organ_id: string;
  donor_id: string;
  organ_type: string;
  retrieval_datetime: string;
  preservation_method: string;
  organ_condition_category: string;
  status: string;
  current_hospital_id: string;
  expiry_datetime?: string;
  max_preservation_hours?: number;
};

type Donor = {
  donor_id: string;
  blood_group: string;
};

type Hospital = {
  hospital_id: string;
  hospital_name: string;
  city: string;
  state?: string;
};

// Default Cold Ischemia Times (in hours)
const STANDARD_PRESERVATION_HOURS: Record<string, number> = {
  Heart: 4,
  Lung: 6,
  Liver: 12,
  Kidney: 24,
  Pancreas: 12,
  Intestine: 8,
};

export default function OrganInventory() {
  const navigate = useNavigate();

  const [organs, setOrgans] = useState<Organ[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  const [search, setSearch] = useState("");
  const [organType, setOrganType] = useState("All");
  const [activeTab, setActiveTab] = useState<"active" | "expired" | "all">("active");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const [editingOrganId, setEditingOrganId] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [savingOrganId, setSavingOrganId] = useState<string | null>(null);

  // Live timer tick every 1 second
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data from FastAPI
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [organsResponse, donorsResponse, hospitalsResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/organs`),
          fetch(`${API_URL}/api/donors`),
          fetch(`${API_URL}/api/hospitals`),
        ]);

      if (!organsResponse.ok) {
        throw new Error("Failed to fetch organs.");
      }
      if (!donorsResponse.ok) {
        throw new Error("Failed to fetch donors.");
      }
      if (!hospitalsResponse.ok) {
        throw new Error("Failed to fetch hospitals.");
      }

      const organsData: Organ[] = await organsResponse.json();
      const donorsData: Donor[] = await donorsResponse.json();
      const hospitalsData: Hospital[] = await hospitalsResponse.json();

      setOrgans(organsData);
      setDonors(donorsData);
      setHospitals(hospitalsData);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load organ inventory.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to compute remaining milliseconds and expiration details
  const getExpirationInfo = (organ: Organ) => {
    let expiryMs: number;

    if (organ.expiry_datetime) {
      expiryMs = new Date(organ.expiry_datetime).getTime();
    } else {
      const retrievalMs = new Date(organ.retrieval_datetime).getTime();
      const maxHours =
        organ.max_preservation_hours ||
        STANDARD_PRESERVATION_HOURS[organ.organ_type] ||
        12;
      expiryMs = retrievalMs + maxHours * 60 * 60 * 1000;
    }

    const totalDurationMs =
      (organ.max_preservation_hours ||
        STANDARD_PRESERVATION_HOURS[organ.organ_type] ||
        12) *
      60 *
      60 *
      1000;

    const remainingMs = expiryMs - now;
    const isExpired = remainingMs <= 0 || organ.status === "Expired";

    let remainingFormatted = "00h 00m 00s";
    let percentRemaining = 0;

    if (!isExpired && remainingMs > 0) {
      const totalSeconds = Math.floor(remainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      remainingFormatted = `${String(hours).padStart(2, "0")}h ${String(
        minutes
      ).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

      percentRemaining = Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100));
    }

    return {
      isExpired,
      remainingMs,
      remainingFormatted,
      percentRemaining,
      expiryDate: new Date(expiryMs),
    };
  };

  // Automated auto-removal when an organ expires during active session
  useEffect(() => {
    organs.forEach((organ) => {
      if (organ.status === "Available") {
        const info = getExpirationInfo(organ);
        if (info.isExpired) {
          // Auto remove: trigger backend expire endpoint
          fetch(`${API_URL}/api/organs/${organ.organ_id}/expire`, {
            method: "PUT",
          }).catch(console.error);

          setOrgans((prev) =>
            prev.map((o) =>
              o.organ_id === organ.organ_id ? { ...o, status: "Expired" } : o
            )
          );

          setNotification(
            `⚠️ Organ ${organ.organ_id} (${organ.organ_type}) Cold Ischemia window has elapsed and was automatically removed from active matching.`
          );
        }
      }
    });
  }, [now, organs]);

  const getDonor = (donorId: string) => {
    return donors.find((donor) => donor.donor_id === donorId);
  };

  const getHospital = (hospitalId: string) => {
    return hospitals.find((hospital) => hospital.hospital_id === hospitalId);
  };

  const startEditing = (organ: Organ) => {
    setEditingOrganId(organ.organ_id);
    setSelectedHospitalId(organ.current_hospital_id);
  };

  const cancelEditing = () => {
    setEditingOrganId(null);
    setSelectedHospitalId("");
  };

  const saveHospital = async (organId: string) => {
    if (!selectedHospitalId) return;

    try {
      setSavingOrganId(organId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/organs/${organId}/hospital?hospital_id=${encodeURIComponent(
          selectedHospitalId
        )}`,
        { method: "PUT" }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to update hospital.");
      }

      setOrgans((currentOrgans) =>
        currentOrgans.map((organ) =>
          organ.organ_id === organId
            ? { ...organ, current_hospital_id: data.current_hospital_id }
            : organ
        )
      );

      setEditingOrganId(null);
      setSelectedHospitalId("");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update organ hospital.");
      }
    } finally {
      setSavingOrganId(null);
    }
  };

  // Immediate manual/demo expire trigger
  const handleImmediateExpire = async (organId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/organs/${organId}/expire`, {
        method: "PUT",
      });
      if (response.ok) {
        setOrgans((prev) =>
          prev.map((o) =>
            o.organ_id === organId ? { ...o, status: "Expired" } : o
          )
        );
        setNotification(
          `Organ ${organId} has expired and was auto-removed from Available inventory.`
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Permanently delete organ
  const handleDeleteOrgan = async (organId: string) => {
    if (!window.confirm(`Permanently remove organ ${organId} from database?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/organs/${organId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setOrgans((prev) => prev.filter((o) => o.organ_id !== organId));
        setNotification(`Organ ${organId} removed from inventory.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered organs
  const filteredOrgans = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return organs.filter((organ) => {
      const donor = getDonor(organ.donor_id);
      const hospital = getHospital(organ.current_hospital_id);
      const expInfo = getExpirationInfo(organ);

      const matchesSearch =
        !searchText ||
        organ.organ_id.toLowerCase().includes(searchText) ||
        organ.donor_id.toLowerCase().includes(searchText) ||
        organ.organ_type.toLowerCase().includes(searchText) ||
        donor?.blood_group?.toLowerCase().includes(searchText) ||
        hospital?.hospital_name?.toLowerCase().includes(searchText) ||
        hospital?.city?.toLowerCase().includes(searchText);

      const matchesType =
        organType === "All" || organ.organ_type === organType;

      let matchesTab = true;
      if (activeTab === "active") {
        matchesTab = organ.status === "Available" && !expInfo.isExpired;
      } else if (activeTab === "expired") {
        matchesTab = organ.status === "Expired" || expInfo.isExpired;
      }

      return matchesSearch && matchesType && matchesTab;
    });
  }, [search, organType, activeTab, organs, donors, hospitals, now]);

  const activeCount = organs.filter(
    (o) => o.status === "Available" && !getExpirationInfo(o).isExpired
  ).length;

  const expiredCount = organs.filter(
    (o) => o.status === "Expired" || getExpirationInfo(o).isExpired
  ).length;

  const organTypes = [...new Set(organs.map((organ) => organ.organ_type))];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <PageHeader
          title="Organ Inventory"
          description="Real-time Cold Ischemia preservation monitoring, automated expiry removal, and hospital location registry."
        />

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            title="Refresh Inventory"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw size={15} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => navigate("/organs/add")}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
          >
            + Add Organ
          </button>
        </div>
      </div>

      {/* Expiry Banner / Toast */}
      {notification && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm font-medium">{notification}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-6">
          <p className="font-semibold text-red-600">Failed to load organ inventory</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <p className="mt-2 text-sm text-slate-500">
            Make sure the FastAPI backend is running on http://127.0.0.1:8000.
          </p>
        </Card>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "active"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <CheckCircle2 size={15} />
            <span>Active Available</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("expired")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "expired"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Clock size={15} />
            <span>Auto-Removed / Expired</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
              {expiredCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "all"
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>All Records</span>
            <span className="rounded-full bg-slate-300 px-2 py-0.5 text-xs font-bold text-slate-800">
              {organs.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Timer size={14} className="text-emerald-600" />
          <span>Real-time Cold Ischemia countdown active (1s live tick)</span>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search organ ID, donor ID, blood group, or hospital..."
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
          />

          <select
            value={organType}
            onChange={(event) => setOrganType(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-500"
          >
            <option value="All">All Organ Types</option>
            {organTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="p-8 text-center">
          <p className="text-slate-600">Loading organ inventory & preservation statuses...</p>
        </Card>
      )}

      {/* No organs empty state */}
      {!loading && !error && filteredOrgans.length === 0 && (
        <Card className="p-12 text-center">
          <Clock className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            {activeTab === "active"
              ? "No active organs found"
              : activeTab === "expired"
              ? "No auto-removed or expired organs"
              : "No organs matching your query"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {activeTab === "active"
              ? "All organs may have exceeded their preservation time or been allocated."
              : "Try adjusting filters or adding a new organ."}
          </p>
        </Card>
      )}

      {/* Organ Grid */}
      {!loading && !error && (
        <div className="grid gap-5 md:grid-cols-2">
          {filteredOrgans.map((item) => {
            const donor = getDonor(item.donor_id);
            const hospital = getHospital(item.current_hospital_id);
            const isEditing = editingOrganId === item.organ_id;
            const isSaving = savingOrganId === item.organ_id;
            const expInfo = getExpirationInfo(item);

            const badgeType = expInfo.isExpired
              ? "danger"
              : item.status === "Available"
              ? "success"
              : item.status === "Reserved"
              ? "warning"
              : item.status === "Allocated"
              ? "info"
              : "neutral";

            // Visual color for timer
            const timerColor = expInfo.isExpired
              ? "text-red-600 bg-red-50 border-red-200"
              : expInfo.percentRemaining < 25
              ? "text-red-700 bg-red-50 border-red-300 animate-pulse"
              : expInfo.percentRemaining < 50
              ? "text-amber-700 bg-amber-50 border-amber-300"
              : "text-emerald-700 bg-emerald-50 border-emerald-200";

            const progressColor = expInfo.isExpired
              ? "bg-red-500"
              : expInfo.percentRemaining < 25
              ? "bg-red-500"
              : expInfo.percentRemaining < 50
              ? "bg-amber-500"
              : "bg-emerald-500";

            return (
              <Card
                key={item.organ_id}
                className={`p-5 transition-all ${
                  expInfo.isExpired ? "border-red-200 bg-red-50/20" : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        expInfo.isExpired
                          ? "bg-red-100 text-red-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <HeartPulse size={22} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">
                          {item.organ_type}
                        </h3>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                          {item.organ_id}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Donor: <span className="font-semibold text-slate-700">{item.donor_id}</span> • Blood Group:{" "}
                        <span className="font-semibold text-emerald-700">
                          {donor?.blood_group ?? "O+"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Badge type={badgeType}>
                    {expInfo.isExpired ? "Expired / Auto-Removed" : item.status}
                  </Badge>
                </div>

                {/* Cold Ischemia & Expiration Countdown Widget */}
                <div className="mt-4 rounded-xl border p-3.5 space-y-2 border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <Clock size={14} className={expInfo.isExpired ? "text-red-500" : "text-emerald-600"} />
                      <span>Cold Ischemia Time Window</span>
                    </div>

                    <div className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold ${timerColor}`}>
                      {expInfo.isExpired ? (
                        <span>EXPIRED (Auto-Removed)</span>
                      ) : (
                        <span>⏱️ {expInfo.remainingFormatted} left</span>
                      )}
                    </div>
                  </div>

                  {/* Countdown Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${progressColor}`}
                      style={{
                        width: expInfo.isExpired ? "100%" : `${expInfo.percentRemaining}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Max Preservation:{" "}
                      <strong className="text-slate-700">
                        {item.max_preservation_hours ||
                          STANDARD_PRESERVATION_HOURS[item.organ_type] ||
                          12}
                        h
                      </strong>{" "}
                      ({item.preservation_method || "Cold Storage"})
                    </span>
                    <span>
                      Condition: <strong className="text-slate-700">{item.organ_condition_category}</strong>
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  {/* Location / Donor Hospital */}
                  <div className="col-span-2 rounded-lg border border-slate-100 bg-white p-3">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin size={13} className="text-emerald-600" />
                      <span className="font-semibold uppercase tracking-wider text-[10px]">
                        Donor Hospital Location
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 flex gap-2">
                        <select
                          value={selectedHospitalId}
                          onChange={(e) => setSelectedHospitalId(e.target.value)}
                          className="flex-1 rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-500"
                        >
                          <option value="">Select hospital</option>
                          {hospitals.map((h) => (
                            <option key={h.hospital_id} value={h.hospital_id}>
                              {h.hospital_id} - {h.hospital_name} ({h.city})
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => saveHospital(item.organ_id)}
                          disabled={isSaving || !selectedHospitalId}
                          className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="font-semibold text-slate-900">
                          {hospital
                            ? `${hospital.hospital_name} (${hospital.city})`
                            : item.current_hospital_id || "Hospital not assigned"}
                        </p>
                        <button
                          onClick={() => startEditing(item)}
                          className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 underline"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!expInfo.isExpired && item.status === "Available" ? (
                      <button
                        onClick={() => navigate(`/matching?organId=${item.organ_id}`)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
                      >
                        <Sparkles size={13} />
                        <span>Run AI Match</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        <AlertTriangle size={12} />
                        Auto-Removed from Matching
                      </span>
                    )}

                    {/* Quick Expire Demo Button for active organs */}
                    {!expInfo.isExpired && (
                      <button
                        type="button"
                        onClick={() => handleImmediateExpire(item.organ_id)}
                        title="Simulate immediate expiration and auto-removal"
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition"
                      >
                        <Zap size={12} />
                        <span>Quick Expire (Demo)</span>
                      </button>
                    )}
                  </div>

                  {/* Delete option */}
                  <button
                    type="button"
                    onClick={() => handleDeleteOrgan(item.organ_id)}
                    title="Permanently remove organ"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
