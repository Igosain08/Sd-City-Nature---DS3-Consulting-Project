import { NavLink } from 'react-router-dom';
import { BarChart3, MapPin, GitCompare, Target } from 'lucide-react';

/**
 * Left sidebar navigation component
 */
export function Sidebar() {
  const navItems = [
    {
      to: '/',
      icon: BarChart3,
      label: 'Exploratory Analysis',
    },
    {
      to: '/hotspots',
      icon: MapPin,
      label: 'Hotspot & Gap Analysis',
    },
    {
      to: '/comparison',
      icon: GitCompare,
      label: 'City Comparison',
    },
    {
      to: '/strategy',
      icon: Target,
      label: 'Strategy Recommendations',
    },
  ];

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
