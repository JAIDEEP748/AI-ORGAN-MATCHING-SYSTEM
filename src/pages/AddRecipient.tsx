import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

export default function AddRecipient() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    recipient_id: "",
    hospital_id: "",
    required_organ: "Kidney",
    age: "",
    sex: "Male",
    blood_group: "O+",
    registration_date: new Date().toISOString().split("T")[0],
    waiting_days: "0",
    urgency_category: "Moderate",
    medical_risk_level: "Medium",
    medical_history_category: "No_Major_History",
    active_status: "Active",
    consent_status: "Verified",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/recipients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_id: form.recipient_id,
          hospital_id: form.hospital_id,
          required_organ: form.required_organ,
          age: Number(form.age),
          sex: form.sex,
          blood_group: form.blood_group,
          registration_date: form.registration_date,
          waiting_days: Number(form.waiting_days),
          urgency_category: form.urgency_category,
          medical_risk_level: form.medical_risk_level,
          medical_history_category: form.medical_history_category,
          active_status: form.active_status,
          consent_status: form.consent_status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create recipient"
        );
      }

      setMessage("Recipient added successfully.");

      setTimeout(() => {
        navigate("/recipients");
      }, 1000);

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate("/recipients")}
          className="mb-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Recipients
        </button>

        <p className="text-sm font-semibold text-emerald-600">
          Recipient Registration
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Add New Recipient
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Register a recipient in the organ matching system.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">

          {/* Recipient ID */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Recipient ID
            </label>

            <input
              type="text"
              name="recipient_id"
              value={form.recipient_id}
              onChange={handleChange}
              placeholder="Example: R051"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Hospital ID */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Hospital ID
            </label>

            <input
              type="text"
              name="hospital_id"
              value={form.hospital_id}
              onChange={handleChange}
              placeholder="Example: H0001"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Age */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Age
            </label>

            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              min="1"
              max="120"
              placeholder="Age"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Sex */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Sex
            </label>

            <select
              name="sex"
              value={form.sex}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Blood Group */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Blood Group
            </label>

            <select
              name="blood_group"
              value={form.blood_group}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>

          {/* Required Organ */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Required Organ
            </label>

            <select
              name="required_organ"
              value={form.required_organ}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Kidney">Kidney</option>
              <option value="Heart">Heart</option>
              <option value="Liver">Liver</option>
              <option value="Lung">Lung</option>
              <option value="Pancreas">Pancreas</option>
              <option value="Intestine">Intestine</option>
            </select>
          </div>

          {/* Registration Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Registration Date
            </label>

            <input
              type="date"
              name="registration_date"
              value={form.registration_date}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Waiting Days */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Waiting Days
            </label>

            <input
              type="number"
              name="waiting_days"
              value={form.waiting_days}
              onChange={handleChange}
              min="0"
              placeholder="0"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Urgency Category
            </label>

            <select
              name="urgency_category"
              value={form.urgency_category}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Moderate">Moderate</option>
              <option value="Stable">Stable</option>
            </select>
          </div>

          {/* Medical Risk */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Medical Risk Level
            </label>

            <select
              name="medical_risk_level"
              value={form.medical_risk_level}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Medical History */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Medical History
            </label>

            <select
              name="medical_history_category"
              value={form.medical_history_category}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="No_Major_History">
                No Major History
              </option>
              <option value="Diabetes">Diabetes</option>
              <option value="Hypertension">Hypertension</option>
              <option value="Heart_Disease">Heart Disease</option>
              <option value="Kidney_Disease">Kidney Disease</option>
              <option value="Liver_Disease">Liver Disease</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Active Status */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Active Status
            </label>

            <select
              name="active_status"
              value={form.active_status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Consent */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Consent Status
            </label>

            <select
              name="consent_status"
              value={form.consent_status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

        </div>

        {/* Messages */}
        {message && (
          <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-6 flex justify-end gap-3">

          <button
            type="button"
            onClick={() => navigate("/recipients")}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Save Recipient
          </button>

        </div>
      </form>
    </div>
  );
}