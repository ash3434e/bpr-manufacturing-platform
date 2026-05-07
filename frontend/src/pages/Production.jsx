import { useState, useEffect } from 'react';
import api from '../utils/api';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, Wrench, Pause } from 'lucide-react';

export default function Production() {
  const [machines, setMachines] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/production/machines'),
      api.get('/production/schedule'),
      api.get('/production/overview')
    ]).then(([m, s, o]) => {
      setMachines(m.data);
      setSchedule(s.data);
      setOverview(o.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  const statusIcons = { running: CheckCircle, idle: Pause, maintenance: Wrench, breakdown: AlertTriangle };
  const statusColors = { running: '#10b981', idle: '#64748b', maintenance: '#f59e0b', breakdown: '#ef4444' };

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Production Monitoring</h2><p className="page-subtitle">Machine utilization, bottleneck detection, and production schedules</p></div>
      </div>

      {/* Overview KPIs */}
      {overview && (
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-card-value">{overview.totalMachines}</div>
            <div className="stat-card-label">Total Machines</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: overview.avgUtilization > 85 ? '#f59e0b' : '#10b981' }}>{overview.avgUtilization}%</div>
            <div className="stat-card-label">Avg Utilization</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: '#ef4444' }}>{overview.bottleneckCount}</div>
            <div className="stat-card-label">Bottlenecks</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: '#10b981' }}>{overview.completionRate}%</div>
            <div className="stat-card-label">Schedule Completion</div>
          </div>
        </div>
      )}

      {/* Machine Heatmap */}
      <div className="section-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-card-header"><h3>Machine Utilization Heatmap</h3><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>&gt;85% = Bottleneck</span></div>
        <div className="section-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
            {machines.map((m, i) => {
              const cls = m.utilization_pct > 95 ? 'critical' : m.utilization_pct > 85 ? 'high' : m.utilization_pct > 60 ? 'medium' : 'low';
              const Icon = statusIcons[m.status] || CheckCircle;
              return (
                <div className={`heatmap-cell ${cls}`} key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                    <Icon size={14} color={statusColors[m.status]} />
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>{m.status}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{m.utilization_pct}%</div>
                  <div style={{ fontSize: '0.72rem', marginTop: '0.25rem', opacity: 0.8 }}>{m.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{m.plant_name?.split(' ')[0]}</div>
                  {m.isBottleneck && <div style={{ marginTop: '0.35rem', fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>⚠ BOTTLENECK</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Production Schedule */}
      <div className="section-card">
        <div className="section-card-header"><h3>Production Schedule</h3></div>
        <div className="section-card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Machine</th><th>Plant</th><th>Planned</th><th>Actual</th><th>Progress</th><th>Date</th><th>Shift</th><th>Status</th></tr></thead>
            <tbody>
              {schedule.map((s, i) => {
                const progress = s.planned_qty > 0 ? Math.round(s.actual_qty / s.planned_qty * 100) : 0;
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{s.product_name}</td>
                    <td>{s.machine_name}</td>
                    <td>{s.plant_name?.split(' ')[0]}</td>
                    <td>{s.planned_qty}</td>
                    <td>{s.actual_qty}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="bpr-gauge" style={{ width: 60 }}>
                          <div className="bpr-gauge-fill green" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem' }}>{progress}%</span>
                      </div>
                    </td>
                    <td>{s.scheduled_date}</td>
                    <td style={{ textTransform: 'capitalize' }}>{s.shift}</td>
                    <td>
                      <span className={`zone-badge ${s.status === 'completed' ? 'green' : s.status === 'in_progress' ? 'yellow' : s.status === 'delayed' ? 'red' : ''}`}
                        style={!['completed', 'in_progress', 'delayed'].includes(s.status) ? { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
