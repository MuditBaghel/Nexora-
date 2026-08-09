import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getErrorMessage,
} from '../services/api';
import type { Customer } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import { DownloadIcon } from '../components/common/icons';
import { formatDate } from '../utils/format';
import { exportCSV } from '../utils/csv';

const emptyForm = {
  customer_name: '',
  mobile: '',
  email: '',
  business_name: '',
  gst_number: '',
  customer_type: 'RETAIL' as Customer['customer_type'],
  address: '',
  status: 'LEAD' as Customer['status'],
  follow_up_date: '',
  notes: '',
};

export default function Customers() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canEdit = hasRole('ADMIN', 'SALES');
  const canDelete = hasRole('ADMIN');

  const loadCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getCustomers({
        page,
        limit: 10,
        search: search || undefined,
        customer_type: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      setCustomers(result.customers);
      setPagination(result.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [typeFilter, statusFilter]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    loadCustomers(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      customer_name: customer.customer_name,
      mobile: customer.mobile,
      email: customer.email,
      business_name: customer.business_name,
      gst_number: customer.gst_number ?? '',
      customer_type: customer.customer_type,
      address: customer.address,
      status: customer.status,
      follow_up_date: customer.follow_up_date ?? '',
      notes: customer.notes,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        gst_number: form.gst_number || null,
        follow_up_date: form.follow_up_date || null,
      };
      if (editing) {
        await updateCustomer(editing.id, payload);
        showToast('Customer updated successfully', 'success');
      } else {
        await createCustomer(payload);
        showToast('Customer created successfully', 'success');
      }
      setModalOpen(false);
      loadCustomers(pagination.page);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCustomer(deleteId);
      showToast('Customer deleted', 'success');
      loadCustomers(pagination.page);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    exportCSV(
      'customers',
      ['Customer Name', 'Business Name', 'Mobile', 'Email', 'Type', 'Status', 'Follow-up Date', 'GST Number', 'Address'],
      customers.map((c) => [
        c.customer_name,
        c.business_name,
        c.mobile,
        c.email,
        c.customer_type,
        c.status,
        formatDate(c.follow_up_date),
        c.gst_number ?? '',
        c.address,
      ])
    );
    showToast('Customers exported to CSV', 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p>Manage your customer relationships</p>
        </div>
        {customers.length > 0 && (
          <button className="btn btn-secondary" onClick={handleExport}>
            <DownloadIcon /> Export
          </button>
        )}
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Customer
          </button>
        )}
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name, business, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
          <option value="DISTRIBUTOR">Distributor</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : customers.length === 0 ? (
        <EmptyState title="No customers found" message="Try adjusting your filters or add a new customer." />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Business</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-up Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/customers/${c.id}`}>{c.customer_name}</Link></td>
                    <td>{c.business_name}</td>
                    <td>{c.mobile}</td>
                    <td><StatusBadge status={c.customer_type} variant="info" /></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{formatDate(c.follow_up_date)}</td>
                    <td className="actions">
                      <Link to={`/customers/${c.id}`} className="btn btn-sm btn-ghost">View</Link>
                      {canEdit && (
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(c)}>Edit</button>
                      )}
                      {canDelete && (
                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteId(c.id)}>Delete</button>
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
            onPageChange={loadCustomers}
          />
        </>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Customer' : 'Add Customer'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSave}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Customer Name *</label>
              <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Business Name *</label>
              <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Mobile *</label>
              <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10-digit number" required />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>GST Number</label>
              <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label>Customer Type *</label>
              <select value={form.customer_type} onChange={(e) => setForm({ ...form, customer_type: e.target.value as Customer['customer_type'] })}>
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE">Wholesale</option>
                <option value="DISTRIBUTOR">Distributor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Customer['status'] })}>
                <option value="LEAD">Lead</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div className="form-group">
              <label>Follow-up Date</label>
              <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
            </div>
            <div className="form-group full-width">
              <label>Address *</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required rows={2} />
            </div>
            <div className="form-group full-width">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
