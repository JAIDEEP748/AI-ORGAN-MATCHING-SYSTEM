import {
  X,
  LayoutDashboard,
  Users,
  UserRound,
  HeartPulse,
  Search,
  BarChart3,
  Bell,
  ClipboardList,
  Settings,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

const navigation = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Donors",
    path: "/donors",
    icon: Users,
  },
  {
    label: "Recipients",
    path: "/recipients",
    icon: UserRound,
  },
  {
    label: "Organ Inventory",
    path: "/organs",
    icon: HeartPulse,
  },
  {
    label: "Matching",
    path: "/matching",
    icon: Search,
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Audit Logs",
    path: "/audit-logs",
    icon: ClipboardList,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

export default function MobileSidebar({
  open,
  onClose,
}: MobileSidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate("/login");
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
        aria-label="Close menu"
      />

      {/* Drawer */}
      <aside className="relative h-full w-72 bg-white shadow-2xl dark:bg-slate-950">
        {/* Header */}
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl">
              🫀
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                OrganMatch
              </h2>

              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Clinical Decision Support
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                      isActive
                        ? "border border-emerald-100 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer with Log Out */}
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </aside>
    </div>
  );
}
