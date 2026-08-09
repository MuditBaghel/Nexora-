import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import {
  DashboardIcon,
  UsersIcon,
  PackageIcon,
  ClipboardIcon,
  FileTextIcon,
} from '../common/icons';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/customers', label: 'Customers', icon: <UsersIcon />, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
];

const salesNav: NavItem[] = [
  { to: '/products', label: 'Products', icon: <PackageIcon />, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/inventory', label: 'Inventory', icon: <ClipboardIcon />, roles: ['ADMIN', 'WAREHOUSE', 'ACCOUNTS'] },
  { to: '/challans', label: 'Challans', icon: <FileTextIcon />, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
];

interface Props {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: Props) {
  const { user, hasRole } = useAuth();

  const visibleMain = mainNav.filter((item) => hasRole(...item.roles));
  const visibleSales = salesNav.filter((item) => hasRole(...item.roles));

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">N</span>
        <div>
          <strong>Nexora</strong>
          <small>ERP + CRM</small>
        </div>
      </div>
      <nav className="sidebar-nav">
        {visibleMain.length > 0 && (
          <>
            <div className="nav-section-label">Overview</div>
            {visibleMain.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={onNavigate}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
        {visibleSales.length > 0 && (
          <>
            <div className="nav-section-label">Operations</div>
            {visibleSales.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <div className="user-mini">
          <span className="user-avatar">{initials}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{user?.name}</div>
            <div style={{ color: '#94a3b8', fontSize: 11.5 }}>{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
