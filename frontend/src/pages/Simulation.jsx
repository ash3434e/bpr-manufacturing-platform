import { useState, useEffect } from 'react';
import api from '../utils/api';
import { FlaskConical, ArrowRight } from 'lucide-react';

const ZC = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };

export default function Simulation() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [scenario, setScenario] = useState({ demandIncreasePct: 0, supplierDelayDays: 0, machineFailure: false });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/forecast').then(r => { setProducts(r.data); if (r.data.length > 0) setSelectedProduct(r.data[0].id); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const runSimulation = () => {
    if (!selectedProduct) return;
    api.post('/forecast/simulate', { product_id: selectedProduct, scenario }).then(r => setResult(r.data)).catch(() => {});
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">What-If Simulation</h2><p className="page-subtitle">Simulate demand spikes, supplier delays, and machine failures</p></div>
      </div>
      <div className="grid-2">
        <div className="section-card">
          <div className="section-card-header"><h3><FlaskConical size={16} style={{verticalAlign:'middle',marginRight:6}}/>Scenario Parameters</h3></div>
          <div className="section-card-body">
            <div className="form-group">
              <label className="form-label">Product</label>
              <select className="form-input" value={selectedProduct} onChange={e => setSelectedProduct(parseInt(e.target.value))}>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="sim-control">
              <div className="sim-label"><span>Demand Increase</span><span style={{color:'var(--accent-primary)'}}>{scenario.demandIncreasePct}%</span></div>
              <input className="sim-slider" type="range" min="0" max="100" value={scenario.demandIncreasePct} onChange={e => setScenario({...scenario, demandIncreasePct: parseInt(e.target.value)})} />
            </div>
            <div className="sim-control">
              <div className="sim-label"><span>Supplier Delay</span><span style={{color:'var(--accent-primary)'}}>{scenario.supplierDelayDays} days</span></div>
              <input className="sim-slider" type="range" min="0" max="30" value={scenario.supplierDelayDays} onChange={e => setScenario({...scenario, supplierDelayDays: parseInt(e.target.value)})} />
            </div>
            <div className="form-group" style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
              <input type="checkbox" id="machine-failure" checked={scenario.machineFailure} onChange={e => setScenario({...scenario, machineFailure: e.target.checked})} style={{accentColor:'var(--accent-primary)'}} />
              <label htmlFor="machine-failure" className="form-label" style={{margin:0}}>Machine Failure Scenario</label>
            </div>
            <button className="btn btn-primary" onClick={runSimulation} style={{width:'100%',marginTop:'0.5rem'}}>Run Simulation</button>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card-header"><h3>Simulation Results</h3></div>
          <div className="section-card-body">
            {!result ? (
              <div className="empty-state"><FlaskConical size={40} /><p>Adjust parameters and run simulation</p></div>
            ) : (
              <div>
                <div style={{textAlign:'center',marginBottom:'1.5rem',fontWeight:600}}>{result.product.name} ({result.product.sku})</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'1.5rem',marginBottom:'1.5rem'}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'0.65rem',color:'var(--text-muted)',marginBottom:4}}>CURRENT</div>
                    <div style={{fontSize:'2rem',fontWeight:700,color:ZC[result.current.zone]}}>{result.current.bpr}%</div>
                    <span className={`zone-badge ${result.current.zone}`}>{result.current.zone}</span>
                  </div>
                  <ArrowRight size={24} color="var(--text-muted)" />
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'0.65rem',color:'var(--text-muted)',marginBottom:4}}>SIMULATED</div>
                    <div style={{fontSize:'2rem',fontWeight:700,color:ZC[result.simulated.zone]}}>{result.simulated.bpr}%</div>
                    <span className={`zone-badge ${result.simulated.zone}`}>{result.simulated.zone}</span>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
                  <div style={{padding:'0.75rem',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',textAlign:'center'}}>
                    <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>BPR Change</div>
                    <div style={{fontSize:'1.25rem',fontWeight:700,color:result.impact.bprChange > 0 ? ZC.red : ZC.green}}>
                      {result.impact.bprChange > 0 ? '+' : ''}{result.impact.bprChange}%
                    </div>
                  </div>
                  <div style={{padding:'0.75rem',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',textAlign:'center'}}>
                    <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>Stock Change</div>
                    <div style={{fontSize:'1.25rem',fontWeight:700,color:result.impact.stockChange < 0 ? ZC.red : ZC.green}}>
                      {result.impact.stockChange > 0 ? '+' : ''}{result.impact.stockChange}
                    </div>
                  </div>
                  <div style={{padding:'0.75rem',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',textAlign:'center'}}>
                    <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>Available Stock</div>
                    <div style={{fontSize:'1.25rem',fontWeight:700}}>{result.current.availableStock} → {result.simulated.availableStock}</div>
                  </div>
                  <div style={{padding:'0.75rem',background:'var(--bg-input)',borderRadius:'var(--radius-sm)',textAlign:'center'}}>
                    <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>Days of Stock</div>
                    <div style={{fontSize:'1.25rem',fontWeight:700}}>{result.current.daysOfStock} → {result.simulated.daysOfStock}</div>
                  </div>
                </div>
                {result.impact.zoneChanged && (
                  <div style={{marginTop:'1rem',padding:'0.75rem',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:8,fontSize:'0.82rem',color:ZC.red,textAlign:'center'}}>
                    ⚠ Zone changed from <strong>{result.current.zone}</strong> to <strong>{result.simulated.zone}</strong> — action may be required
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
