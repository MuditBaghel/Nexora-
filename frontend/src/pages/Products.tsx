import { useEffect, useState, FormEvent } from 'react';
import {
  getProducts,
  createProduct,
  updateProduct,
  getErrorMessage,
} from '../services/api';
import type { Product } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { DownloadIcon } from '../components/common/icons';
import { formatCurrency } from '../utils/format';
import { exportCSV } from '../utils/csv';

const emptyForm = {
  product_name: '',
  sku: '',
  category: '',
  unit_price: 0,
  current_stock: 0,
  minimum_stock: 0,
  warehouse_location: '',
};

export default function Products() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const canEdit = hasRole('ADMIN', 'WAREHOUSE');

  const loadProducts = async (page = 1) => {
    setLoading(true);
    try {
      const result = await getProducts({
        page,
        limit: 10,
        search: search || undefined,
        category: categoryFilter || undefined,
        low_stock: lowStockFilter ? 'true' : undefined,
      });
      setProducts(result.products);
      setPagination(result.pagination);
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [categoryFilter, lowStockFilter]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    loadProducts(1);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      product_name: product.product_name,
      sku: product.sku,
      category: product.category,
      unit_price: product.unit_price,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
      warehouse_location: product.warehouse_location,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await updateProduct(editing.id, form);
        showToast('Product updated successfully', 'success');
      } else {
        await createProduct(form);
        showToast('Product created successfully', 'success');
      }
      setModalOpen(false);
      loadProducts(pagination.page);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    exportCSV(
      'products',
      ['Product Name', 'SKU', 'Category', 'Unit Price', 'Current Stock', 'Minimum Stock', 'Warehouse Location', 'Status'],
      products.map((p) => [
        p.product_name,
        p.sku,
        p.category,
        p.unit_price,
        p.current_stock,
        p.minimum_stock,
        p.warehouse_location,
        p.is_low_stock ? 'Low Stock' : 'In Stock',
      ])
    );
    showToast('Products exported to CSV', 'success');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Products</h2>
          <p>Manage product catalog and inventory levels</p>
        </div>
        {products.length > 0 && (
          <button className="btn btn-secondary" onClick={handleExport}>
            <DownloadIcon /> Export
          </button>
        )}
        {canEdit && (
          <button className="btn btn-primary" onClick={openCreate}>
            + Add Product
          </button>
        )}
      </div>

      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        <input
          type="text"
          placeholder="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={lowStockFilter}
            onChange={(e) => setLowStockFilter(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState title="No products found" />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.is_low_stock ? 'row-warning' : ''}>
                    <td>{p.product_name}</td>
                    <td><code>{p.sku}</code></td>
                    <td>{p.category}</td>
                    <td>{formatCurrency(p.unit_price)}</td>
                    <td className={p.is_low_stock ? 'text-danger' : ''}>{p.current_stock}</td>
                    <td>{p.minimum_stock}</td>
                    <td>{p.warehouse_location}</td>
                    <td>
                      {p.is_low_stock ? (
                        <span className="badge badge-warning">Low Stock</span>
                      ) : (
                        <span className="badge badge-success">In Stock</span>
                      )}
                    </td>
                    {canEdit && (
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(p)}>Edit</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={loadProducts}
          />
        </>
      )}

      <Modal open={modalOpen} title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSave}>
          {formError && <div className="alert alert-error">{formError}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Product Name *</label>
              <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>SKU *</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Unit Price *</label>
              <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} required />
            </div>
            <div className="form-group">
              <label>Current Stock</label>
              <input type="number" min="0" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Minimum Stock</label>
              <input type="number" min="0" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group full-width">
              <label>Warehouse Location *</label>
              <input value={form.warehouse_location} onChange={(e) => setForm({ ...form, warehouse_location: e.target.value })} required />
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
    </div>
  );
}
