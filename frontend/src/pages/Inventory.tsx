import { useEffect, useState, FormEvent } from 'react';
import {
  getStockMovements,
  createStockMovement,
  getProducts,
  getErrorMessage,
} from '../services/api';
import type { StockMovement, Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { DownloadIcon } from '../components/common/icons';
import { formatDateTime } from '../utils/format';
import { exportCSV } from '../utils/csv';

export default function Inventory() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ product_id: '', quantity: 1, movement_type: 'IN' as 'IN' | 'OUT', reason: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = hasRole('ADMIN', 'WAREHOUSE');

  const loadMovements = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getStockMovements({
        page,
        limit: 10,
        product_id: productFilter || undefined,
        movement_type: typeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setMovements(result.movements);
      setPagination(result.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
    getProducts({ limit: 100 }).then((r) => setProducts(r.products)).catch(() => {});
  }, [productFilter, typeFilter, dateFrom, dateTo]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await createStockMovement(form);
      showToast('Stock movement recorded', 'success');
      setModalOpen(false);
      setForm({ product_id: '', quantity: 1, movement_type: 'IN', reason: '' });
      loadMovements(pagination.page);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    exportCSV(
      'stock-movements',
      ['Product', 'SKU', 'Quantity', 'Movement', 'Reason', 'Created By', 'Timestamp'],
      movements.map((m) => [
        m.product_name ?? '',
        m.sku ?? '',
        m.quantity,
        m.movement_type,
        m.reason,
        m.created_by_name ?? '',
        formatDateTime(m.created_at),
      ])
    );
    showToast('Stock movements exported to CSV', 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Inventory</h2>
          <p>Stock movement history and adjustments</p>
        </div>
        {movements.length > 0 && (
          <button className="btn btn-secondary" onClick={handleExport}>
            <DownloadIcon /> Export
          </button>
        )}
        {canManage && (
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            + Record Movement
          </button>
        )}
      </div>

      <div className="filters-bar">
        <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.product_name} ({p.sku})</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="IN">Stock In</option>
          <option value="OUT">Stock Out</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : movements.length === 0 ? (
        <EmptyState title="No stock movements" message="Record a stock movement to get started." />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Movement</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{m.product_name} <code>{m.sku}</code></td>
                    <td>{m.quantity}</td>
                    <td><StatusBadge status={m.movement_type} /></td>
                    <td>{m.reason}</td>
                    <td>{m.created_by_name}</td>
                    <td>{formatDateTime(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={loadMovements}
          />
        </>
      )}

      <Modal open={modalOpen} title="Record Stock Movement" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-group">
            <label>Product *</label>
            <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.product_name} — Stock: {p.current_stock}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Movement Type *</label>
            <select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value as 'IN' | 'OUT' })}>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>
          </div>
          <div className="form-group">
            <label>Quantity *</label>
            <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} required />
          </div>
          <div className="form-group">
            <label>Reason *</label>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. New shipment received" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Record'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
