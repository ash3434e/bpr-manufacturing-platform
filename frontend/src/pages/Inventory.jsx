import { useState, useEffect } from 'react';
import api from '../utils/api';

const ZONE_COLORS = { green: '#059669', yellow: '#d97706', red: '#dc2626' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState('');
  const [plantFilter, setPlantFilter] = useState('');

  useEffect(() => {
    const params = {};
    if (zoneFilter) params.zone = zoneFilter;
    if (plantFilter) params.plant_id = plantFilter;
    Promise.all([
      api.get('/inventory', { params }),
      api.get('/dashboard')
    ]).then(([r, d]) => {
      setItems(r.data);
      // Extract unique plants from items
      const plantMap = {};
      r.data.forEach(i => { if (i.plant_id && i.plant_name) plantMap[i.plant_id] = i.plant_name; });
      setPlants(Object.entries(plantMap).map(([id, name]) => ({ id: parseInt(id), name })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [zoneFilter, plantFilter]);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  const zoneCounts = { green: 0, yellow: 0, red: 0 };
  items.forEach(i => zoneCounts[i.zone]++);

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Inventory & Buffer Monitoring</h2><p className="page-subtitle">Track BPR status across all materials and products</p></div>
        <button className="btn btn-secondary" onClick={() => window.open('/api/export/inventory','_blank')} style={{display:'inline-flex',alignItems:'center',gap:'0.5rem'}}>📥 Export CSV</button>
      </div>

      {/* Zone Summary */}
      <div className="zone-summary" style={{ marginBottom: '1.5rem' }}>
        <div className="zone-summary-item green" onClick={() => setZoneFilter(zoneFilter === 'green' ? '' : 'green')} style={{ cursor: 'pointer', opacity: zoneFilter && zoneFilter !== 'green' ? 0.4 : 1 }}>
          <div className="zone-summary-count" style={{ color: ZONE_COLORS.green }}>{zoneCounts.green}</div>
          <div className="zone-summary-label">Green Zone (Safe)</div>
        </div>
        <div className="zone-summary-item yellow" onClick={() => setZoneFilter(zoneFilter === 'yellow' ? '' : 'yellow')} style={{ cursor: 'pointer', opacity: zoneFilter && zoneFilter !== 'yellow' ? 0.4 : 1 }}>
          <div className="zone-summary-count" style={{ color: ZONE_COLORS.yellow }}>{zoneCounts.yellow}</div>
          <div className="zone-summary-label">Yellow Zone (Watch)</div>
        </div>
        <div className="zone-summary-item red" onClick={() => setZoneFilter(zoneFilter === 'red' ? '' : 'red')} style={{ cursor: 'pointer', opacity: zoneFilter && zoneFilter !== 'red' ? 0.4 : 1 }}>
          <div className="zone-summary-count" style={{ color: ZONE_COLORS.red }}>{zoneCounts.red}</div>
          <div className="zone-summary-label">Red Zone (Critical)</div>
        </div>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="section-card-header">
          <h3>All Inventory Items ({items.length})</h3>
          <select className="plant-selector" value={plantFilter} onChange={e => setPlantFilter(e.target.value)}>
            <option value="">All Plants</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="section-card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Category</th><th>Plant</th><th>On Hand</th><th>Incoming</th><th>Reserved</th><th>Available</th><th>Buffer Size</th><th>BPR</th><th>Zone</th><th>Reorder</th><th>Days Left</th></tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{item.sku}</td>
                  <td><span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: 50, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{item.category}</span></td>
                  <td>{item.plant_name?.split(' ')[0]}</td>
                  <td>{item.on_hand}</td>
                  <td style={{ color: 'var(--zone-green)' }}>+{item.incoming_orders}</td>
                  <td style={{ color: 'var(--zone-red)' }}>-{item.reserved_demand}</td>
                  <td style={{ fontWeight: 600 }}>{item.availableStock}</td>
                  <td>{item.buffer_size}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 100 }}>
                      <div className="bpr-gauge" style={{ flex: 1 }}>
                        <div className={`bpr-gauge-fill ${item.zone}`} style={{ width: `${item.bpr}%` }}></div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: ZONE_COLORS[item.zone], minWidth: 36 }}>{item.bpr}%</span>
                    </div>
                  </td>
                  <td><span className={`zone-badge ${item.zone}`}><span className={`zone-dot ${item.zone}`}></span>{item.label}</span></td>
                  <td>{item.needsReorder ? <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: 600 }}>⚠ Reorder</span> : '—'}</td>
                  <td style={{ fontWeight: 500 }}>{item.daysOfStock === Infinity ? '∞' : item.daysOfStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
