import { Routes, Route, Navigate } from "react-router-dom";

import DashboardLayout from "../components/layout/DashboardLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import Login from "../pages/auth/Login";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

import Dashboard from "../pages/Dashboard";

import Donors from "../pages/donors/Donors";
import DonorProfile from "../pages/donors/DonorProfile";

import Recipients from "../pages/recipients/Recipients";
import RecipientProfile from "../pages/recipients/RecipientProfile";

import OrganInventory from "../pages/organs/OrganInventory";

import Reports from "../pages/Reports";
import Notifications from "../pages/Notifications";
import AuditLogs from "../pages/AuditLogs";
import Settings from "../pages/Settings";

import Matching from "../pages/matching/Matching";

import AddDonor from "../pages/AddDonor";
import AddRecipient from "../pages/AddRecipient";
import AddOrgan from "../pages/AddOrgan";

import HospitalDashboard from "../pages/hospitals/HospitalDashboard";
import ClinicalReviews from "../pages/ClinicalReviews";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Login & Recovery Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Main App Routes inside Dashboard Layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Add records */}
        <Route path="/donors/add" element={<AddDonor />} />
        <Route path="/recipients/add" element={<AddRecipient />} />
        <Route path="/organs/add" element={<AddOrgan />} />

        {/* Donors */}
        <Route path="/donors" element={<Donors />} />
        <Route path="/donors/:id" element={<DonorProfile />} />

        {/* Recipients */}
        <Route path="/recipients" element={<Recipients />} />
        <Route path="/recipients/:id" element={<RecipientProfile />} />

        {/* Organ Inventory */}
        <Route path="/organs" element={<OrganInventory />} />

        {/* AI Matching */}
        <Route path="/matching" element={<Matching />} />

        {/* Reports */}
        <Route path="/reports" element={<Reports />} />

        {/* Notifications */}
        <Route path="/notifications" element={<Notifications />} />

        {/* Hospital Dashboard */}
        <Route path="/hospital" element={<HospitalDashboard />} />

        {/* Clinical Reviews */}
        <Route path="/clinical-reviews" element={<ClinicalReviews />} />

        {/* Audit Logs */}
        <Route path="/audit-logs" element={<AuditLogs />} />

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
