import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCustomers,
  getProducts,
  createChallan,
  confirmChallan,
  getErrorMessage,
} from '../services/api';
import type { Customer, Product } from '../types';
import { useToast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { formatCurrency } from '../utils/format';

interface LineItem {
  product_id: string;
  product?: Product;
  quantity: number;
}

export default function ChallanNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ product_id: '', quantity: 1 }]);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getCustomers({ limit: 100, status: 'ACTIVE' }),
      getProducts({ limit: 100 }),
    ])
      .then(([c, p]) => {
        setCustomers(c.customers);
        setProducts(p.products);
      })
      .catch((err) => showToast(getErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const addRow = () => {
    setItems([...items, { product_id: '', quantity: 1 }]);
  };

  const removeRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: 'product_id' | 'quantity', value: string | number) => {
    const updated = [...items];
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value);
      updated[index] = { ...updated[index], product_id: value as string, product };
    } else {
      updated[index] = { ...updated[index], quantity: value as number };
    }
    setItems(updated);
  };

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalAmount = items.reduce((sum, item) => {
    const product = item.product ?? products.find((p) => p.id === item.product_id);
    return sum + (product ? product.unit_price * item.quantity : 0);
  }, 0);

  const validate = (): boolean => {
    if (!customerId) {
      setError('Please select a customer');
      return false;
    }
    for (const item of items) {
      if (!item.product_id) {
        setError('Please select a product for all rows');
        return false;
      }
      if (item.quantity <= 0) {
        setError('Quantity must be greater than zero');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const challan = await createChallan({
        customer_id: customerId,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      showToast('Challan saved as draft', 'success');
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const challan = await createChallan({
        customer_id: customerId,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      await confirmChallan(challan.id);
      showToast('Challan confirmed successfully', 'success');
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading form data..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>New Challan</h2>
          <p>Create a new sales delivery challan</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="form-group">
          <label>Customer *</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_name} — {c.business_name}
              </option>
            ))}
          </select>
        </div>

        <h3>Products</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Available Stock</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const product = item.product ?? products.find((p) => p.id === item.product_id);
                const lineTotal = product ? product.unit_price * item.quantity : 0;
                const lowStock = product && item.quantity > product.current_stock;
                return (
                  <tr key={index} className={lowStock ? 'row-warning' : ''}>
                    <td>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.product_name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{product?.current_stock ?? '—'}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="input-sm"
                      />
                    </td>
                    <td>{product ? formatCurrency(product.unit_price) : '—'}</td>
                    <td>{product ? formatCurrency(lineTotal) : '—'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => removeRow(index)}
                        disabled={items.length <= 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={addRow} style={{ marginTop: '1rem' }}>
          + Add Product
        </button>

        <div className="challan-summary">
          <div><strong>Total Quantity:</strong> {totalQuantity}</div>
          <div><strong>Total Amount:</strong> {formatCurrency(totalAmount)}</div>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={() => { if (validate()) setConfirmOpen(true); }} disabled={saving}>
            Confirm Challan
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Challan"
        message="This will deduct stock from inventory for all items. This action cannot be undone. Are you sure?"
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={saving}
      />
    </div>
  );
}
