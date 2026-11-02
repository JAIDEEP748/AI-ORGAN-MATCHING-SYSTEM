import {
  Bell,
  Menu,
  Search,
  ChevronDown,
  X,
  Heart,
  User,
  HeartPulse,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";

import { getNotifications } from "../../services/notificationService";
import { donors as initialDonors } from "../../data/datasets/donors";
import { recipients as initialRecipients } from "../../data/datasets/recipients";
import { organs as initialOrgans } from "../../data/datasets/organs";
import { useAuth } from "../../context/AuthContext";

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [hasNotifications, setHasNotifications] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const notifications = await getNotifications();
        setHasNotifications(notifications.length > 0);
      } catch (error) {
        console.error("Failed to load notifications:", error);
        setHasNotifications(false);
      }
    }

    loadNotifications();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Search filtering logic
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const matchedDonors = trimmedQuery
    ? initialDonors.filter(
        (d) =>
          d.id.toLowerCase().includes(trimmedQuery) ||
          d.bloodGroup.toLowerCase().includes(trimmedQuery) ||
          d.gender?.toLowerCase().includes(trimmedQuery) ||
          d.hospitalId?.toLowerCase().includes(trimmedQuery)
      ).slice(0, 4)
    : [];

  const matchedRecipients = trimmedQuery
    ? initialRecipients.filter(
        (r) =>
          r.id.toLowerCase().includes(trimmedQuery) ||
          r.requiredOrgan.toLowerCase().includes(trimmedQuery) ||
          r.bloodGroup.toLowerCase().includes(trimmedQuery) ||
          r.urgency?.toLowerCase().includes(trimmedQuery)
      ).slice(0, 4)
    : [];

  const matchedOrgans = trimmedQuery
    ? initialOrgans.filter(
        (o) =>
          o.id.toLowerCase().includes(trimmedQuery) ||
          o.organType.toLowerCase().includes(trimmedQuery) ||
          o.availabilityStatus.toLowerCase().includes(trimmedQuery)
      ).slice(0, 4)
    : [];

  const hasSearchResults =
    matchedDonors.length > 0 ||
    matchedRecipients.length > 0 ||
    matchedOrgans.length > 0;

  const handleSelectResult = (path: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    navigate(path);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && hasSearchResults) {
      if (matchedDonors.length > 0) {
        handleSelectResult(`/donors/${matchedDonors[0].id}`);
      } else if (matchedRecipients.length > 0) {
        handleSelectResult(`/recipients/${matchedRecipients[0].id}`);
      } else if (matchedOrgans.length > 0) {
        handleSelectResult("/organs");
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-20 border-b border-[#174D40] bg-[#0F3D32] backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu */}
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-xl p-2.5 text-[#527064] transition hover:bg-white/70 hover:text-[#173A2A] lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>

          {/* Title */}
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white">
              Transplant Coordination Center
            </p>
            <p className="text-xs text-emerald-100/70">
              Emergency Organ Matching Platform
            </p>
          </div>
        </div>

        {/* Working Real-Time Search Bar */}
        <div
          ref={searchContainerRef}
          className="relative mx-4 hidden max-w-md flex-1 md:block"
        >
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#789087]"
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search donors, recipients, matches..."
              className="h-11 w-full rounded-xl border border-[#2B6254] bg-[#174D40] pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-emerald-100/60 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-900/30"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200/70 hover:text-white"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Dropdown Results */}
          {searchOpen && trimmedQuery && (
            <div className="absolute left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-3 shadow-2xl z-50 text-slate-800">
              {hasSearchResults ? (
                <div className="space-y-3">
                  
                  {/* Donors Results */}
                  {matchedDonors.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        <Heart size={12} />
                        Donors ({matchedDonors.length})
                      </p>
                      <div className="space-y-1 mt-1">
                        {matchedDonors.map((donor) => (
                          <button
                            key={donor.id}
                            type="button"
                            onClick={() =>
                              handleSelectResult(`/donors/${donor.id}`)
                            }
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600">
                                {donor.id}
                              </span>
                              <span>
                                {donor.bloodGroup} • {donor.gender || "Donor"} • Age {donor.age}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              View Profile →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recipients Results */}
                  {matchedRecipients.length > 0 && (
                    <div className="border-t border-slate-100 pt-2">
                      <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                        <User size={12} />
                        Recipients ({matchedRecipients.length})
                      </p>
                      <div className="space-y-1 mt-1">
                        {matchedRecipients.map((recipient) => (
                          <button
                            key={recipient.id}
                            type="button"
                            onClick={() =>
                              handleSelectResult(`/recipients/${recipient.id}`)
                            }
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-900 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-600">
                                {recipient.id}
                              </span>
                              <span>
                                {recipient.requiredOrgan} • {recipient.bloodGroup}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                {recipient.urgency}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              View Profile →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Organs Results */}
                  {matchedOrgans.length > 0 && (
                    <div className="border-t border-slate-100 pt-2">
                      <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                        <HeartPulse size={12} />
                        Organ Inventory ({matchedOrgans.length})
                      </p>
                      <div className="space-y-1 mt-1">
                        {matchedOrgans.map((organ) => (
                          <button
                            key={organ.id}
                            type="button"
                            onClick={() => handleSelectResult("/organs")}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-teal-600">
                                {organ.id}
                              </span>
                              <span>{organ.organType}</span>
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                {organ.availabilityStatus}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Inventory →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  No matches found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Section (Theme Toggle Removed) */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#2B6254] bg-[#174D40] text-emerald-100 transition hover:bg-[#205e4f] hover:text-white"
            aria-label="Notifications"
            title="View notifications"
          >
            <Bell size={18} />

            {hasNotifications && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#0F3D32]" />
            )}
          </Link>

          {/* Divider */}
          <div className="hidden h-8 w-px bg-[#2B6254] sm:block" />

          {/* Account Profile: Donors */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-[#174D40]"
              aria-label="Donors profile menu"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DDF7E8] text-sm font-bold text-[#0F7A52]">
                DN
              </div>

              {/* User Details: Donors */}
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-white">
                  {user?.full_name || "Donors"}
                </p>

                <p className="text-[11px] text-emerald-100/60">
                  {user?.hospital_name || "Donor Coordinator Team"}
                </p>
              </div>

              <ChevronDown
                size={15}
                className="hidden text-[#71867C] sm:block"
              />
            </button>

            {/* Profile Dropdown */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-slate-800">
                <div className="border-b border-slate-100 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Donors Account
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900 truncate">
                    {user?.full_name || "Donors"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email || "donors@organmatch.org"}
                  </p>
                </div>

                <div className="p-1 space-y-0.5">
                  <Link
                    to="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <SettingsIcon size={14} />
                    <span>Settings & Preferences</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
