import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Brain,
  ChevronDown,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Hospital,
  Building2,
} from "lucide-react";

import Button from "../../components/common/Button";

const API_URL = "http://127.0.0.1:8000";

/* -------------------------------------------------------------------------- */
/* Backend types                                                              */
/* -------------------------------------------------------------------------- */

interface BackendOrgan {
  organ_id: string;
  donor_id: string;
  organ_type: string;
  retrieval_datetime: string;
  preservation_method: string;
  organ_condition_category: string;
  status: string;
  current_hospital_id: string;
}

interface HospitalLocation {
  hospital_id: string;
  hospital_name: string;
  city: string;
  state?: string;
}

interface RecipientInfo {
  age: number | null;
  sex: string | null;
  blood_group: string | null;
  urgency_category: string | null;
}

interface ShapExplanation {
  urgency_score: number;
  waiting_time_score: number;
  distance_km: number;
  hospital_readiness_score: number;
}

interface RankedCandidate {
  rank: number;
  match_id: string;
  recipient_id: string;
  organ_id: string;
  organ_type: string;

  urgency_score: number;
  waiting_time_score: number;
  distance_km: number;
  estimated_travel_minutes?: number;
  estimated_travel_formatted?: string;
  donor_hospital?: HospitalLocation;
  recipient_hospital?: HospitalLocation;
  hospital_readiness_score: number;

  predicted_priority_score: number;

  shap_explanation: ShapExplanation;

  recipient: RecipientInfo;
}

interface RankingResponse {
  organ_id: string;
  organ_type: string;
  candidate_count: number;
  candidates: RankedCandidate[];
  message?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Matching() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramOrganId = searchParams.get("organId") || "";

