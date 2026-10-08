import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarCheck, ClipboardList, PlusSquare, LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// One layout for all roles. Only the menu items change.
const NAV = {
  student: [
    { to: '/student', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/student/tests', label: 'Tests', icon: ClipboardList },
  ],
  cr: [
    { to: '/cr', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/cr/tests', label: 'Tests', icon: ClipboardList },
    { to: '/cr/tests/new', label: 'New test', icon: PlusSquare },
  ],
  admin: [
    { to: '/admin', label: 'Reports', icon: LayoutDashboard, end: true },
    { to: '/admin/tests', label: 'Tests', icon: ClipboardList },
    { to: '/admin/tests/new', label: 'New test', icon: PlusSquare },
  ],
};

export default function DashboardLayout({ group }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV[group];

  const link = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-600 text-white' : 'text-black/60 hover:bg-black/5'
    }`;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-brand-900">
            <GraduationCap className="text-brand-600" /> AttendHub
          </div>
          <nav className="hidden gap-1 md:flex">
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={link}>
                <Icon size={16} /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs sm:block">
              <p className="font-semibold">{user.full_name}</p>
              <p className="capitalize text-black/50">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-ghost !px-3" aria-label="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-black/5 bg-white p-2 md:hidden">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 text-[11px] font-medium ${isActive ? 'text-brand-600' : 'text-black/50'}`
            }
          >
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}