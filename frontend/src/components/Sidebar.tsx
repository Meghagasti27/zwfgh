import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  HelpCircle,
  Wind
} from 'lucide-react';

interface SidebarProps {
  currentRoute: '/' | '/analytics';
  onNavigate: (route: '/' | '/analytics') => void;
  onOpenMethodology: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  onOpenMethodology
}) => {
  return (
    <aside className="ws-sidebar">
      {/* Brand logo navigates to Dashboard ('/') */}
      <div className="mb-4 flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #176B4D 0%, #22c55e 100%)' }}
          title="WindSight Home"
          onClick={() => onNavigate('/')}
        >
          <Wind className="w-5 h-5" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col items-center gap-1.5 flex-1">
        {/* Route 1: Dashboard ('/') */}
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className={`ws-sidebar-icon border-0 bg-transparent p-0 outline-none ${currentRoute === '/' ? 'active' : ''}`}
          title="Overview Dashboard (/)"
          aria-label="Dashboard"
        >
          <LayoutDashboard className="w-5 h-5" />
        </button>

        {/* Route 2: Analytics ('/analytics') */}
        <button
          type="button"
          onClick={() => onNavigate('/analytics')}
          className={`ws-sidebar-icon border-0 bg-transparent p-0 outline-none ${currentRoute === '/analytics' ? 'active' : ''}`}
          title="Detailed Analytics (/analytics)"
          aria-label="Analytics"
        >
          <BarChart3 className="w-5 h-5" />
        </button>
      </nav>

      {/* Bottom: Methodology & Help Modal Trigger */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          className="ws-sidebar-icon border-0 bg-transparent p-0 outline-none"
          title="Methodology & Market Context"
          aria-label="Methodology & Market Context"
          onClick={onOpenMethodology}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
