import { useState, useEffect } from 'react';
import api from '../utils/api';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertTriangle, Package, Cpu, Truck, ShoppingCart, Clock, Activity, Bell } from 'lucide-react';

const ZC = { green: '#059669', yellow: '#d97706', red: '#dc2626' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!data) return <div className="empty-state"><p>Failed to load dashboard</p></div>;

  const { kpis, zoneSummary, criticalItems, machineAnalysis, recentAlerts, inventoryOverview } = data;

  const kpiCards = [
    { icon: Package, label: 'Total Products', value: kpis.totalProducts, color: '#4f46e5', bg: '#eef2ff' },
    { icon: Activity, label: 'Average BPR', value: `${kpis.avgBPR}%`, color: kpis.avgBPR > 66 ? ZC.red : kpis.avgBPR > 33 ? ZC.yellow : ZC.green, bg: kpis.avgBPR > 66 ? '#fef2f2' : kpis.avgBPR > 33 ? '#fffbeb' : '#ecfdf5' },
    { icon: AlertTriangle, label: 'Critical Items', value: kpis.criticalItems, color: ZC.red, bg: '#fef2f2' },
    { icon: Cpu, label: 'Bottlenecks', value: kpis.bottlenecks, color: ZC.yellow, bg: '#fffbeb' },
    { icon: Truck, label: 'High Risk Suppliers', value: kpis.highRiskSuppliers, color: ZC.red, bg: '#fef2f2' },
    { icon: ShoppingCart, label: 'Pending Orders', value: kpis.pendingOrders, color: '#4f46e5', bg: '#eef2ff' },
    { icon: Clock, label: 'Delayed Orders', value: kpis.delayedOrders, color: ZC.yellow, bg: '#fffbeb' },
    { icon: Bell, label: 'Active Alerts', value: kpis.activeAlerts, color: ZC.red, bg: '#fef2f2' },
  ];

  const zonePieData = [
    { name: 'Green (Safe)', value: zoneSummary.green, color: ZC.green },
    { name: 'Yellow (Watch)', value: zoneSummary.yellow, color: ZC.yellow },
    { name: 'Red (Critical)', value: zoneSummary.red, color: ZC.red },
  ];

  const machineBarData = machineAnalysis.map(m => ({
    name: m.name.length > 12 ? m.name.substring(0, 12) + '...' : m.name,
    utilization: m.utilization_pct,
    fill: m.utilization_pct > 95 ? ZC.red : m.utilization_pct > 85 ? ZC.yellow : ZC.green
  }));

  return (
    <div>
      <div className="kpi-grid">
        {kpiCards.map((kpi, i) => (
          <div className="stat-card" key={i}>
            <div className="stat-card-icon" style={{ background: kpi.bg }}>
              <kpi.icon size={18} color={kpi.color} />
            </div>
            <div className="stat-card-value" style={{ color: typeof kpi.value === 'string' && kpi.value.includes('%') ? kpi.color : 'inherit' }}>{kpi.value}</div>
            <div className="stat-card-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="section-card">
          <div className="section-card-header"><h3>BPR Zone Distribution</h3></div>
          <div className="section-card-body">
            <div className="zone-summary" style={{ marginBottom: '1rem' }}>
              <div className="zone-summary-item green">
                <div className="zone-summary-count" style={{ color: ZC.green }}>{zoneSummary.green}</div>
                <div className="zone-summary-label">Green (Safe)</div>
              </div>
              <div className="zone-summary-item yellow">
                <div className="zone-summary-count" style={{ color: ZC.yellow }}>{zoneSummary.yellow}</div>
                <div className="zone-summary-label">Yellow (Watch)</div>
              </div>
              <div className="zone-summary-item red">
                <div className="zone-summary-count" style={{ color: ZC.red }}>{zoneSummary.red}</div>
                <div className="zone-summary-label">Red (Critical)</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={zonePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {zonePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header"><h3>Machine Utilization</h3></div>
          <div className="section-card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={machineBarData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} formatter={v => [`${v}%`, 'Utilization']} />
                <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                  {machineBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="section-card">
          <div className="section-card-header"><h3>Critical Items (Red Zone)</h3></div>
          <div className="section-card-body">
            {criticalItems.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No critical items</p> : (
              <table className="data-table">
                <thead><tr><th>Product</th><th>BPR</th><th>Zone</th><th>Days Left</th></tr></thead>
                <tbody>
                  {criticalItems.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                      <td><span style={{ color: ZC.red, fontWeight: 600 }}>{item.bpr}%</span></td>
                      <td><span className="zone-badge red"><span className="zone-dot red"></span>Critical</span></td>
                      <td>{item.daysOfStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header"><h3>Recent Alerts</h3></div>
          <div className="section-card-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {recentAlerts.map((alert, i) => (
              <div className="alert-item" key={i}>
                <div className={`alert-severity-dot ${alert.severity}`}></div>
                <div className="alert-content">
                  <div className="alert-message">{alert.message}</div>
                  {alert.recommendation && <div className="alert-recommendation">{alert.recommendation}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: '1.5rem' }}>
        <div className="section-card-header"><h3>Inventory Overview</h3></div>
        <div className="section-card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Plant</th><th>On Hand</th><th>Available</th><th>Buffer</th><th>BPR</th><th>Zone</th><th>Days Left</th></tr></thead>
            <tbody>
              {inventoryOverview.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.sku}</td>
                  <td>{item.plant_name?.split(' ')[0]}</td>
                  <td>{item.on_hand}</td>
                  <td>{item.availableStock}</td>
                  <td>{item.buffer_size}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="bpr-gauge" style={{ width: 60 }}>
                        <div className={`bpr-gauge-fill ${item.zone}`} style={{ width: `${item.bpr}%` }}></div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: ZC[item.zone] }}>{item.bpr}%</span>
                    </div>
                  </td>
                  <td><span className={`zone-badge ${item.zone}`}><span className={`zone-dot ${item.zone}`}></span>{item.label}</span></td>
                  <td>{item.daysOfStock === Infinity ? '∞' : item.daysOfStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
