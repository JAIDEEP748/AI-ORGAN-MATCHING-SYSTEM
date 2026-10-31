
import type { AuditEntry } from "../types/audit";

interface Organ {
  organ_id: string;
  donor_id: string;
  organ_type: string;
  status: string;
  retrieval_datetime: string | null;
  current_hospital_id: string;
}

interface Recipient {
  recipient_id: string;
  required_organ: string;
  urgency_category: string;
  active_status: string;
  registration_date: string | null;
}

interface HospitalOffer {
  notification_id: string;
  organ_id: string;
  recipient_id: string;
  hospital_id: string;
  rank: number;
  status: string;
  response: string | null;
  sent_at: string;
  responded_at: string | null;
  expired_at: string | null;
}

interface HospitalNotificationResponse {
  success: boolean;
  hospital_id: string;
  hospital_name: string;
  offers: HospitalOffer[];
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const hospitalIds = [
  "H0001",
  "H0002",
  "H0003",
  "H0004",
  "H0005",
];

async function fetchArray<T>(endpoint: string): Promise<T[]> {
  const response = await fetch(`${API_BASE}/api/${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${endpoint}: HTTP ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      `Unexpected response from ${endpoint}`
    );
  }

  return data as T[];
}

async function fetchHospitalOffers(): Promise<
  Array<HospitalOffer & { hospital_name: string }>
> {
  const results = await Promise.all(
    hospitalIds.map(async (hospitalId) => {
      const response = await fetch(
        `${API_BASE}/api/ml/notifications/hospital/${hospitalId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load notifications for ${hospitalId}`
        );
      }

      const data: HospitalNotificationResponse =
        await response.json();

      return data.offers.map((offer) => ({
        ...offer,
        hospital_name: data.hospital_name,
      }));
    })
  );

  return results.flat();
}

export async function getAuditEntries(): Promise<AuditEntry[]> {
  const [organs, recipients, offers] = await Promise.all([
    fetchArray<Organ>("organs"),
    fetchArray<Recipient>("recipients"),
    fetchHospitalOffers(),
  ]);

  const organEntries: AuditEntry[] = organs
    .filter((organ) => Boolean(organ.retrieval_datetime))
    .map((organ) => ({
      id: `organ-retrieval-${organ.organ_id}`,
      category: "organ",
      action: "Organ retrieval recorded",
      entityId: organ.organ_id,
      details:
        `${organ.organ_type} retrieved from donor ` +
        `${organ.donor_id}. Current status: ${organ.status}. ` +
        `Current hospital: ${organ.current_hospital_id}.`,
      date: organ.retrieval_datetime as string,
    }));

  const recipientEntries: AuditEntry[] = recipients
    .filter((recipient) => Boolean(recipient.registration_date))
    .map((recipient) => ({
      id: `recipient-registration-${recipient.recipient_id}`,
      category: "recipient",
      action: "Recipient registration record",
      entityId: recipient.recipient_id,
      details:
        `Required organ: ${recipient.required_organ}. ` +
        `Current urgency: ${recipient.urgency_category}. ` +
        `Current status: ${recipient.active_status}.`,
      date: recipient.registration_date as string,
    }));

  const matchingEntries: AuditEntry[] = offers.flatMap(
    (offer): AuditEntry[] => {
      const entries: AuditEntry[] = [];

      if (offer.sent_at) {
        entries.push({
          id: `offer-sent-${offer.notification_id}`,
          category: "matching",
          action: "Hospital organ offer sent",
          entityId: offer.notification_id,
          details:
            `Organ ${offer.organ_id} offered to recipient ` +
            `${offer.recipient_id} (rank ${offer.rank}) at ` +
            `${offer.hospital_name}.`,
          date: offer.sent_at,
        });
      }

      if (offer.expired_at) {
        entries.push({
          id: `offer-expired-${offer.notification_id}`,
          category: "matching",
          action: "Hospital organ offer expired",
          entityId: offer.notification_id,
          details:
            `Organ ${offer.organ_id}, recipient ` +
            `${offer.recipient_id}, rank ${offer.rank}. ` +
            `Hospital: ${offer.hospital_name}.`,
          date: offer.expired_at,
        });
      }

      if (offer.responded_at) {
        entries.push({
          id: `offer-response-${offer.notification_id}`,
          category: "matching",
          action: "Hospital offer response recorded",
          entityId: offer.notification_id,
          details:
            `Hospital: ${offer.hospital_name}. ` +
            `Organ: ${offer.organ_id}. ` +
            `Recipient: ${offer.recipient_id}. ` +
            `Response: ${offer.response || offer.status}.`,
          date: offer.responded_at,
        });
      }

      return entries;
    }
  );

  return [
    ...organEntries,
    ...recipientEntries,
    ...matchingEntries,
  ].sort((a, b) => {
    return (
      new Date(b.date.replace(" ", "T")).getTime() -
      new Date(a.date.replace(" ", "T")).getTime()
    );
  });
}