  const [organs, setOrgans] = useState<BackendOrgan[]>([]);
  const [selectedOrganId, setSelectedOrganId] = useState(paramOrganId);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);

  const [isLoadingOrgans, setIsLoadingOrgans] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const [error, setError] = useState("");

  /* ------------------------------------------------------------------------ */
  /* Load available organs                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadOrgans() {
      try {
        setIsLoadingOrgans(true);
        setError("");

        const response = await fetch(`${API_URL}/api/organs`);

        if (!response.ok) {
          throw new Error("Failed to load organs");
        }

        const data: BackendOrgan[] = await response.json();

        const availableOrgans = data.filter(
          (organ) => organ.status === "Available"
        );

        setOrgans(availableOrgans);
        if (paramOrganId && availableOrgans.some((o) => o.organ_id === paramOrganId)) {
          setSelectedOrganId(paramOrganId);
        }
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load organs from the backend. Make sure the FastAPI server is running."
        );
      } finally {
        setIsLoadingOrgans(false);
      }
    }

    loadOrgans();
  }, [paramOrganId]);

  /* ------------------------------------------------------------------------ */
  /* Run AI ranking                                                            */
  /* ------------------------------------------------------------------------ */

  async function handleFindMatches() {
    if (!selectedOrganId) {
      setError("Please select an available organ first.");
      return;
    }

    try {
      setIsSearching(true);
      setError("");
      setRanking(null);

      const response = await fetch(
        `${API_URL}/api/ml/rank/${selectedOrganId}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to generate AI ranking"
        );
      }

      const data: RankingResponse = await response.json();

      setRanking(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate AI-assisted ranking."
      );
    } finally {
      setIsSearching(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Helper functions                                                          */
  /* ------------------------------------------------------------------------ */

  function formatScore(score: number) {
    return score.toFixed(3);
  }

  function formatDistance(distance: number) {
    return `${distance.toFixed(1)} km`;
  }

  function getScorePercentage(score: number) {
    return Math.max(0, Math.min(100, score * 100));
  }

  function getShapLabel(value: number) {
    if (value > 0) {
      return "Positive contribution";
    }

    if (value < 0) {
      return "Negative contribution";
    }

    return "No contribution";
  }

  function getShapSign(value: number) {
    if (value > 0) {
      return "+";
    }

    return "";
  }

  const selectedOrgan = organs.find(
    (organ) => organ.organ_id === selectedOrganId
  );

  /* ------------------------------------------------------------------------ */
  /* UI                                                                        */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          AI Organ Matching
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          AI-assisted recipient ranking using eligibility rules, XGBoost and
          SHAP explanations.
        </p>
      </div>

      {/* AI information banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

          <div>
            <p className="font-medium text-blue-900">
              AI-assisted decision support
            </p>

            <p className="mt-1 text-sm text-blue-800">
              The system filters eligible recipients and ranks them using the
              trained XGBoost model. SHAP explanations show the contribution
              of each ranking feature. Final transplant decisions require
              authorized human review.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />

            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Start matching */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5" />
            Start AI Matching
          </h2>
        </div>

        <div className="space-y-5 p-5">
          {/* Organ selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Select Available Organ
            </label>

            <div className="relative">
              <select
                value={selectedOrganId}
                onChange={(event) => {
                  setSelectedOrganId(event.target.value);
                  setRanking(null);
                  setError("");
                }}
                disabled={isLoadingOrgans || isSearching}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              >
                <option value="">
                  {isLoadingOrgans
                    ? "Loading available organs..."
                    : "Select an organ"}
                </option>

                {organs.map((organ) => (
                  <option
                    key={organ.organ_id}
                    value={organ.organ_id}
                  >
                    {organ.organ_id} — {organ.organ_type} — Donor{" "}
                    {organ.donor_id}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>

            {!isLoadingOrgans && organs.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                No available organs found in the backend database.
              </p>
            )}
          </div>

          {/* Selected organ */}
          {selectedOrgan && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Organ ID</p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedOrgan.organ_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Organ Type</p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedOrgan.organ_type}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Donor ID</p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedOrgan.donor_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Condition</p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedOrgan.organ_condition_category}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Find matches */}
          <Button
            onClick={handleFindMatches}
            disabled={!selectedOrganId || isSearching}
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running AI Matching...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Find AI-Ranked Recipients
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isSearching && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />

            <p className="mt-4 font-medium text-slate-900">
              Running eligibility checks and XGBoost ranking...
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Generating SHAP explanations for eligible candidates.
            </p>
          </div>
        </div>
      )}

      {/* Ranking results */}
      {ranking && !isSearching && (
        <>
          {/* Ranking summary */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />

                    <h2 className="text-lg font-semibold text-slate-900">
                      AI Ranking Generated
                    </h2>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {ranking.organ_type} • Organ {ranking.organ_id}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 px-4 py-3 text-center">
                  <p className="text-xs text-blue-700">
                    Eligible Candidates
                  </p>

                  <p className="text-2xl font-bold text-blue-900">
                    {ranking.candidate_count}
                  </p>
                </div>
              </div>

              {ranking.message && (
                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                  {ranking.message}
                </div>
              )}
            </div>
          </div>

          {/* No candidates */}
          {ranking.candidates.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="py-12 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />

                <p className="mt-3 font-medium text-slate-900">
                  No eligible recipients found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No candidate satisfied the current eligibility conditions
                  for this organ.
                </p>
              </div>
            </div>
          )}

          {/* Candidates */}
          <div className="space-y-5">
            {ranking.candidates.map((candidate) => {
              const priorityPercentage = getScorePercentage(
                candidate.predicted_priority_score
              );

              return (
                <div
                  key={candidate.match_id}
                  className="rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Candidate header */}
                  <div className="border-b border-slate-100 p-5">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                          #{candidate.rank}
                        </div>

                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Recipient {candidate.recipient_id}
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            Match ID: {candidate.match_id}
                          </p>
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center">
                        <p className="text-xs text-slate-500">
                          Predicted Priority
                        </p>

                        <p className="text-2xl font-bold text-blue-700">
                          {formatScore(
                            candidate.predicted_priority_score
                          )}
                        </p>

                        <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{
                              width: `${priorityPercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 p-5">
                    {/* Recipient information */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-500" />

                        <div>
                          <p className="text-xs text-slate-500">
                            Age / Sex
                          </p>

                          <p className="text-sm font-medium text-slate-900">
                            {candidate.recipient.age ?? "N/A"} /{" "}
                            {candidate.recipient.sex ?? "N/A"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Blood Group
                        </p>

                        <p className="text-sm font-medium text-slate-900">
                          {candidate.recipient.blood_group ?? "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Urgency
                        </p>

                        <p className="text-sm font-medium text-slate-900">
                          {candidate.recipient.urgency_category ??
                            "N/A"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-green-600" />

                        <div>
                          <p className="text-xs text-slate-500">
                            Eligibility
                          </p>

                          <p className="text-sm font-medium text-green-700">
                            Eligible
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Donor Hospital to Recipient Hospital Route & Distance */}
                    <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 via-slate-50 to-blue-50/70 p-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Donor Hospital */}
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                            <Hospital className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Donor Hospital (Procurement)</span>
                          </div>
                          <p className="mt-1 font-bold text-slate-900 text-sm">
                            {candidate.donor_hospital?.hospital_name || "Donor Hospital"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {candidate.donor_hospital?.city || "Chennai"}
                            {candidate.donor_hospital?.state ? `, ${candidate.donor_hospital.state}` : ""}
                          </p>
                        </div>

                        {/* Route Distance Indicator */}
                        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs min-w-[200px]">
                          <span className="text-sm font-extrabold text-emerald-700 flex items-center gap-1">
                            <MapPin size={14} className="text-emerald-600" />
                            {candidate.distance_km.toFixed(1)} km
                          </span>
                          <div className="my-1.5 flex items-center gap-1 w-full justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-400 to-blue-500" />
                            <ArrowRight size={13} className="text-blue-600 shrink-0" />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                            <Clock size={11} className="text-slate-400" />
                            Est. Travel: {candidate.estimated_travel_formatted || `${Math.round(candidate.distance_km)} mins`}
                          </span>
                        </div>

                        {/* Recipient Hospital */}
                        <div className="flex-1 sm:text-right">
                          <div className="flex items-center gap-1.5 sm:justify-end text-[11px] font-bold uppercase tracking-wider text-blue-800">
                            <Building2 className="h-3.5 w-3.5 text-blue-600" />
                            <span>Recipient Hospital (Transplant)</span>
                          </div>
                          <p className="mt-1 font-bold text-slate-900 text-sm">
                            {candidate.recipient_hospital?.hospital_name || "Recipient Hospital"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {candidate.recipient_hospital?.city || "Recipient City"}
                            {candidate.recipient_hospital?.state ? `, ${candidate.recipient_hospital.state}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Ranking features */}
                    <div>
                      <h3 className="mb-3 font-semibold text-slate-900">
                        Ranking Features
                      </h3>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-xs text-slate-500">
                            Urgency Score
                          </p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {formatScore(candidate.urgency_score)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-xs text-slate-500">
                            Waiting Time Score
                          </p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {formatScore(
                              candidate.waiting_time_score
                            )}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-500" />

                            <p className="text-xs text-slate-500">
                              Distance
                            </p>
                          </div>

                          <p className="mt-1 font-semibold text-slate-900">
                            {formatDistance(candidate.distance_km)}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-200 p-3">
                          <p className="text-xs text-slate-500">
                            Hospital Readiness
                          </p>

                          <p className="mt-1 font-semibold text-slate-900">
                            {formatScore(
                              candidate.hospital_readiness_score
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* SHAP */}
                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <Brain className="h-5 w-5 text-purple-700" />

                        <div>
                          <h3 className="font-semibold text-purple-900">
                            SHAP Explanation
                          </h3>

                          <p className="text-xs text-purple-700">
                            Feature contributions to this prediction
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          {
                            label: "Urgency",
                            value:
                              candidate.shap_explanation
                                .urgency_score,
                          },
                          {
                            label: "Waiting Time",
                            value:
                              candidate.shap_explanation
                                .waiting_time_score,
                          },
                          {
                            label: "Distance",
                            value:
                              candidate.shap_explanation
                                .distance_km,
                          },
                          {
                            label: "Hospital Readiness",
                            value:
                              candidate.shap_explanation
                                .hospital_readiness_score,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-4 rounded-lg bg-white p-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {item.label}
                              </p>

                              <p className="text-xs text-slate-500">
                                {getShapLabel(item.value)}
                              </p>
                            </div>

                            <span
                              className={`font-semibold ${
                                item.value >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {getShapSign(item.value)}
                              {item.value.toFixed(4)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="mt-3 text-xs text-purple-700">
                        Positive SHAP values push the prediction upward;
                        negative values push it downward relative to the
                        model's baseline.
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Clock className="h-4 w-4" />

                        <span>
                          AI ranking only — authorized review required
                        </span>
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() =>
                          navigate(
                            `/recipients/${candidate.recipient_id}`
                          )
                        }
                      >
                        View Recipient
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}