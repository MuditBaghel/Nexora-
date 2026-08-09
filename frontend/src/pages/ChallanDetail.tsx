import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getChallan,
  confirmChallan,
  cancelChallan,
  getErrorMessage,
} from '../services/api';
import type { Challan } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { PrinterIcon, ArrowLeftIcon } from '../components/common/icons';
import { formatCurrency, formatDateTime } from '../utils/format';

export default function ChallanDetail() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const canManage = hasRole('ADMIN', 'SALES');

  const loadChallan = async () => {
    if (!id) return;
    try {
      const data = await getChallan(id);
      setChallan(data);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallan();
  }, [id]);

  const handleConfirm = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const data = await confirmChallan(id);
      setChallan(data);
      showToast('Challan confirmed successfully', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setProcessing(false);
      setConfirmOpen(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const data = await cancelChallan(id);
      setChallan(data);
      showToast('Challan cancelled', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setProcessing(false);
      setCancelOpen(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!challan) return <div className="alert alert-error">Challan not found</div>;

  const totalAmount = challan.items?.reduce(
    (sum, item) => sum + (item.line_total ?? item.unit_price_snapshot * item.quantity),
    0
  ) ?? challan.total_amount ?? 0;

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <Link to="/challans" className="back-link">
            <ArrowLeftIcon /> Back to Challans
          </Link>
          <h2>{challan.challan_number}</h2>
          <p>{challan.customer_name} — {challan.business_name}</p>
        </div>
        <div className="flex">
          <StatusBadge status={challan.status} />
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <PrinterIcon /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="detail-grid no-print">
        <div className="card">
          <h3>Challan Details</h3>
          <dl className="detail-list">
            <dt>Challan Number</dt><dd>{challan.challan_number}</dd>
            <dt>Customer</dt><dd>{challan.customer_name}</dd>
            <dt>Business</dt><dd>{challan.business_name}</dd>
            <dt>Status</dt><dd><StatusBadge status={challan.status} /></dd>
            <dt>Total Quantity</dt><dd>{challan.total_quantity}</dd>
            <dt>Total Amount</dt><dd>{formatCurrency(totalAmount)}</dd>
            <dt>Created By</dt><dd>{challan.created_by_name}</dd>
            <dt>Created Date</dt><dd>{formatDateTime(challan.created_at)}</dd>
          </dl>

          {canManage && challan.status === 'DRAFT' && (
            <div className="form-actions">
              <button className="btn btn-danger" onClick={() => setCancelOpen(true)}>
                Cancel Challan
              </button>
              <button className="btn btn-primary" onClick={() => setConfirmOpen(true)}>
                Confirm Challan
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Items</h3>
          {challan.items && challan.items.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {challan.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name_snapshot}</td>
                    <td><code>{item.sku_snapshot}</code></td>
                    <td>{formatCurrency(item.unit_price_snapshot)}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.line_total ?? item.unit_price_snapshot * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted">No items</p>
          )}
        </div>
      </div>

      <div className="print-area">
        <div className="print-header">
          <div>
            <h2>Nexora</h2>
            <p>ERP + CRM Operations Portal</p>
          </div>
          <div className="print-title">
            <h1>Sales Challan</h1>
            <p>{challan.challan_number}</p>
          </div>
        </div>

        <div className="print-meta">
          <div>
            <strong>Customer</strong>
            <p>{challan.customer_name}</p>
            <p>{challan.business_name}</p>
            {challan.status !== 'DRAFT' && <p>Status: {challan.status}</p>}
          </div>
          <div>
            <strong>Challan Date</strong>
            <p>{formatDateTime(challan.created_at)}</p>
            <strong>Created By</strong>
            <p>{challan.created_by_name}</p>
          </div>
        </div>

        <table className="table print-items">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>SKU</th>
              <th>Unit Price</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {challan.items?.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.product_name_snapshot}</td>
                <td>{item.sku_snapshot}</td>
                <td>{formatCurrency(item.unit_price_snapshot)}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.line_total ?? item.unit_price_snapshot * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: 'right' }}>Total Quantity</td>
              <td><strong>{challan.total_quantity}</strong></td>
              <td><strong>{formatCurrency(totalAmount)}</strong></td>
            </tr>
          </tfoot>
        </table>

        <div className="print-footer">
          <div>
            <strong>Prepared by</strong>
            <p>{challan.created_by_name}</p>
          </div>
          <div>
            <strong>Customer Signature</strong>
            <p>&nbsp;</p>
          </div>
          <div>
            <strong>Authorized Signature</strong>
            <p>&nbsp;</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Challan"
        message="This will deduct stock from inventory for all items. This action cannot be undone."
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={processing}
      />

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Challan"
        message="Are you sure you want to cancel this draft challan?"
        confirmLabel="Cancel Challan"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
        loading={processing}
      />
    </div>
  );
}
