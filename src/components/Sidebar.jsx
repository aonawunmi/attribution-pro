import { NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Calculator, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/performance', label: 'Performance', icon: TrendingUp },
  { to: '/attribution', label: 'Attribution', icon: Calculator },
  { to: '/report', label: 'IC Report', icon: FileText },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } bg-[#060e1a] text-slate-300 flex flex-col transition-all duration-200 shrink-0 no-print`}
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-slate-800 flex items-center gap-3 overflow-hidden">
        <div className="bg-[#d4a843] p-1.5 rounded-lg shrink-0">
          <Calculator className="w-5 h-5 text-[#0a1628]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#d4a843] leading-tight truncate">Attribution Pro</h1>
            <p className="text-[10px] text-slate-500 truncate">Investment Performance</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#d4a843]/15 text-[#d4a843]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="p-3 border-t border-slate-800 text-slate-600 hover:text-slate-300 transition-colors flex justify-center"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
