
import {
  ClipboardList,
  HeartPulse,
  PackageCheck,
  Stethoscope,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Badge from "../components/common/Badge";
import Card from "../components/common/Card";
import PageHeader from "../components/common/PageHeader";
import { getAuditEntries } from "../services/auditService";
import type {
  AuditCategory,
  AuditEntry,
} from "../types/audit";

type AuditFilter = "All" | AuditCategory;

const categoryLabels: Record<AuditCategory, string> = {
  organ: "Organ inventory",
  recipient: "Recipient records",
  matching: "Matching coordination",
};

const categoryBadgeTypes: Record<
  AuditCategory,
  "success" | "warning" | "danger" | "info" | "neutral"
> = {
  organ: "success",
  recipient: "warning",
  matching: "info",
};

function AuditIcon({
  category,
}: {
  category: AuditCategory;
}) {
  const className = "h-5 w-5";

  switch (category) {
    case "organ":
      return (
        <PackageCheck
          className={className}
          aria-hidden="true"
        />
      );

    case "recipient":
      return (
        <HeartPulse
          className={className}
          aria-hidden="true"
        />
      );

    case "matching":
      return (
        <Stethoscope
          className={className}
          aria-hidden="true"
        />
      );
  }
}

function formatAuditDate(date: string): string {
  const parsedDate = new Date(date.replace(" ", "T"));

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: date.includes("T") ? "short" : undefined,
  }).format(parsedDate);
}

export default function AuditLogs() {
  const [filter, setFilter] = useState<AuditFilter>("All");
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAuditLogs() {
      try {
        const data = await getAuditEntries();

        if (active) {
          setAuditEntries(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load audit records"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAuditLogs();

    return () => {
      active = false;
    };
  }, []);

  const filteredEntries = useMemo(
    () =>
      filter === "All"
        ? auditEntries
        : auditEntries.filter(
            (entry) => entry.category === filter
          ),
    [auditEntries, filter]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Database-derived activity history from organ retrievals, recipient registrations, and hospital offer events."
      />

      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-900">
              Available activity history
            </p>

            <p className="mt-1 text-sm text-slate-600">
              This view uses persisted record timestamps.
              User identities, edits, and approval histories
              are not available as a complete audit trail.
            </p>
          </div>

          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="audit-category-filter"
          >
            <span className="sr-only">
              Filter audit records by category
            </span>

            <select
              id="audit-category-filter"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as AuditFilter)
              }
              className="rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="All">All categories</option>
              <option value="organ">Organ inventory</option>
              <option value="recipient">Recipient records</option>
              <option value="matching">Matching coordination</option>
            </select>
          </label>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load audit records: {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-500">
            Loading activity history...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-600">
              <ClipboardList
                className="h-7 w-7"
                aria-hidden="true"
              />
            </div>

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No records available
            </h2>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              No timestamped records were found for this category.
            </p>
          </div>
        ) : (
          <ul
            className="divide-y divide-emerald-100"
            aria-label="Activity records"
          >
            {filteredEntries.map((entry) => (
              <AuditRow
                key={entry.id}
                entry={entry}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AuditRow({
  entry,
}: {
  entry: AuditEntry;
}) {
  return (
    <li className="flex gap-4 px-5 py-5 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <AuditIcon category={entry.category} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              {entry.action}
            </h2>

            <p className="mt-1 text-sm font-medium text-slate-700">
              Record: {entry.entityId}
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              {entry.details}
            </p>
          </div>

          <Badge
            type={categoryBadgeTypes[entry.category]}
          >
            {categoryLabels[entry.category]}
          </Badge>
        </div>

        <p className="mt-3 text-xs font-medium text-slate-500">
          {formatAuditDate(entry.date)}
        </p>
      </div>
    </li>
  );
}
