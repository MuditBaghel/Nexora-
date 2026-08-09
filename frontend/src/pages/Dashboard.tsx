import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getErrorMessage } from '../services/api';
import type { DashboardStats } from '../types';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import StatusBadge from '../components/common/StatusBadge';
import {
  UsersIcon,
  PackageIcon,
  FileTextIcon,
  ClipboardIcon,
  WarningIcon,
  TrendingUpIcon,
  PlusIcon,
  BoxIcon,
  CheckCircleIcon,
} from '../components/common/icons';

function SkeletonDashboard() {
  return (
    <div>
      <div className="skeleton skeleton-stat" style={{ marginBottom: 24 }} />
      <div className="stats-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-stat" />
        ))}
      </div>
      <div className="skeleton skeleton-table" />
    </div>
  );
}

function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

interface StatCardProps {
  icon: ReactNode;
  iconClass?: string;
  label: string;
  value: number;
  sub?: string;
  valueClass?: string;
  format?: (n: number) => string;
  index?: number;
}

function StatCard({ icon, iconClass = '', label, value, sub, valueClass = '', format, index = 0 }: StatCardProps) {
  const animated = useCountUp(value);
  const rendered = format ? format(animated) : Math.round(animated).toLocaleString('en-IN');
  return (
    <div className="stat-card" style={{ '--i': index } as CSSProperties}>
      <span className={`stat-icon ${iconClass}`}>{icon}</span>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className={`stat-value ${valueClass}`}>{rendered}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const canManageCustomers = hasRole('ADMIN', 'SALES');
  const canManageProducts = hasRole('ADMIN', 'WAREHOUSE');
  const canManageStock = hasRole('ADMIN', 'WAREHOUSE');

  if (loading) return <SkeletonDashboard />;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return null;

  return (
    <div className="page-enter">
      <div className="welcome-banner">
        <div>
          <h2>{greeting}, {firstName}</h2>
          <p>{today} — here's what's happening across your business.</p>
        </div>
        <div className="quick-actions">
          {canManageCustomers && (
            <Link to="/customers" className="quick-action" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <PlusIcon size={15} /> Add Customer
            </Link>
          )}
          {canManageProducts && (
            <Link to="/products" className="quick-action" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <PlusIcon size={15} /> Add Product
            </Link>
          )}
          {canManageCustomers && (
            <Link to="/challans/new" className="quick-action" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <PlusIcon size={15} /> New Challan
            </Link>
          )}
          {canManageStock && (
            <Link to="/inventory" className="quick-action" style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              <PlusIcon size={15} /> Record Movement
            </Link>
          )}
        </div>
      </div>

      <div className="stats-grid stagger">
        <StatCard icon={<UsersIcon />} label="Total Customers" value={stats.total_customers} sub="CRM contacts" index={0} />
        <StatCard icon={<PackageIcon />} iconClass="info" label="Total Products" value={stats.total_products} sub="Catalog items" index={1} />
        <StatCard icon={<WarningIcon />} iconClass="warning" label="Low Stock" value={stats.low_stock_products} sub="Need reordering" index={2} />
        <StatCard icon={<ClipboardIcon />} iconClass="info" label="Pending Follow-ups" value={stats.pending_followups} sub="Due within 7 days" index={3} />
        <StatCard icon={<TrendingUpIcon />} iconClass="success" label="Month Revenue" value={stats.month_revenue} format={formatCurrency} sub={`${stats.confirmed_challans} confirmed challans`} valueClass="stat-success" index={4} />
        <StatCard icon={<BoxIcon />} iconClass="warning" label="Inventory Value" value={stats.stock_value} format={formatCurrency} sub="At current stock" valueClass="sm" index={5} />
        <StatCard icon={<FileTextIcon />} iconClass="info" label="Total Challans" value={stats.total_challans} sub="All time" index={6} />
        <StatCard icon={<CheckCircleIcon />} iconClass="success" label="Confirmed" value={stats.confirmed_challans} sub="Delivered challans" valueClass="stat-success" index={7} />
      </div>

      <div className="dashboard-grid">
        {stats.low_stock_items.length > 0 && (
          <div className="card span-2">
            <div className="card-header">
              <h3>Low Stock Alerts</h3>
              <Link to="/products" className="link">Manage products</Link>
            </div>
            <div className="table-container" style={{ boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>In Stock</th>
                    <th>Minimum</th>
                    <th>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.low_stock_items.map((p) => (
                    <tr key={p.id} className="row-warning">
                      <td>{p.product_name}</td>
                      <td><code>{p.sku}</code></td>
                      <td>{p.category}</td>
                      <td className="text-danger">{p.current_stock}</td>
                      <td>{p.minimum_stock}</td>
                      <td>{p.warehouse_location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats.followups_due.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3>Follow-ups Due</h3>
              <Link to="/customers" className="link">View all</Link>
            </div>
            <ul className="followup-list">
              {stats.followups_due.map((f) => (
                <li key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <Link to={`/customers/${f.id}`} style={{ fontWeight: 600, fontSize: 14 }}>{f.customer_name}</Link>
                    <div className="text-muted" style={{ fontSize: 12 }}>{f.mobile}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-warning">{formatDate(f.follow_up_date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stats.top_customers.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3>Top Customers</h3>
              <Link to="/customers" className="link">View all</Link>
            </div>
            <ul className="followup-list">
              {stats.top_customers.map((c) => (
                <li key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <Link to={`/customers/${c.id}`} style={{ fontWeight: 600, fontSize: 14 }}>{c.customer_name}</Link>
                    <div className="text-muted" style={{ fontSize: 12 }}>{c.business_name} · {c.challan_count} challan{c.challan_count === 1 ? '' : 's'}</div>
                  </div>
                  <strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{formatCurrency(c.total_amount)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card span-2">
          <div className="card-header">
            <h3>Recent Challans</h3>
            <Link to="/challans" className="link">View all</Link>
          </div>
          {stats.recent_challans.length === 0 ? (
            <p className="text-muted">No challans yet</p>
          ) : (
            <div className="table-container" style={{ boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Challan #</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Qty</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_challans.map((c) => (
                    <tr key={c.id}>
                      <td><Link to={`/challans/${c.id}`}>{c.challan_number}</Link></td>
                      <td>{c.customer_name}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.total_quantity}</td>
                      <td>{formatDateTime(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card span-2">
          <div className="card-header">
            <h3>Recent Stock Movements</h3>
            <Link to="/inventory" className="link">View all</Link>
          </div>
          {stats.recent_stock_movements.length === 0 ? (
            <p className="text-muted">No stock movements yet</p>
          ) : (
            <div className="table-container" style={{ boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Type</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_stock_movements.map((m) => (
                    <tr key={m.id}>
                      <td>{m.product_name} <code>{m.sku}</code></td>
                      <td>{m.quantity}</td>
                      <td><StatusBadge status={m.movement_type} /></td>
                      <td>{formatDateTime(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
