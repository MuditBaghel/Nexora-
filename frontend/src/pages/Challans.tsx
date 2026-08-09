import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { getChallans, confirmChallan, cancelChallan, getErrorMessage } from '../services/api';
import type { Challan } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { DownloadIcon } from '../components/common/icons';
import { formatDateTime } from '../utils/format';
import { exportCSV } from '../utils/csv';

export default function Challans() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<Challan | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Challan | null>(null);
  const [processing, setProcessing] = useState(false);

  const canCreate = hasRole('ADMIN', 'SALES');

  const loadChallans = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getChallans({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setChallans(result.challans);
      setPagination(result.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, [statusFilter]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    loadChallans(1);
  };

  const handleExport = () => {
    exportCSV(
      'challans',
      ['Challan Number', 'Customer', 'Total Quantity', 'Status', 'Created By', 'Created At'],
      challans.map((c) => [
        c.challan_number,
        c.customer_name ?? '',
        c.total_quantity,
        c.status,
        c.created_by_name ?? '',
        formatDateTime(c.created_at),
      ])
    );
    showToast('Challans exported to CSV', 'success');
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setProcessing(true);
    try {
      await confirmChallan(confirmTarget.id);
      showToast(`Challan ${confirmTarget.challan_number} confirmed`, 'success');
      setConfirmTarget(null);
      loadChallans(pagination.page);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setProcessing(true);
    try {
      await cancelChallan(cancelTarget.id);
      showToast(`Challan ${cancelTarget.challan_number} cancelled`, 'success');
      setCancelTarget(null);
      loadChallans(pagination.page);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Sales Challans</h2>
          <p>Manage delivery challans and orders</p>
        </div>
        {challans.length > 0 && (
          <button className="btn btn-secondary" onClick={handleExport}>
            <DownloadIcon /> Export
          </button>
        )}
        {canCreate && (
          <Link to="/challans/new" className="btn btn-primary">
            + New Challan
          </Link>
        )}
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by challan number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : challans.length === 0 ? (
        <EmptyState
          title="No challans found"
          message="Create a new challan to get started."
          action={canCreate ? <Link to="/challans/new" className="btn btn-primary">Create Challan</Link> : undefined}
        />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/challans/${c.id}`}>{c.challan_number}</Link></td>
                    <td>{c.customer_name}</td>
                    <td>{c.total_quantity}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{c.created_by_name}</td>
                    <td>{formatDateTime(c.created_at)}</td>
                    <td className="actions">
                      <Link to={`/challans/${c.id}`} className="btn btn-sm btn-ghost">View</Link>
                      {canCreate && c.status === 'DRAFT' && (
                        <>
                          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmTarget(c)}>Confirm</button>
                          <button className="btn btn-sm btn-danger" onClick={() => setCancelTarget(c)}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={loadChallans}
          />
        </>
      )}

      <ConfirmDialog
        open={!!confirmTarget}
        title="Confirm Challan"
        message={`Confirm challan ${confirmTarget?.challan_number ?? ''}? Stock will be deducted for all items.`}
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
        loading={processing}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel Challan"
        message={`Are you sure you want to cancel draft challan ${cancelTarget?.challan_number ?? ''}?`}
        confirmLabel="Cancel Challan"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
        loading={processing}
      />
    </div>
  );
}
