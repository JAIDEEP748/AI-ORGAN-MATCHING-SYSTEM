
import { useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import Card from "../components/common/Card";
import PageHeader from "../components/common/PageHeader";

type HospitalOffer = {
  notification_id: string;
  organ_id: string;
  recipient_id: string;
  hospital_id: string;
  rank: number;
  status: string;
  sent_at: string;
  expires_at: string | null;
  responded_at: string | null;
};

type HospitalResponse = {
  success: boolean;
  hospital_id: string;
  hospital_name: string;
  offers: HospitalOffer[];
};

type DisplayOffer = HospitalOffer & {
  hospital_name: string;
};

const hospitalIds = ["H0001", "H0002", "H0003", "H0004", "H0005"];

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function formatDate(date: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleString("en-IN");
}

export default function Notifications() {
  const [offers, setOffers] = useState<DisplayOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      try {
        const results = await Promise.all(
          hospitalIds.map(async (hospitalId) => {
            const response = await fetch(
              `${API_BASE}/api/ml/notifications/hospital/${hospitalId}`
            );

            if (!response.ok) {
              throw new Error(
                `Failed to load hospital ${hospitalId}: ${response.status}`
              );
            }

            const data: HospitalResponse = await response.json();

            return data.offers.map((offer) => ({
              ...offer,
              hospital_name: data.hospital_name,
            }));
          })
        );

        if (!active) return;

        const allOffers = results
          .flat()
          .sort(
            (a, b) =>
              new Date(b.sent_at).getTime() -
              new Date(a.sent_at).getTime()
          );

        setOffers(allOffers);
        setError("");
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error ? err.message : "Failed to fetch notifications"
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const activeOffers = offers.filter(
    (offer) =>
      offer.status.toLowerCase() === "sent" &&
      !!offer.expires_at &&
      new Date(offer.expires_at).getTime() > Date.now()
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Live hospital organ offers retrieved from FastAPI."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Total Offers</p>
          <p className="mt-2 text-3xl font-bold">{offers.length}</p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-slate-500">Active Offers</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {activeOffers}
          </p>
        </Card>

        <Card className="p-5">
          <p className="text-sm text-slate-500">Expired Offers</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {
              offers.filter(
                (offer) => offer.status.toLowerCase() === "expired"
              ).length
            }
          </p>
        </Card>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 p-12">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading notifications...
          </div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center">
            <Bell className="mb-3 h-8 w-8 text-slate-400" />
            <h2 className="font-semibold">No hospital offers found</h2>
            <p className="text-sm text-slate-500">
              Notifications will appear when organ offers are created.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-emerald-50 text-slate-600">
                <tr>
                  <th className="px-5 py-4">Hospital</th>
                  <th className="px-5 py-4">Organ ID</th>
                  <th className="px-5 py-4">Recipient</th>
                  <th className="px-5 py-4">Rank</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Sent At</th>
                  <th className="px-5 py-4">Expires At</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {offers.map((offer) => (
                  <tr
                    key={offer.notification_id}
                    className="hover:bg-emerald-50/40"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {offer.hospital_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {offer.hospital_id}
                      </p>
                    </td>

                    <td className="px-5 py-4">{offer.organ_id}</td>

                    <td className="px-5 py-4">{offer.recipient_id}</td>

                    <td className="px-5 py-4">{offer.rank}</td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          offer.status.toLowerCase() === "sent"
                            ? "bg-blue-100 text-blue-700"
                            : offer.status.toLowerCase() === "expired"
                            ? "bg-amber-100 text-amber-700"
                            : offer.status.toLowerCase() === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {offer.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {formatDate(offer.sent_at)}
                    </td>

                    <td className="px-5 py-4">
                      {formatDate(offer.expires_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
