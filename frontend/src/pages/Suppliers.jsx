import { useState, useEffect } from 'react';
import api from '../utils/api';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/suppliers').then(r => { setSuppliers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  const riskChartData = suppliers.filter(s => s.status !== 'inactive').map(s => ({
    name: s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
    risk: s.riskScore,
    fill: s.riskLevel === 'high' ? '#ef4444' : s.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
  }));

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Supplier Analytics</h2><p className="page-subtitle">Monitor supplier performance, risk scores, and delivery reliability</p></div>
      </div>

      {/* Supplier Risk Chart */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-card-header"><h3>Supplier Risk Scores</h3><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Risk = (Delayed / Total Deliveries) × 100</span></div>
        <div className="section-card-body">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskChartData} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 40]} tickFormatter={v => `${v}%`} />
              <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }} formatter={v => [`${v}%`, 'Risk Score']} />
              <Bar dataKey="risk" radius={[4, 4, 0, 0]}>
                {riskChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Supplier Table */}
      <div className="section-card">
        <div className="section-card-header"><h3>All Suppliers ({suppliers.length})</h3></div>
        <div className="section-card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Supplier</th><th>Location</th><th>Lead Time</th><th>Total Deliveries</th><th>On Time</th><th>Delayed</th><th>Risk Score</th><th>Reliability</th><th>Status</th></tr></thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{s.location}</td>
                  <td><Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{s.lead_time_days} days</td>
                  <td>{s.total_deliveries}</td>
                  <td style={{ color: 'var(--zone-green)' }}>{s.onTimeDeliveries}</td>
                  <td style={{ color: s.delayed_deliveries > 0 ? 'var(--zone-red)' : 'inherit' }}>{s.delayed_deliveries}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: s.riskLevel === 'high' ? '#ef4444' : s.riskLevel === 'medium' ? '#f59e0b' : '#10b981' }}>
                      {s.riskScore}%
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="bpr-gauge" style={{ width: 60 }}>
                        <div className="bpr-gauge-fill" style={{
                          width: `${s.reliabilityScore}%`,
                          background: s.riskLevel === 'high' ? '#ef4444' : s.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem' }}>{Math.round(s.reliabilityScore)}%</span>
                    </div>
                  </td>
                  <td>
                    {s.status === 'active' ?
                      <span className="zone-badge green"><CheckCircle size={10} />Active</span> :
                      <span className="zone-badge red"><AlertTriangle size={10} />{s.status}</span>
                    }
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
