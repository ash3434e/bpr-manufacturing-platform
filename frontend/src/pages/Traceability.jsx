import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, ArrowRight } from 'lucide-react';

export default function Traceability() {
  const [batches, setBatches] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/traceability').then(r => { setBatches(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      api.get('/traceability').then(r => setBatches(r.data));
      return;
    }
    api.get('/traceability/search', { params: { q: searchQuery } }).then(r => setBatches(r.data));
  };

  const viewChain = (id) => {
    api.get(`/traceability/${id}`).then(r => setSelectedBatch(r.data));
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Batch Traceability</h2><p className="page-subtitle">Track materials from supplier to finished product</p></div>
      </div>
      <div className="filters-bar">
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: 400 }}>
          <input className="filter-input" style={{ flex: 1 }} placeholder="Search batch or lot number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <button className="btn btn-primary" onClick={handleSearch}><Search size={16} /> Search</button>
        </div>
      </div>

      {/* Traceability Chain */}
      {selectedBatch && (
        <div className="section-card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-card-header"><h3>Traceability Chain — {selectedBatch.batch.batch_number}</h3>
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedBatch(null)}>Close</button>
          </div>
          <div className="section-card-body">
            <div className="trace-chain">
              {selectedBatch.chain.supplier && (
                <><div className="trace-node">
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>SUPPLIER</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedBatch.chain.supplier.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedBatch.chain.supplier.location}</div>
                </div><div className="trace-arrow"><ArrowRight /></div></>
              )}
              <div className="trace-node">
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>RAW MATERIAL</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedBatch.chain.rawMaterial.batch_number}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lot: {selectedBatch.chain.rawMaterial.lot_number}</div>
              </div>
              <div className="trace-arrow"><ArrowRight /></div>
              <div className="trace-node">
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>PRODUCTION</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{selectedBatch.chain.production.machine || 'N/A'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>By: {selectedBatch.chain.production.operator}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{selectedBatch.chain.production.plant}</div>
              </div>
              <div className="trace-arrow"><ArrowRight /></div>
              <div className="trace-node" style={{ borderColor: 'var(--accent-primary)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4 }}>PRODUCT</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{selectedBatch.chain.product.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKU: {selectedBatch.chain.product.sku}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Table */}
      <div className="section-card">
        <div className="section-card-header"><h3>Batches ({batches.length})</h3></div>
        <div className="section-card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Batch #</th><th>Lot #</th><th>Product</th><th>Supplier</th><th>Machine</th><th>Operator</th><th>Qty</th><th>Plant</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 500 }}>{b.batch_number}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{b.lot_number}</td>
                  <td>{b.product_name}</td>
                  <td>{b.supplier_name || '—'}</td>
                  <td>{b.machine_name || '—'}</td>
                  <td>{b.operator_name}</td>
                  <td>{b.quantity}</td>
                  <td>{b.plant_name?.split(' ')[0]}</td>
                  <td><span className={`zone-badge ${b.status === 'active' ? 'green' : b.status === 'consumed' ? 'yellow' : 'red'}`}>{b.status}</span></td>
                  <td><button className="btn btn-sm btn-secondary" onClick={() => viewChain(b.id)}>View Chain</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
