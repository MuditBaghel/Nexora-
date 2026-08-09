import { useEffect, useState, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getCustomer,
  getFollowups,
  addFollowup,
  getErrorMessage,
} from '../services/api';
import type { Customer, Followup } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatDate, formatDateTime } from '../utils/format';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);

  const canAddFollowup = hasRole('ADMIN', 'SALES');

  useEffect(() => {
    if (!id) return;
    Promise.all([getCustomer(id), getFollowups(id)])
      .then(([c, f]) => {
        setCustomer(c);
        setFollowups(f);
      })
      .catch((err) => showToast(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddFollowup = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      await addFollowup(id, { note, follow_up_date: followUpDate });
      showToast('Follow-up added', 'success');
      setNote('');
      setFollowUpDate('');
      const [c, f] = await Promise.all([getCustomer(id), getFollowups(id)]);
      setCustomer(c);
      setFollowups(f);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!customer) return <div className="alert alert-error">Customer not found</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/customers" className="back-link">&larr; Back to Customers</Link>
          <h2>{customer.customer_name}</h2>
          <p>{customer.business_name}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3>Customer Information</h3>
          <dl className="detail-list">
            <dt>Mobile</dt><dd>{customer.mobile}</dd>
            <dt>Email</dt><dd>{customer.email}</dd>
            <dt>Type</dt><dd><StatusBadge status={customer.customer_type} variant="info" /></dd>
            <dt>GST Number</dt><dd>{customer.gst_number || '—'}</dd>
            <dt>Address</dt><dd>{customer.address}</dd>
            <dt>Follow-up Date</dt><dd>{formatDate(customer.follow_up_date)}</dd>
            <dt>Notes</dt><dd>{customer.notes || '—'}</dd>
          </dl>
        </div>

        <div className="card">
          <h3>Follow-up History</h3>
          {canAddFollowup && (
            <form onSubmit={handleAddFollowup} className="followup-form">
              <div className="form-group">
                <label>Note *</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} required rows={2} />
              </div>
              <div className="form-group">
                <label>Follow-up Date *</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Adding...' : 'Add Follow-up'}
              </button>
            </form>
          )}
          {followups.length === 0 ? (
            <p className="text-muted">No follow-ups recorded</p>
          ) : (
            <ul className="followup-list">
              {followups.map((f) => (
                <li key={f.id}>
                  <div className="followup-meta">
                    <strong>{formatDate(f.follow_up_date)}</strong>
                    <span>by {f.created_by_name}</span>
                    <span>{formatDateTime(f.created_at)}</span>
                  </div>
                  <p>{f.note}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
