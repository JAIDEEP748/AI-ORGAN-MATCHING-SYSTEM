
import type { Recipient } from "../types/recipient";
import {
  hospitals,
  type Hospital,
} from "../data/datasets/hospitals";
import { API_BASE_URL } from "../config/api";

// Backend response type
interface BackendRecipient {
  recipient_id: string;
  hospital_id: string;
  required_organ: string;
  age: number;
  sex: string;
  blood_group: string;
  registration_date: string;
  waiting_days: number;
  urgency_category: string;
  medical_risk_level: string;
  medical_history_category: string;
  active_status: string;
  consent_status: string;
}

// Convert backend urgency to frontend urgency
function mapUrgency(
  urgency: string
): Recipient["urgency"] {
  switch (urgency) {
    case "Super_Urgent":
      return "Critical";

    case "Urgent":
      return "High";

    case "Priority":
      return "Moderate";

    case "Routine":
      return "Stable";

    default:
      return "Stable";
  }
}

// Convert backend status to frontend status
function mapStatus(
  status: string
): Recipient["status"] {
  switch (status) {
    case "Active":
      return "Waiting";

    case "Temporarily_Inactive":
      return "Inactive";

    default:
      return "Inactive";
  }
}

// Convert backend gender to frontend Gender type
function mapGender(
  sex: string
): Recipient["gender"] {
  switch (sex.trim().toLowerCase()) {
    case "male":
      return "Male";

    case "female":
      return "Female";

    default:
      return "Other";
  }
}

// Map backend recipient data to frontend recipient
function mapBackendRecipient(
  recipient: BackendRecipient
): Recipient {
  const hospital = hospitals.find(
    (item) => item.id === recipient.hospital_id
  );

  return {
    id: recipient.recipient_id,

    age: recipient.age,

    gender: mapGender(recipient.sex),

    bloodGroup: recipient.blood_group,

    requiredOrgan: recipient.required_organ,

    // Temporary display value until a clinical
    // verification field is available from the backend.
    // Medical risk is not verification status.
    medicalStatus: "Pending Verification",

    hospital:
      hospital?.name ?? recipient.hospital_id,

    location:
      hospital?.city ?? "Unknown",

    urgency: mapUrgency(
      recipient.urgency_category
    ),

    registrationDate:
      recipient.registration_date,

    waitingDays:
      recipient.waiting_days,

    status: mapStatus(
      recipient.active_status
    ),
  };
}

// Get all recipients from FastAPI
export async function getRecipients(): Promise<Recipient[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/recipients`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch recipients: HTTP ${response.status}`
    );
  }

  const data: BackendRecipient[] =
    await response.json();

  return data.map(mapBackendRecipient);
}

// Get recipient by ID
export async function getRecipientById(
  id: string
): Promise<Recipient | undefined> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/recipients/${encodeURIComponent(id)}`
    );

    if (!response.ok) {
      return undefined;
    }

    const data: BackendRecipient =
      await response.json();

    return mapBackendRecipient(data);
  } catch (error) {
    console.error(
      "Error fetching recipient:",
      error
    );

    return undefined;
  }
}

// Get hospital information for a recipient
export function getHospitalForRecipient(
  recipient: Recipient
): Hospital | undefined {
  return hospitals.find(
    (hospital) =>
      hospital.name === recipient.hospital
  );
}

// Search recipients
export async function searchRecipients(
  query: string
): Promise<Recipient[]> {
  const recipients = await getRecipients();

  const searchText = query.trim().toLowerCase();

  if (!searchText) {
    return recipients;
  }

  return recipients.filter((recipient) => {
    const hospital =
      getHospitalForRecipient(recipient);

    return (
      recipient.id
        .toLowerCase()
        .includes(searchText) ||

      (hospital?.name
        ?.toLowerCase()
        .includes(searchText) ?? false) ||

      (hospital?.city
        ?.toLowerCase()
        .includes(searchText) ?? false) ||

      recipient.bloodGroup
        .toLowerCase()
        .includes(searchText) ||

      recipient.requiredOrgan
        .toLowerCase()
        .includes(searchText)
    );
  });
}

// Filter recipients by blood group
export async function getRecipientsByBloodGroup(
  bloodGroup: string
): Promise<Recipient[]> {
  const recipients = await getRecipients();

  if (bloodGroup === "All") {
    return recipients;
  }

  return recipients.filter(
    (recipient) =>
      recipient.bloodGroup === bloodGroup
  );
}

// Filter recipients by required organ
export async function getRecipientsByOrgan(
  organType: string
): Promise<Recipient[]> {
  const recipients = await getRecipients();

  if (organType === "All") {
    return recipients;
  }

  return recipients.filter(
    (recipient) =>
      recipient.requiredOrgan === organType
  );
}

// Filter recipients by urgency
export async function getRecipientsByUrgency(
  urgency: string
): Promise<Recipient[]> {
  const recipients = await getRecipients();

  if (urgency === "All") {
    return recipients;
  }

  return recipients.filter(
    (recipient) =>
      recipient.urgency === urgency
  );
}

// Get waiting recipients
export async function getWaitingRecipients(): Promise<Recipient[]> {
  const recipients = await getRecipients();

  return recipients.filter(
    (recipient) =>
      recipient.status === "Waiting"
  );
}

// Get critical recipients
export async function getCriticalRecipients(): Promise<Recipient[]> {
  const recipients = await getRecipients();

  return recipients.filter(
    (recipient) =>
      recipient.urgency === "Critical"
  );
}

// Get high-priority recipients
export async function getHighPriorityRecipients(): Promise<Recipient[]> {
  const recipients = await getRecipients();

  return recipients.filter(
    (recipient) =>
      recipient.urgency === "High"
  );
}

// Get total recipient count
export async function getRecipientCount(): Promise<number> {
  const recipients = await getRecipients();

  return recipients.length;
}

// Get critical recipient count
export async function getCriticalRecipientCount(): Promise<number> {
  const recipients = await getRecipients();

  return recipients.filter(
    (recipient) =>
      recipient.urgency === "Critical"
  ).length;
}

// Get high-priority recipient count
export async function getHighPriorityRecipientCount(): Promise<number> {
  const recipients = await getRecipients();

  return recipients.filter(
    (recipient) =>
      recipient.urgency === "High"
  ).length;
}

// Get waiting recipient count
export async function getWaitingRecipientCount(): Promise<number> {
  const recipients = await getRecipients();

  return recipients.filter(
    (recipient) =>
      recipient.status === "Waiting"
  ).length;
}
