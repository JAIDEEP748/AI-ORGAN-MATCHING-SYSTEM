
import { useEffect, useState } from "react";
import Card from "../components/common/Card";
import PageHeader from "../components/common/PageHeader";
import {
  getReportsData,
  type ReportDistribution,
  type ReportsData,
} from "../services/reportService";

export default function Reports() {
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        const data = await getReportsData();

        if (active) {
          setReports(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load reports"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-slate-600">
        Loading reports...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Unable to load reports: {error}
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="p-6 text-slate-600">
        No report data available.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Live donor, recipient, organ, matching, and hospital summaries from the FastAPI backend."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Donors"
          value={reports.donorTotal}
        />

        <SummaryCard
          label="Total Recipients"
          value={reports.recipientTotal}
        />

        <SummaryCard
          label="Total Organs"
          value={reports.organTotal}
        />

        <SummaryCard
          label="Persisted Match Runs"
          value={reports.matchRunTotal}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ReportSection
          title="Donor Overview"
          total={reports.donorTotal}
          groups={[
            {
              title: "By Gender",
              values: reports.donorByGender,
            },
            {
              title: "By Blood Group",
              values: reports.donorByBloodGroup,
            },
          ]}
        />

        <ReportSection
          title="Recipient Overview"
          total={reports.recipientTotal}
          groups={[
            {
              title: "By Blood Group",
              values: reports.recipientByBloodGroup,
            },
            {
              title: "By Required Organ",
              values: reports.recipientByRequiredOrgan,
            },
            {
              title: "By Urgency",
              values: reports.recipientByUrgency,
            },
          ]}
        />

        <ReportSection
          title="Organ Overview"
          total={reports.organTotal}
          groups={[
            {
              title: "By Type",
              values: reports.organByType,
            },
            {
              title: "By Blood Group",
              values: reports.organByBloodGroup,
            },
            {
              title: "By Availability",
              values: reports.organByAvailability,
            },
          ]}
        />

        <ReportSection
          title="Matching Overview"
          total={reports.matchRunTotal}
          groups={[
            {
              title: "Eligibility Summary",
              values: reports.matchRunsByStatus,
            },
          ]}
          emptyMessage="No persisted matching runs are available."
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-emerald-100 px-6 py-5">
          <p className="text-sm font-semibold text-emerald-600">
            Hospital Overview
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Hospital-wise donor, organ, and recipient distribution
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left">
            <thead className="bg-emerald-50/60 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Hospital</th>
                <th className="px-6 py-4">City</th>
                <th className="px-6 py-4">Donors</th>
                <th className="px-6 py-4">Organs</th>
                <th className="px-6 py-4">Recipients</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reports.hospitals.map(
                ({ hospital, donors, organs, recipients }) => (
                  <tr
                    key={hospital.id}
                    className="hover:bg-emerald-50/40"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {hospital.name}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {hospital.city}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {donors}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {organs}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {recipients}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </Card>
  );
}

function ReportSection({
  title,
  total,
  groups,
  emptyMessage,
}: {
  title: string;
  total: number;
  groups: Array<{
    title: string;
    values: ReportDistribution[];
  }>;
  emptyMessage?: string;
}) {
  const hasData = groups.some(
    (group) => group.values.length > 0
  );

  return (
    <Card className="p-6">
      <p className="text-sm font-semibold text-emerald-600">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {total}
      </p>

      {!hasData && (
        <p className="mt-4 text-sm text-slate-500">
          {emptyMessage ??
            "No records are available for this report."}
        </p>
      )}

      <div className="mt-5 space-y-5">
        {groups.map((group) => (
          <DistributionList
            key={group.title}
            title={group.title}
            values={group.values}
          />
        ))}
      </div>
    </Card>
  );
}

function DistributionList({
  title,
  values,
}: {
  title: string;
  values: ReportDistribution[];
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>

      <div className="mt-3 space-y-2">
        {values.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {item.label}
              </span>

              <span className="text-slate-600">
                {item.count} ({item.percentage}%)
              </span>
            </div>

            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${item.percentage}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
