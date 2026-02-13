import { NavLink } from 'react-router-dom';
import {
  Activity,
  CheckSquare,
  Terminal,
  Settings,
  Clock,
  LayoutDashboard,
  Cpu,
  BarChart3,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/monitor', icon: Activity, label: 'Monitor' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/sessions', icon: Terminal, label: 'Sessions' },
  { to: '/config', icon: Settings, label: 'Config' },
  { to: '/cron', icon: Clock, label: 'Cron' },
  { to: '/devices', icon: Cpu, label: 'Devices' },
  { to: '/usage', icon: BarChart3, label: 'Usage' },
  { to: '/orchestration', icon: GitBranch, label: 'Orchestrate' },
];

export function Sidebar() {
  return (
    <nav className="fixed left-0 top-14 bottom-0 z-40 w-14 hover:w-48 transition-all duration-300 bg-cyber-bg border-r border-cyber-border group overflow-hidden">
      <div className="flex flex-col gap-1 p-2 pt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-md transition-all duration-200 text-sm',
                isActive
                  ? 'bg-cyber-bg-surface text-cyber-cyan border-l-2 border-cyber-cyan'
                  : 'text-cyber-text-muted hover:text-cyber-text hover:bg-cyber-bg-surface/50 border-l-2 border-transparent'
              )
            }
          >
            <item.icon className="w-4.5 h-4.5 shrink-0" />
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap font-medium">
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
