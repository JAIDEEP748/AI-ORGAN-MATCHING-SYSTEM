
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getHospitalNotifications,
  respondToHospitalOffer,
  type HospitalOffer,
} from "../../services/hospitalService";

type TimedHospitalOffer = HospitalOffer & {
  expires_at?: string | null;
  expired_at?: string | null;
};

type MonitoredOffer = TimedHospitalOffer & {
  hospital_name: string;
};

const hospitals = [
  { id: "H0001", name: "Choudhury Transplant Centre" },
  { id: "H0002", name: "Bakshi Transplant Centre" },
  { id: "H0003", name: "Kannan Transplant Centre" },
  { id: "H0004", name: "Hospital H0004" },
  { id: "H0005", name: "Kapoor Transplant Centre" },
];

function parseTimestamp(value?: string | null): number | null {
  if (!value) return null;

  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
    ? value
    : `${value}Z`;

  const parsed = Date.parse(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function remainingSeconds(
  offer: TimedHospitalOffer,
  now: number
): number | null {
  const deadline = parseTimestamp(offer.expires_at);

  if (deadline === null) return null;

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function countdownLabel(seconds: number | null): string {
  if (seconds === null) return "Deadline unavailable";

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainder
  ).padStart(2, "0")}`;
}

function canRespondToOffer(
  offer: TimedHospitalOffer,
  now: number
): boolean {
  const remaining = remainingSeconds(offer, now);

  return (
    offer.status.toLowerCase() === "sent" &&
    offer.can_respond &&
    remaining !== null &&
    remaining > 0
  );
}

export default function HospitalDashboard() {
  const [offers, setOffers] = useState<TimedHospitalOffer[]>([]);
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalId, setHospitalId] = useState("H0001");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState("");
  const [error, setError] = useState("");

  const [now, setNow] = useState(() => Date.now());

  const [allHospitalOffers, setAllHospitalOffers] = useState<
    MonitoredOffer[]
  >([]);
  const [monitorError, setMonitorError] = useState("");
  const [monitorLoading, setMonitorLoading] = useState(true);

  const selectedHospitalRef = useRef(hospitalId);
  const requestSequence = useRef(0);
  const hasLoaded = useRef(false);
  const monitorRequestSequence = useRef(0);

  const loadHospitalOffers = useCallback(
    async (selectedHospitalId: string, showLoading = false) => {
      const requestId = ++requestSequence.current;

      try {
        if (showLoading) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const data = await getHospitalNotifications(selectedHospitalId);

        if (
          requestId !== requestSequence.current ||
          selectedHospitalId !== selectedHospitalRef.current
        ) {
          return;
        }

        setHospitalName(data.hospital_name);
        setOffers(data.offers);
        setError("");
      } catch (caughtError) {
        if (
          requestId !== requestSequence.current ||
          selectedHospitalId !== selectedHospitalRef.current
        ) {
          return;
        }

        console.error("Failed to load hospital offers:", caughtError);

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load hospital offers."
        );
      } finally {
        if (requestId === requestSequence.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    []
  );

  const loadAllHospitalOffers = useCallback(async () => {
    const requestId = ++monitorRequestSequence.current;

    try {
      const results = await Promise.allSettled(
        hospitals.map(async (hospital) => {
          const data = await getHospitalNotifications(hospital.id);

          return data.offers.map(
            (offer): MonitoredOffer => ({
              ...offer,
              hospital_name: data.hospital_name || hospital.name,
            })
          );
        })
      );

      if (requestId !== monitorRequestSequence.current) return;

      const successfulOffers: MonitoredOffer[] = [];
      let failedCount = 0;

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          successfulOffers.push(...result.value);
        } else {
          failedCount += 1;
          console.error(
            "Failed to load hospital notifications:",
            result.reason
          );
        }
      });

      setAllHospitalOffers(successfulOffers);

      if (failedCount > 0) {
        setMonitorError(
          `Could not refresh ${failedCount} hospital(s). Results may be incomplete.`
        );
      } else {
        setMonitorError("");
      }
    } catch (caughtError) {
      if (requestId !== monitorRequestSequence.current) return;

      console.error("Failed to load notification monitor:", caughtError);

      setMonitorError("Unable to refresh all hospital notifications.");
    } finally {
      if (requestId === monitorRequestSequence.current) {
        setMonitorLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      void loadHospitalOffers(selectedHospitalRef.current, true);
    }

    const clock = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const refresh = window.setInterval(() => {
      void loadHospitalOffers(selectedHospitalRef.current);
    }, 5000);

    return () => {
      window.clearInterval(clock);
      window.clearInterval(refresh);
    };
  }, [loadHospitalOffers]);

  useEffect(() => {
    void loadAllHospitalOffers();

    const interval = window.setInterval(() => {
      void loadAllHospitalOffers();
    }, 5000);

    return () => {
      window.clearInterval(interval);
      monitorRequestSequence.current += 1;
    };
  }, [loadAllHospitalOffers]);

  function selectHospital(selectedHospitalId: string) {
    selectedHospitalRef.current = selectedHospitalId;

    setHospitalId(selectedHospitalId);
    setOffers([]);
    setHospitalName("");
    setError("");

    void loadHospitalOffers(selectedHospitalId, true);
  }

  function handleHospitalChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    selectHospital(event.target.value);
  }

  async function handleResponse(
    notificationId: string,
    response: "ACCEPT" | "REJECT"
  ) {
    const offer = offers.find(
      (item) => item.notification_id === notificationId
    );

    if (!offer || !canRespondToOffer(offer, Date.now())) {
      setError(
        "This offer has expired or is no longer available. Refreshing offers..."
      );

      await loadHospitalOffers(selectedHospitalRef.current);
      return;
    }

    const selectedHospitalId = selectedHospitalRef.current;

    try {
      setRespondingId(notificationId);
      setError("");

      await respondToHospitalOffer(notificationId, response);

      await Promise.all([
        loadHospitalOffers(selectedHospitalId),
        loadAllHospitalOffers(),
      ]);
    } catch (caughtError) {
      console.error(
        `Failed to ${response.toLowerCase()} hospital offer:`,
        caughtError
      );

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Failed to ${response.toLowerCase()} the offer.`
      );

      await loadHospitalOffers(selectedHospitalId);
      await loadAllHospitalOffers();
    } finally {
      setRespondingId("");
    }
  }

  const activeOffers = offers.filter((offer) =>
    canRespondToOffer(offer, now)
  );

  const previousOffers = offers.filter(
    (offer) => !canRespondToOffer(offer, now)
  );

  const respondedCount = offers.filter(
    (offer) => offer.response !== null && offer.response !== undefined
  ).length;

  const liveOffers = allHospitalOffers
    .filter((offer) => canRespondToOffer(offer, now))
    .sort((a, b) => {
      const aDeadline = parseTimestamp(a.expires_at) ?? Infinity;
      const bDeadline = parseTimestamp(b.expires_at) ?? Infinity;

      return aDeadline - bDeadline;
    });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading hospital dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ALL-HOSPITALS LIVE NOTIFICATION MONITOR */}
      <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Admin / Demo Monitoring
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              🔔 All-Hospitals Live Notification Monitor
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Track active organ offers across all five hospitals
              without manually switching hospitals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
            </span>

            <span className="text-xs font-semibold text-blue-700">
              Auto-refresh: 5 seconds
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-medium text-slate-600">
              Hospitals Monitored
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-700">
              {hospitals.length}
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-sm font-medium text-slate-600">
              Active Organ Offers
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {liveOffers.length}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-600">
              Total Recorded Offers
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {allHospitalOffers.length}
            </p>
          </div>
        </div>

        {monitorError && (
          <div
            className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
            role="alert"
          >
            <p className="text-sm font-medium text-amber-800">
              {monitorError}
            </p>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Live Organ Offers
            </h3>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {liveOffers.length} Active
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {liveOffers.map((offer) => {
              const seconds = remainingSeconds(offer, now);
              const urgent = seconds !== null && seconds <= 60;

              return (
                <div
                  key={offer.notification_id}
                  className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">
                          {offer.hospital_name}
                        </h4>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {offer.hospital_id}
                        </span>

                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          New Offer
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold">Organ:</span>{" "}
                          {offer.organ_type ?? "Organ"}
                        </p>

                        <p>
                          <span className="font-semibold">Organ ID:</span>{" "}
                          {offer.organ_id}
                        </p>

                        <p>
                          <span className="font-semibold">
                            Recipient:
                          </span>{" "}
                          {offer.recipient_id}
                        </p>

                        <p>
                          <span className="font-semibold">Rank:</span>{" "}
                          {offer.rank}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div
                        className={`rounded-xl border px-5 py-3 text-center ${
                          urgent
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Time Remaining
                        </p>

                        <p className="mt-1 font-mono text-2xl font-bold tabular-nums">
                          {countdownLabel(seconds)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => selectHospital(offer.hospital_id)}
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        View Hospital Offer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {liveOffers.length === 0 && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">
                  {monitorLoading
                    ? "Checking hospital notifications..."
                    : "No active organ offers across the monitored hospitals."}
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Academic prototype. This combined view is intended for
          authorized administrators and demonstration operators.
        </p>
      </div>

      {/* PAGE HEADER */}
      <div>
        <p className="text-sm font-semibold text-emerald-600">
          Hospital Portal
        </p>

        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Hospital Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {hospitalName}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Review organ offers received through the AI-assisted
              matching system.
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Offers refresh every 5 seconds
              {refreshing ? " · Refreshing..." : ""}.
            </p>
          </div>

          <div className="w-full lg:w-80">
            <label
              htmlFor="hospital"
              className="block text-sm font-semibold text-slate-700"
            >
              Hospital
            </label>

            <select
              id="hospital"
              value={hospitalId}
              onChange={handleHospitalChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.id} - {hospital.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div
          className="rounded-2xl border border-red-100 bg-red-50 p-5"
          role="alert"
        >
          <p className="text-sm font-semibold text-red-700">
            Action failed
          </p>

          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* STATISTICS */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Offers
          </p>

          <p className="mt-5 text-4xl font-bold text-slate-900">
            {offers.length}
          </p>

          <p className="mt-2 text-sm font-medium text-emerald-600">
            Offers received
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            New Offers
          </p>

          <p className="mt-5 text-4xl font-bold text-slate-900">
            {activeOffers.length}
          </p>

          <p className="mt-2 text-sm font-medium text-emerald-600">
            Awaiting hospital response
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Responded Offers
          </p>

          <p className="mt-5 text-4xl font-bold text-slate-900">
            {respondedCount}
          </p>

          <p className="mt-2 text-sm font-medium text-emerald-600">
            Accepted or rejected
          </p>
        </div>
      </div>

      {/* NEW ORGAN OFFERS */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              New Organ Offers
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Organ offers currently awaiting your hospital's response.
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            🫀
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {activeOffers.map((offer) => {
            const seconds = remainingSeconds(offer, now);
            const urgent = seconds !== null && seconds <= 60;

            return (
              <div
                key={offer.notification_id}
                className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {offer.organ_type ?? "Organ"}
                      </h3>

                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        New Offer
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Organ ID
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {offer.organ_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Candidate Rank
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          Rank {offer.rank}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Recipient ID
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {offer.recipient_id}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Blood Group
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {offer.recipient_blood_group ?? "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Urgency
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {offer.recipient_urgency ?? "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Received
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {parseTimestamp(offer.sent_at) !== null
                            ? new Date(
                                parseTimestamp(offer.sent_at)!
                              ).toLocaleString()
                            : "Not available"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3">
                    <div
                      className={`rounded-xl border px-5 py-3 text-center ${
                        urgent
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide">
                        Time Remaining
                      </p>

                      <p
                        className="mt-1 font-mono text-3xl font-bold tabular-nums"
                        aria-live="off"
                      >
                        {countdownLabel(seconds)}
                      </p>

                      <p className="mt-1 text-xs">
                        Respond before the deadline
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <button
                        type="button"
                        disabled={
                          respondingId !== "" ||
                          !canRespondToOffer(offer, now)
                        }
                        onClick={() =>
                          void handleResponse(
                            offer.notification_id,
                            "ACCEPT"
                          )
                        }
                        className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {respondingId === offer.notification_id
                          ? "Processing..."
                          : "Accept"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          respondingId !== "" ||
                          !canRespondToOffer(offer, now)
                        }
                        onClick={() =>
                          void handleResponse(
                            offer.notification_id,
                            "REJECT"
                          )
                        }
                        className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {respondingId === offer.notification_id
                          ? "Processing..."
                          : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {activeOffers.length === 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-600">
                No new organ offers are currently waiting for a response.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PREVIOUS OFFERS */}
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Previous Offers
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Previously received organ offers, expired deadlines,
          and hospital responses.
        </p>

        <div className="mt-6 space-y-3">
          {previousOffers.map((offer) => {
            const seconds = remainingSeconds(offer, now);

            const isExpired =
              offer.status.toLowerCase() === "expired" ||
              (offer.status.toLowerCase() === "sent" &&
                seconds === 0);

            const label =
              offer.response ??
              (isExpired ? "Expired" : offer.status);

            const badgeClass =
              offer.response === "ACCEPT"
                ? "bg-emerald-100 text-emerald-700"
                : offer.response === "REJECT"
                ? "bg-red-100 text-red-700"
                : isExpired
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-700";

            return (
              <div
                key={offer.notification_id}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {offer.organ_type ?? "Organ"} · {offer.organ_id}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Recipient {offer.recipient_id} · Rank {offer.rank}
                  </p>

                  {isExpired && (
                    <p className="mt-1 text-xs text-amber-700">
                      Response deadline passed
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                >
                  {label}
                </span>
              </div>
            );
          })}

          {previousOffers.length === 0 && (
            <p className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
              No previous offers found.
            </p>
          )}
        </div>
      </div>

      {/* PROTOTYPE ENVIRONMENT */}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Hospital Portal
            </p>

            <p className="mt-1 text-xs text-emerald-700/70">
              Academic prototype. Hospital offers are loaded from
              FastAPI and SQLite.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>

            <span className="text-xs font-semibold text-emerald-700">
              Backend Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
