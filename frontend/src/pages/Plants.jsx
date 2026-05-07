import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Building2 } from 'lucide-react';

const ZC = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };

export default function Plants() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/plants').then(r => { setPlants(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Multi-Plant Overview</h2><p className="page-subtitle">Plant-wise dashboards with inter-plant comparison</p></div>
      </div>
      <div className="grid-3">
        {plants.map((p, i) => (
          <div className="section-card" key={i}>
            <div className="section-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} color="var(--accent-primary)" />
                <h3>{p.name}</h3>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.location}</span>
            </div>
            <div className="section-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { v: `${p.avgBPR}%`, l: 'Avg BPR', c: p.avgBPR > 66 ? ZC.red : p.avgBPR > 33 ? ZC.yellow : ZC.green },
                  { v: p.inventoryCount, l: 'Products' },
                  { v: p.machineCount, l: 'Machines' },
                  { v: p.bottleneckCount, l: 'Bottlenecks', c: p.bottleneckCount > 0 ? ZC.red : ZC.green },
                ].map((k, j) => (
                  <div key={j} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: k.c }}>{k.v}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{k.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Buffer Zones</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[['green', p.greenCount], ['yellow', p.yellowCount], ['red', p.redCount]].map(([z, c]) => (
                  <div key={z} style={{ flex: c || 0.1, height: 28, background: `var(--zone-${z}-bg)`, border: `1px solid var(--zone-${z}-border)`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 600, color: ZC[z] }}>
                    {c > 0 && `${c} ${z.charAt(0).toUpperCase() + z.slice(1)}`}
                  </div>
                ))}
              </div>
              {p.redCount > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, fontSize: '0.72rem', color: ZC.red }}>
                  ⚠ {p.redCount} item(s) in Red Zone
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="section-card" style={{ marginTop: '1.5rem' }}>
        <div className="section-card-header"><h3>Inter-Plant Optimization</h3></div>
        <div className="section-card-body" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          💡 The system recommends internal transfers between plants before external procurement to optimize costs and reduce lead times.
        </div>
      </div>
    </div>
  );
}
