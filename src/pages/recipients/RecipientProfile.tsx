import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  HeartPulse,
  MapPin,
  CalendarDays,
  Clock3,
  ShieldCheck,
  BrainCircuit,
  Search,
  AlertTriangle,
} from "lucide-react";
import type { Recipient } from "../../types/recipient";
import {
  getHospitalForRecipient,
  getRecipients,
} from "../../services/recipientService";

function urgencyClasses(
  urgency: Recipient["urgency"]
) {
  switch (urgency) {
    case "Critical":
      return "bg-red-50 border-red-200 text-red-700";

    case "High":
      return "bg-orange-50 border-orange-200 text-orange-700";

    case "Moderate":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";

    case "Stable":
      return "bg-emerald-50 border-emerald-200 text-emerald-700";
  }
}

export default function RecipientProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [recipient, setRecipient] = useState<Recipient | undefined>();
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
  let active = true;

  async function loadRecipient() {
    setLoading(true);
    setError("");
    setRecipient(undefined);

    try {
      const recipients = await getRecipients();
      const found = recipients.find((item) => item.id === id);

      if (active) {
        setRecipient(found);
      }
    } catch {
      if (active) {
        setError("Failed to load recipient information.");
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }

  void loadRecipient();

  return () => {
    active = false;
  };
}, [id]);

const hospital = recipient
  ? getHospitalForRecipient(recipient)
  : undefined;

if (loading) {
  return <div className="p-6">Loading recipient...</div>;
}

if (error) {
  return <div className="p-6 text-red-600">{error}</div>;
}

  if (!recipient) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Recipient not found
          </h1>

          <button
            onClick={() => navigate("/recipients")}
            className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 text-white"
          >
            Back to Recipients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/recipients")}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-emerald-700"
      >
        <ArrowLeft size={18} />
        Back to Recipients
      </button>

      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-emerald-600">
          Recipient Management
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Recipient Profile
        </h1>

        <p className="mt-2 text-slate-500">
          Complete recipient information and clinical eligibility.
        </p>
      </div>

      {/* Recipient Identity Card */}
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-sm">
              {recipient.id.replace("R", "")}
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Recipient ID
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-900">
                {recipient.id}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Registered {recipient.registrationDate}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${urgencyClasses(
              recipient.urgency
            )}`}
          >
            <AlertTriangle size={17} />

            {recipient.urgency} Priority
          </div>
        </div>
      </section>

      {/* Information Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Medical Information */}
        <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-emerald-600">
              Clinical Information
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Medical Information
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-7">
            <InfoItem
              label="Blood Group"
              value={recipient.bloodGroup}
            />

            <InfoItem
              label="Medical Status"
              value={recipient.medicalStatus}
              valueClass={
                recipient.medicalStatus === "Verified"
                  ? "text-emerald-700"
                  : "text-orange-700"
              }
            />

            <InfoItem
              label="Required Organ"
              value={recipient.requiredOrgan}
            />

            <InfoItem
              label="Urgency"
              value={recipient.urgency}
              valueClass={
                recipient.urgency === "Critical"
                  ? "text-red-700"
                  : recipient.urgency === "High"
                  ? "text-orange-700"
                  : "text-emerald-700"
              }
            />
          </div>
        </section>

        {/* Hospital Information */}
        <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-emerald-600">
              Care Facility
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Hospital Information
            </h2>
          </div>

          <div className="space-y-6">
            <InfoRow
              icon={<HeartPulse size={18} />}
              label="Hospital"
              value={hospital?.name ?? "Unknown facility"}
            />

            <InfoRow
              icon={<MapPin size={18} />}
              label="Location"
              value={hospital ? `${hospital.city}, ${hospital.state}` : "Location not recorded"}
            />

            <InfoRow
              icon={<CalendarDays size={18} />}
              label="Registration Date"
              value={recipient.registrationDate}
            />

            <InfoRow
              icon={<Clock3 size={18} />}
              label="Waiting List"
              value={`${recipient.waitingDays} days`}
            />
          </div>
        </section>
      </div>

      {/* Waiting List Priority */}
      <section className="rounded-2xl border border-red-100 bg-red-50/50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <AlertTriangle size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Waiting List Priority
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                This recipient has been waiting for{" "}
                <span className="font-semibold text-slate-900">
                  {recipient.waitingDays} days
                </span>{" "}
                and is currently classified as{" "}
                <span className="font-semibold text-red-700">
                  {recipient.urgency.toLowerCase()}
                </span>{" "}
                priority.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-red-100 bg-white px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Waiting
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {recipient.waitingDays}
            </p>

            <p className="text-xs text-slate-500">
              days
            </p>
          </div>
        </div>
      </section>

      {/* Clinical Decision Support */}
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BrainCircuit size={24} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Clinical Decision Support
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              The OrganMatch matching engine can evaluate this
              recipient against eligible donors using available
              clinical, compatibility, urgency and logistical
              information.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
                Blood Group
              </span>

              <span className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
                Organ Compatibility
              </span>

              <span className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
                Urgency
              </span>

              <span className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700">
                Waiting Time
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() =>
            navigate(`/matching?recipient=${recipient.id}`)
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Search size={19} />
          Find Compatible Donors
        </button>

        <button
          onClick={() => navigate("/recipients")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-6 py-3.5 font-semibold text-slate-700 transition hover:bg-emerald-50"
        >
          <ArrowLeft size={19} />
          Back to Recipient List
        </button>
      </div>

      {/* Verification Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
        <ShieldCheck
          size={20}
          className="mt-0.5 shrink-0 text-emerald-700"
        />

        <p className="text-sm leading-6 text-slate-600">
          Recipient information is displayed for clinical
          decision-support purposes. Final transplant decisions
          must be reviewed and authorized by qualified medical
          professionals.
        </p>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  valueClass = "text-slate-800",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className={`mt-2 font-semibold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>

      <p className="mt-1 font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}
