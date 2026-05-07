import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Download, CheckCircle } from 'lucide-react';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: '', supplier_id: '', quantity: '', due_date: '', type: 'purchase', plant_id: '' });
  const [filter, setFilter] = useState({ status: '', type: '' });

  const fetchData = () => {
    const params = {};
    if (filter.status) params.status = filter.status;
    if (filter.type) params.type = filter.type;
    Promise.all([
      api.get('/manage/orders', { params }),
      api.get('/manage/products'),
      api.get('/suppliers'),
      api.get('/dashboard').then(r => r.data.plants || []).catch(() => [])
    ]).then(([o, p, s, pl]) => {
      setOrders(o.data);
      setProducts(p.data);
      setSuppliers(s.data);
      // Extract unique plant names from products
      const plantMap = {};
      p.data.forEach(prod => { if (prod.plant_id && prod.plant_name) plantMap[prod.plant_id] = prod.plant_name; });
      setPlants(pl.length ? pl : Object.entries(plantMap).map(([id, name]) => ({ id: parseInt(id), name })));
      if (!form.plant_id && p.data.length) setForm(f => ({...f, plant_id: p.data[0].plant_id || 1}));
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/manage/orders', form);
    setShowForm(false);
    setForm({ product_id: '', supplier_id: '', quantity: '', due_date: '', type: 'purchase', plant_id: form.plant_id });
    fetchData();
  };

  const updateStatus = async (id, status) => {
    await api.put(`/manage/orders/${id}/status`, { status });
    fetchData();
  };

  const exportCSV = () => { window.open('/api/export/orders', '_blank'); };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  const statusColors = { pending: '#d97706', confirmed: '#4f46e5', shipped: '#6366f1', delivered: '#059669', cancelled: '#dc2626' };

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Order Management</h2><p className="page-subtitle">Create, track, and manage purchase & sales orders</p></div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <button className="btn btn-secondary" onClick={exportCSV}><Download size={14}/>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={14}/>New Order</button>
        </div>
      </div>

      {showForm && (
        <div className="section-card" style={{marginBottom:'1.5rem'}}>
          <div className="section-card-header"><h3>Create New Order</h3></div>
          <div className="section-card-body">
            <form onSubmit={handleCreate} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-input" value={form.product_id} onChange={e => setForm({...form, product_id: parseInt(e.target.value)})} required>
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select className="form-input" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: parseInt(e.target.value) || ''})}>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value)})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Order Type</label>
                <select className="form-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="purchase">Purchase Order</option>
                  <option value="sales">Sales Order</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Plant</label>
                <select className="form-input" value={form.plant_id} onChange={e => setForm({...form, plant_id: parseInt(e.target.value)})}>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{gridColumn:'1/-1',display:'flex',gap:'0.5rem'}}>
                <button type="submit" className="btn btn-primary">Create Order</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="filters-bar">
        <select className="filter-select" value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="filter-select" value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})}>
          <option value="">All Types</option>
          <option value="purchase">Purchase</option>
          <option value="sales">Sales</option>
        </select>
        <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Showing {orders.length} orders</span>
      </div>

      <div className="section-card">
        <div className="section-card-body" style={{overflowX:'auto'}}>
          <table className="data-table">
            <thead><tr><th>ID</th><th>Product</th><th>Supplier</th><th>Qty</th><th>Type</th><th>Plant</th><th>Order Date</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td style={{fontWeight:500,color:'var(--text-primary)'}}>{o.product_name}</td>
                  <td>{o.supplier_name || '—'}</td>
                  <td>{o.quantity}</td>
                  <td><span style={{fontSize:'0.68rem',padding:'0.12rem 0.4rem',borderRadius:50,background: o.type==='purchase' ? '#eef2ff' : '#f5f3ff',color: o.type==='purchase' ? '#4f46e5' : '#6366f1',textTransform:'uppercase',fontWeight:600,border:`1px solid ${o.type==='purchase' ? '#c7d2fe' : '#ddd6fe'}`}}>{o.type}</span></td>
                  <td>{o.plant_name?.split(' ')[0]}</td>
                  <td>{o.order_date}</td>
                  <td style={{color: o.due_date && new Date(o.due_date) < new Date() && o.status !== 'delivered' ? '#dc2626' : 'inherit'}}>{o.due_date || '—'}</td>
                  <td><span style={{color:statusColors[o.status],fontWeight:600,fontSize:'0.75rem',textTransform:'capitalize'}}>{o.status}</span></td>
                  <td style={{display:'flex',gap:'0.25rem'}}>
                    {o.status === 'pending' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(o.id, 'confirmed')}>Confirm</button>}
                    {o.status === 'confirmed' && <button className="btn btn-sm btn-primary" onClick={() => updateStatus(o.id, 'shipped')}>Ship</button>}
                    {o.status === 'shipped' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(o.id, 'delivered')}><CheckCircle size={12}/>Deliver</button>}
                    {o.status === 'pending' && <button className="btn btn-sm btn-danger" onClick={() => updateStatus(o.id, 'cancelled')}>Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
