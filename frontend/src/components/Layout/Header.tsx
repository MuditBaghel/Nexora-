import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import {
  MenuIcon,
  MoonIcon,
  SunIcon,
  LogoutIcon,
  ChevronDownIcon,
} from '../common/icons';

const titleMap: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Business overview at a glance' },
  '/customers': { title: 'Customers', subtitle: 'Manage customer relationships' },
  '/products': { title: 'Products', subtitle: 'Product catalog and inventory' },
  '/inventory': { title: 'Inventory', subtitle: 'Stock movements and adjustments' },
  '/challans': { title: 'Challans', subtitle: 'Sales delivery challans' },
};

function matchTitle(pathname: string) {
  if (pathname.startsWith('/customers/')) {
    return { title: 'Customer Details', subtitle: 'Profile and follow-up history' };
  }
  if (pathname === '/challans/new') {
    return { title: 'New Challan', subtitle: 'Create a delivery challan' };
  }
  if (pathname.startsWith('/challans/')) {
    return { title: 'Challan Details', subtitle: 'Items and delivery information' };
  }
  return titleMap[pathname] ?? { title: 'Nexora', subtitle: 'ERP + CRM Operations Portal' };
}

interface Props {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { title, subtitle } = matchTitle(pathname);

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <button className="icon-btn sidebar-toggle" onClick={onMenuClick} aria-label="Toggle navigation">
          <MenuIcon />
        </button>
        <div>
          <h1 className="header-title">{title}</h1>
          <span className="header-subtitle">{subtitle}</span>
        </div>
      </div>
      <div className="header-right">
        <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <div className="user-menu" ref={menuRef}>
          <button className="user-menu-btn" onClick={() => setMenuOpen((o) => !o)}>
            <span className="user-avatar">{initials}</span>
            <span className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </span>
            <ChevronDownIcon size={14} />
          </button>
          {menuOpen && (
            <div className="user-menu-dropdown">
              <div className="user-menu-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <button className="menu-item danger" onClick={logout}>
                <LogoutIcon /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
