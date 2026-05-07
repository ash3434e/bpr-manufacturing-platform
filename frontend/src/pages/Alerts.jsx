import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Bell, CheckCircle, Filter } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', severity: '', acknowledged: '0' });

  const fetchAlerts = () => {
    const params = {};
    if (filter.type) params.type = filter.type;
    if (filter.severity) params.severity = filter.severity;
    if (filter.acknowledged !== '') params.acknowledged = filter.acknowledged;
    Promise.all([
      api.get('/alerts', { params }),
      api.get('/alerts/summary')
    ]).then(([a, s]) => {
      setAlerts(a.data);
      setSummary(s.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  const handleAcknowledge = async (id) => {
    await api.put(`/alerts/${id}/acknowledge`);
    fetchAlerts();
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Smart Alerts & Decision Engine</h2><p className="page-subtitle">Auto-generated alerts with actionable recommendations</p></div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-card-value">{summary.total}</div>
            <div className="stat-card-label">Active Alerts</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: '#ef4444' }}>{summary.critical}</div>
            <div className="stat-card-label">Critical</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: '#f59e0b' }}>{summary.warning}</div>
            <div className="stat-card-label">Warning</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value" style={{ color: '#00d4ff' }}>{summary.info}</div>
            <div className="stat-card-label">Info</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
        <select className="filter-select" value={filter.type} onChange={e => setFilter({ ...filter, type: e.target.value })}>
          <option value="">All Types</option>
          <option value="bpr_red">BPR Red Zone</option>
          <option value="bpr_yellow">BPR Yellow Zone</option>
          <option value="supplier_risk">Supplier Risk</option>
          <option value="bottleneck">Bottleneck</option>
          <option value="demand_spike">Demand Spike</option>
          <option value="overstock">Overstock</option>
        </select>
        <select className="filter-select" value={filter.severity} onChange={e => setFilter({ ...filter, severity: e.target.value })}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <select className="filter-select" value={filter.acknowledged} onChange={e => setFilter({ ...filter, acknowledged: e.target.value })}>
          <option value="0">Active Only</option>
          <option value="1">Acknowledged</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Alert List */}
      <div className="section-card">
        <div className="section-card-header"><h3>Alerts ({alerts.length})</h3></div>
        <div className="section-card-body">
          {alerts.length === 0 ? (
            <div className="empty-state"><Bell size={40} /><p>No alerts match the current filters</p></div>
          ) : (
            alerts.map((alert, i) => (
              <div className="alert-item" key={i} style={{ opacity: alert.acknowledged ? 0.5 : 1 }}>
                <div className={`alert-severity-dot ${alert.severity}`}></div>
                <div className="alert-content">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 50, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{alert.type.replace(/_/g, ' ')}</span>
                    <span className={`zone-badge ${alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'yellow' : ''}`}
                      style={alert.severity === 'info' ? { background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' } : {}}>
                      {alert.severity}
                    </span>
                    {alert.plant_name && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{alert.plant_name}</span>}
                  </div>
                  <div className="alert-message">{alert.message}</div>
                  {alert.recommendation && <div className="alert-recommendation">💡 {alert.recommendation}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div className="alert-time">{alert.created_at?.split('T')[0]}</div>
                  {!alert.acknowledged && (
                    <button className="btn btn-sm btn-success" onClick={() => handleAcknowledge(alert.id)}>
                      <CheckCircle size={12} /> Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
