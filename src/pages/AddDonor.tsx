import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

export default function AddDonor() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    donor_id: "",
    donor_type: "Deceased",
    age: "",
    sex: "Male",
    height_cm: "",
    weight_kg: "",
    blood_group: "O+",
    cause_of_death_category: "",
    medical_history_category: "",
    consent_status: "Verified",
    verification_status: "Verified",
    hospital_id: "",
    donor_status: "Active",
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
      const response = await fetch(`${API_URL}/api/donors`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donor_id: form.donor_id,
          donor_type: form.donor_type,
          age: Number(form.age),
          sex: form.sex,
          height_cm: Number(form.height_cm),
          weight_kg: Number(form.weight_kg),
          blood_group: form.blood_group,
          cause_of_death_category: form.cause_of_death_category,
          medical_history_category: form.medical_history_category,
          consent_status: form.consent_status,
          verification_status: form.verification_status,
          hospital_id: form.hospital_id,
          donor_status: form.donor_status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create donor");
      }

      setMessage("Donor added successfully.");

      setForm({
        donor_id: "",
        donor_type: "Deceased",
        age: "",
        sex: "Male",
        height_cm: "",
        weight_kg: "",
        blood_group: "O+",
        cause_of_death_category: "",
        medical_history_category: "",
        consent_status: "Verified",
        verification_status: "Verified",
        hospital_id: "",
        donor_status: "Active",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <button
          onClick={() => navigate("/")}
          className="mb-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Dashboard
        </button>

        <p className="text-sm font-semibold text-emerald-600">
          Donor Registration
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Add New Donor
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Register a donor in the organ matching system.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 sm:grid-cols-2">

          {/* Donor ID */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Donor ID
            </label>

            <input
              type="text"
              name="donor_id"
              value={form.donor_id}
              onChange={handleChange}
              placeholder="Example: D00021"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Donor Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Donor Type
            </label>

            <select
              name="donor_type"
              value={form.donor_type}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Deceased">Deceased</option>
              <option value="Living">Living</option>
            </select>
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

          {/* Height */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Height (cm)
            </label>

            <input
              type="number"
              name="height_cm"
              value={form.height_cm}
              onChange={handleChange}
              min="30"
              max="250"
              step="0.1"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Weight (kg)
            </label>

            <input
              type="number"
              name="weight_kg"
              value={form.weight_kg}
              onChange={handleChange}
              min="1"
              max="300"
              step="0.1"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
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
              placeholder="Example: H001"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Cause of Death */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Cause of Death Category
            </label>

            <input
              type="text"
              name="cause_of_death_category"
              value={form.cause_of_death_category}
              onChange={handleChange}
              placeholder="Example: Trauma"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Medical History */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Medical History Category
            </label>

            <input
              type="text"
              name="medical_history_category"
              value={form.medical_history_category}
              onChange={handleChange}
              placeholder="Example: Low Risk"
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            />
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

          {/* Verification */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Verification Status
            </label>

            <select
              name="verification_status"
              value={form.verification_status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Donor Status */}
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Donor Status
            </label>

            <select
              name="donor_status"
              value={form.donor_status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

        </div>

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

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Save Donor
          </button>
        </div>
      </form>
    </div>
  );
}