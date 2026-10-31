
import { API_BASE_URL } from "../config/api";

export interface ReportDistribution {
  label: string;
  count: number;
  percentage: number;
}

export interface HospitalReportRow {
  hospital: {
    id: string;
    name: string;
    city: string;
  };
  donors: number;
  organs: number;
  recipients: number;
}

export interface ReportsData {
  donorTotal: number;
  donorByGender: ReportDistribution[];
  donorByBloodGroup: ReportDistribution[];
  recipientTotal: number;
  recipientByBloodGroup: ReportDistribution[];
  recipientByRequiredOrgan: ReportDistribution[];
  recipientByUrgency: ReportDistribution[];
  organTotal: number;
  organByType: ReportDistribution[];
  organByBloodGroup: ReportDistribution[];
  organByAvailability: ReportDistribution[];
  matchRunTotal: number;
  matchRunsByStatus: ReportDistribution[];
  hospitals: HospitalReportRow[];
}

interface Donor {
  donor_id: string;
  sex: string;
  blood_group: string;
  hospital_id: string;
}

interface Recipient {
  recipient_id: string;
  blood_group: string;
  required_organ: string;
  urgency_category: string;
  hospital_id: string;
}

interface Organ {
  organ_id: string;
  donor_id: string;
  organ_type: string;
  status: string;
  current_hospital_id: string;
}

interface Hospital {
  hospital_id: string;
  hospital_name: string;
  city: string;
}

interface MatchRun {
  match_id: string;
  medical_eligible: boolean;
  blood_group_compatible: boolean;
  crossmatch_compatible: boolean;
  size_compatible: boolean;
  recipient_active: boolean;
  recipient_consent_verified: boolean;
  hospital_authorized: boolean;
  hospital_ready: boolean;
}

async function fetchData<T>(endpoint: string): Promise<T[]> {
  const url = `${API_BASE_URL}/api/${endpoint}`;

  let response: Response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      `Cannot connect to ${url}. Check whether the backend is running.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${endpoint}: HTTP ${response.status}`
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      `Unexpected response from ${endpoint}: expected an array`
    );
  }

  return data as T[];
}

function toDistribution(
  values: string[]
): ReportDistribution[] {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const label = value || "Unknown";

    counts.set(
      label,
      (counts.get(label) || 0) + 1
    );
  });

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({
      label,
      count,
      percentage:
        values.length === 0
          ? 0
          : Math.round((count / values.length) * 100),
    }));
}

function getMatchStatus(match: MatchRun): string {
  const eligible =
    match.medical_eligible === true &&
    match.blood_group_compatible === true &&
    match.crossmatch_compatible === true &&
    match.size_compatible === true &&
    match.recipient_active === true &&
    match.recipient_consent_verified === true &&
    match.hospital_authorized === true &&
    match.hospital_ready === true;

  return eligible ? "Eligible" : "Not eligible";
}

export async function getReportsData(): Promise<ReportsData> {
  const [
    donors,
    recipients,
    organs,
    hospitals,
    matchRuns,
  ] = await Promise.all([
    fetchData<Donor>("donors"),
    fetchData<Recipient>("recipients"),
    fetchData<Organ>("organs"),
    fetchData<Hospital>("hospitals"),
    fetchData<MatchRun>("match-runs"),
  ]);

  const donorBloodGroups = new Map(
    donors.map((donor) => [
      donor.donor_id,
      donor.blood_group,
    ])
  );

  return {
    donorTotal: donors.length,

    donorByGender: toDistribution(
      donors.map((donor) => donor.sex)
    ),

    donorByBloodGroup: toDistribution(
      donors.map((donor) => donor.blood_group)
    ),

    recipientTotal: recipients.length,

    recipientByBloodGroup: toDistribution(
      recipients.map((recipient) => recipient.blood_group)
    ),

    recipientByRequiredOrgan: toDistribution(
      recipients.map((recipient) => recipient.required_organ)
    ),

    recipientByUrgency: toDistribution(
      recipients.map((recipient) => recipient.urgency_category)
    ),

    organTotal: organs.length,

    organByType: toDistribution(
      organs.map((organ) => organ.organ_type)
    ),

    organByBloodGroup: toDistribution(
      organs.map(
        (organ) =>
          donorBloodGroups.get(organ.donor_id) || "Unknown"
      )
    ),

    organByAvailability: toDistribution(
      organs.map((organ) => organ.status)
    ),

    matchRunTotal: matchRuns.length,

    matchRunsByStatus: toDistribution(
      matchRuns.map(getMatchStatus)
    ),

    hospitals: hospitals.map((hospital) => ({
      hospital: {
        id: hospital.hospital_id,
        name: hospital.hospital_name,
        city: hospital.city,
      },

      donors: donors.filter(
        (donor) =>
          donor.hospital_id === hospital.hospital_id
      ).length,

      organs: organs.filter(
        (organ) =>
          organ.current_hospital_id === hospital.hospital_id
      ).length,

      recipients: recipients.filter(
        (recipient) =>
          recipient.hospital_id === hospital.hospital_id
      ).length,
    })),
  };
}
