import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";

const activeItems = [
  {
    to: "/student",
    end: true,
    label: "Dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: "/student/examinations",
    end: false,
    label: "Examinations",
    note: "View schedules and results",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

export default function StudentSidebar({ onLinkClick, onClose }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
  }, []);

  return (
    <div className="flex flex-col h-full py-6 px-4">
      <div className="px-2 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold tracking-tight">Digital Examination System</h2>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square rounded-lg lg:hidden"
          onClick={onClose}
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-2 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-base-content/40 mb-4 px-2">Main Menu</p>
          <ul className="menu menu-md gap-1.5 p-0">
            {activeItems.map(({ to, end, label, icon, note }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onLinkClick}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-primary-content shadow-lg shadow-primary/25 font-semibold active-nav-glow"
                        : "hover:bg-primary/10 text-base-content/70 hover:text-primary"
                    }`
                  }
                >
                  <span className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110">{icon}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold leading-tight">{label}</span>
                    {note && <span className="text-[10px] opacity-60 font-medium mt-0.5 leading-tight truncate">{note}</span>}
                  </div>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-auto px-2 pt-4 border-t border-base-300/30">
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-4">
          <p className="text-xs font-bold text-primary mb-1">Student Panel</p>
          <p className="text-[10px] opacity-60 leading-relaxed">Access your exam schedules, results, and performance metrics.</p>
        </div>
        <div className="flex items-center gap-3 px-2 py-2 group cursor-default">
          <div className="w-9 h-9 rounded-xl bg-neutral text-neutral-content flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold truncate">
              {user ? `${user.firstName} ${user.lastName}` : "Guest Student"}
            </span>
            <span className="text-[10px] opacity-40 truncate">{user?.email || "student@des.com"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
