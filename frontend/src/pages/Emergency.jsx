import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Siren, ShoppingCart, Truck, AlertTriangle, CheckCircle, Download } from 'lucide-react';

const ZC = { green: '#059669', yellow: '#d97706', red: '#dc2626' };

export default function Emergency() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionResults, setActionResults] = useState({});

  useEffect(() => {
    api.get('/emergency/red-zone-report').then(r => { setReport(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleEmergencyPurchase = async (invId) => {
    try {
      const r = await api.post('/emergency/purchase-requisition', { inventory_id: invId });
      setActionResults(prev => ({ ...prev, [invId]: r.data }));
      const updated = await api.get('/emergency/red-zone-report');
      setReport(updated.data);
    } catch (e) {
      setActionResults(prev => ({ ...prev, [invId]: { error: e.response?.data?.error || 'Failed' } }));
    }
  };

  const handleFindAlternate = async (supplierId) => {
    try {
      const r = await api.post('/emergency/find-alternate-supplier', { current_supplier_id: supplierId });
      setActionResults(prev => ({ ...prev, [`alt_${supplierId}`]: r.data }));
    } catch (e) {}
  };

  const handleEscalate = async (alertId, message) => {
    await api.post('/emergency/escalate', { alert_id: alertId, message, priority: 'high' });
    setActionResults(prev => ({ ...prev, [`esc_${alertId}`]: { success: true, message: 'Escalated to management' } }));
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <Siren size={22} color={ZC.red} /> Emergency Action Center
          </h2>
          <p className="page-subtitle">One-click emergency purchase orders, alternate supplier recommendations, and escalation</p>
        </div>
        <button className="btn btn-secondary" onClick={() => window.open('/api/export/alerts','_blank')}><Download size={14}/>Export Alerts CSV</button>
      </div>

      <div className="section-card" style={{marginBottom:'1.5rem'}}>
        <div className="section-card-header" style={{background:'#fef2f2'}}>
          <h3 style={{color:ZC.red}}>Red Zone Items Requiring Immediate Action ({report?.total_red_items || 0})</h3>
        </div>
        <div className="section-card-body">
          {report?.total_red_items === 0 ? (
            <div className="empty-state" style={{padding:'2rem'}}>
              <CheckCircle size={42} color={ZC.green} />
              <p style={{marginTop:'0.85rem',color:ZC.green,fontWeight:600}}>All Clear — No Red Zone Items</p>
            </div>
          ) : (
            report?.report?.map((item, i) => (
              <div className="alert-item" style={{flexDirection:'column',gap:'0.65rem',borderColor:'#fecaca'}} key={i}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'0.65rem'}}>
                    <div className="alert-severity-dot critical"></div>
                    <div>
                      <div style={{fontWeight:600,color:'var(--text-primary)'}}>{item.product_name} ({item.sku})</div>
                      <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Plant: {item.plant_name} · {item.category}</div>
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'1.35rem',fontWeight:700,color:ZC.red}}>{item.bpr}%</div>
                    <div style={{fontSize:'0.62rem',color:'var(--text-muted)'}}>BPR</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'0.4rem'}}>
                  {[
                    {l:'On Hand',v:item.on_hand},{l:'Available',v:item.availableStock},{l:'Buffer',v:item.buffer_size},
                    {l:'Days Left',v:item.daysOfStock===Infinity?'∞':item.daysOfStock,c:item.daysOfStock<=3?ZC.red:ZC.yellow},
                    {l:'Urgency',v:item.urgency?.split('—')[0],c:ZC.red},
                  ].map((s,j)=>(
                    <div key={j} style={{background:'var(--bg-input)',padding:'0.4rem',borderRadius:'var(--radius-sm)',textAlign:'center'}}>
                      <div style={{fontSize:'0.88rem',fontWeight:600,color:s.c||'var(--text-primary)'}}>{s.v}</div>
                      <div style={{fontSize:'0.58rem',color:'var(--text-muted)'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:'#fef2f2',padding:'0.65rem',borderRadius:'var(--radius-sm)',border:'1px solid #fecaca'}}>
                  <div style={{fontSize:'0.72rem',fontWeight:600,color:ZC.red,marginBottom:'0.25rem'}}>Recommended: {item.recommended_action}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-secondary)'}}>
                    Order <strong>{item.recommended_qty}</strong> units from <strong>{item.recommended_supplier}</strong> (Est: {item.estimated_delivery_days} days)
                  </div>
                </div>
                <div style={{display:'flex',gap:'0.4rem'}}>
                  <button className="btn btn-danger" onClick={() => handleEmergencyPurchase(item.id)} disabled={actionResults[item.id]?.success}>
                    <ShoppingCart size={14}/>{actionResults[item.id]?.success ? '✓ PO Created' : 'Emergency PO'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleFindAlternate(0)}><Truck size={14}/>Find Alternates</button>
                  <button className="btn btn-secondary" onClick={() => handleEscalate(null, `Red zone: ${item.product_name} — ${item.bpr}%`)}>
                    <AlertTriangle size={14}/>Escalate
                  </button>
                </div>
                {actionResults[item.id]?.success && (
                  <div style={{background:'#ecfdf5',border:'1px solid #a7f3d0',borderRadius:'var(--radius-sm)',padding:'0.6rem'}}>
                    <div style={{fontSize:'0.75rem',fontWeight:600,color:ZC.green}}>✓ {actionResults[item.id].action}</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text-secondary)',marginTop:'0.15rem'}}>
                      Order #{actionResults[item.id].order_id}: {actionResults[item.id].quantity} units from {actionResults[item.id].supplier}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid-3">
        <div className="section-card">
          <div className="section-card-header"><h3>Export Reports</h3></div>
          <div className="section-card-body" style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
            {['inventory','suppliers','production','alerts','orders','batches'].map(t=>(
              <button key={t} className="btn btn-secondary" style={{justifyContent:'flex-start'}} onClick={() => window.open(`/api/export/${t}`,'_blank')}>
                <Download size={14}/> {t.charAt(0).toUpperCase()+t.slice(1)} CSV
              </button>
            ))}
          </div>
        </div>
        <div className="section-card">
          <div className="section-card-header"><h3>Emergency Protocols</h3></div>
          <div className="section-card-body" style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>
            <div style={{marginBottom:'0.65rem'}}><strong style={{color:'var(--text-primary)'}}>1. Auto Purchase Requisition</strong><br/>Selects lowest-risk supplier and creates confirmed PO to bring item to Green zone.</div>
            <div style={{marginBottom:'0.65rem'}}><strong style={{color:'var(--text-primary)'}}>2. Alternate Suppliers</strong><br/>Ranks all active suppliers by risk score and lead time.</div>
            <div><strong style={{color:'var(--text-primary)'}}>3. Escalation</strong><br/>Creates critical alert with audit trail for management review.</div>
          </div>
        </div>
        <div className="section-card">
          <div className="section-card-header"><h3>Action Log</h3></div>
          <div className="section-card-body" style={{fontSize:'0.78rem',color:'var(--text-secondary)'}}>
            {Object.entries(actionResults).length === 0 ? (
              <p>No actions taken yet this session</p>
            ) : (
              Object.entries(actionResults).map(([key, val], i) => (
                <div key={i} style={{padding:'0.4rem 0',borderBottom:'1px solid var(--border-color)',fontSize:'0.72rem'}}>
                  {val.success ? <span style={{color:ZC.green}}>✓ {val.action || val.message}</span> : <span style={{color:ZC.red}}>✗ {val.error}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
