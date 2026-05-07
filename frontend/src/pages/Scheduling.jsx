import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Calendar, ArrowRight, AlertTriangle } from 'lucide-react';

const ZC = { green: '#059669', yellow: '#d97706', red: '#dc2626' };
const BG = { green: '#ecfdf5', yellow: '#fffbeb', red: '#fef2f2' };

export default function Scheduling() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bufferDays, setBufferDays] = useState(1);
  const [expanded, setExpanded] = useState(null);

  const fetchSchedules = () => {
    setLoading(true);
    api.get('/scheduling', { params: { buffer_days: bufferDays } })
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchSchedules(); }, [bufferDays]);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!data) return <div className="empty-state"><p>No scheduling data available</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Auto-Scheduling Engine</h2>
          <p className="page-subtitle">Automatic production scheduling with Green/Yellow/Red schedulability for every order</p>
        </div>
        <div style={{display:'flex',gap:'0.75rem',alignItems:'center'}}>
          <label style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>Buffer days between steps:</label>
          <select className="filter-select" value={bufferDays} onChange={e => setBufferDays(parseInt(e.target.value))}>
            <option value={0}>0 (No buffer)</option>
            <option value={1}>1 day</option>
            <option value={2}>2 days</option>
            <option value={3}>3 days</option>
          </select>
        </div>
      </div>

      <div className="zone-summary" style={{marginBottom:'1.5rem'}}>
        <div className="zone-summary-item green">
          <div className="zone-summary-count" style={{color:ZC.green}}>{data.summary.green}</div>
          <div className="zone-summary-label">On Track</div>
        </div>
        <div className="zone-summary-item yellow">
          <div className="zone-summary-count" style={{color:ZC.yellow}}>{data.summary.yellow}</div>
          <div className="zone-summary-label">Tight Schedule</div>
        </div>
        <div className="zone-summary-item red">
          <div className="zone-summary-count" style={{color:ZC.red}}>{data.summary.red}</div>
          <div className="zone-summary-label">Delayed</div>
        </div>
      </div>

      {data.schedules.filter(s => !s.error).map((s, i) => (
        <div className="section-card" key={i} style={{marginBottom:'0.85rem'}}>
          <div className="section-card-header" style={{cursor:'pointer'}} onClick={() => setExpanded(expanded === i ? null : i)}>
            <div style={{display:'flex',alignItems:'center',gap:'0.85rem'}}>
              <span className={`zone-badge ${s.schedulability}`}>
                <span className={`zone-dot ${s.schedulability}`}></span>
                {s.schedulability_label}
              </span>
              <h3 style={{fontSize:'0.85rem'}}>{s.product_name}</h3>
              <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Order #{s.order_id} · {s.quantity} units</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'0.85rem'}}>
              <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{s.total_processes} steps · {s.total_days} days</span>
              <span style={{fontSize:'0.72rem',color:ZC[s.schedulability],fontWeight:600}}>{s.due_date ? `Due: ${s.due_date}` : 'No due date'}</span>
              {s.bottleneck_risk && <AlertTriangle size={14} color={ZC.yellow} />}
            </div>
          </div>

          {expanded === i && (
            <div className="section-card-body">
              <div style={{display:'flex',gap:'0.35rem',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap'}}>
                <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginRight:'0.5rem'}}>
                  <Calendar size={12} style={{verticalAlign:'middle',marginRight:4}} />{s.order_date}
                </div>
                {s.schedule.map((step, j) => (
                  <div key={j} style={{display:'flex',alignItems:'center',gap:'0.3rem'}}>
                    <div style={{
                      padding:'0.35rem 0.55rem',
                      background: step.machine_utilization > 90 ? '#fef2f2' : '#f8f9fb',
                      border: `1px solid ${step.machine_utilization > 90 ? '#fecaca' : 'var(--border-color)'}`,
                      borderRadius:'var(--radius-sm)',fontSize:'0.72rem'
                    }}>
                      <div style={{fontWeight:600,color:'var(--text-primary)'}}>{step.process_name}</div>
                      <div style={{color:'var(--text-muted)',fontSize:'0.62rem'}}>{step.duration_days}d · {step.assigned_machine}</div>
                      <div style={{color:'var(--text-muted)',fontSize:'0.58rem'}}>{step.start_date} → {step.end_date}</div>
                    </div>
                    {j < s.schedule.length - 1 && (
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                        <ArrowRight size={14} color="#4f46e5" />
                        {step.buffer_after > 0 && <span style={{fontSize:'0.55rem',color:'var(--text-muted)'}}>{step.buffer_after}d</span>}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{fontSize:'0.72rem',color:ZC[s.schedulability],fontWeight:600,marginLeft:'0.5rem'}}>
                  → Complete: {s.completion_date}
                  {s.days_slack !== null && ` (${s.days_slack >= 0 ? '+' : ''}${s.days_slack} days)`}
                </div>
              </div>

              <table className="data-table">
                <thead><tr><th>Step</th><th>Process</th><th>Duration</th><th>Machine</th><th>Load</th><th>Start</th><th>End</th><th>Buffer</th></tr></thead>
                <tbody>
                  {s.schedule.map((step, j) => (
                    <tr key={j}>
                      <td>{step.step}</td>
                      <td style={{fontWeight:500,color:'var(--text-primary)'}}>{step.process_name}</td>
                      <td>{step.duration_hours}h ({step.duration_days}d)</td>
                      <td>{step.assigned_machine}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                          <div className="bpr-gauge" style={{width:50}}>
                            <div className="bpr-gauge-fill" style={{width:`${step.machine_utilization}%`, background: step.machine_utilization > 90 ? ZC.red : step.machine_utilization > 70 ? ZC.yellow : ZC.green}}></div>
                          </div>
                          <span style={{fontSize:'0.72rem'}}>{step.machine_utilization}%</span>
                        </div>
                      </td>
                      <td>{step.start_date}</td>
                      <td>{step.end_date}</td>
                      <td>{step.buffer_after > 0 ? `${step.buffer_after}d` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
