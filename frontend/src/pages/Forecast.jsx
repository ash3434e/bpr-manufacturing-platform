import { useState, useEffect } from 'react';
import api from '../utils/api';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function Forecast() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [method, setMethod] = useState('moving_average');
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/forecast').then(r => {
      setProducts(r.data);
      if (r.data.length > 0) setSelectedProduct(r.data[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    api.get(`/forecast/${selectedProduct}`, { params: { method } })
      .then(r => setForecastData(r.data))
      .catch(() => {});
  }, [selectedProduct, method]);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  const TrendIcon = forecastData?.metrics?.trend === 'increasing' ? TrendingUp : forecastData?.metrics?.trend === 'decreasing' ? TrendingDown : Minus;
  const trendColor = forecastData?.metrics?.trend === 'increasing' ? '#10b981' : forecastData?.metrics?.trend === 'decreasing' ? '#ef4444' : '#f59e0b';

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Demand Forecasting</h2><p className="page-subtitle">AI-powered demand prediction with multiple forecasting algorithms</p></div>
      </div>

      {/* Controls */}
      <div className="filters-bar">
        <select className="filter-select" value={selectedProduct || ''} onChange={e => setSelectedProduct(parseInt(e.target.value))}>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.data_points} data points)</option>)}
        </select>
        <select className="filter-select" value={method} onChange={e => setMethod(e.target.value)}>
          <option value="moving_average">Moving Average</option>
          <option value="weighted_moving_average">Weighted Moving Average</option>
          <option value="linear_regression">Linear Regression</option>
        </select>
      </div>

      {forecastData && (
        <>
          {/* Metrics */}
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-card-value">{forecastData.metrics.avgDemand}</div>
              <div className="stat-card-label">Avg Daily Demand</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color: trendColor, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <TrendIcon size={20} />{forecastData.metrics.trendPct}%
              </div>
              <div className="stat-card-label">Demand Trend</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{forecastData.metrics.mape !== null ? `${forecastData.metrics.mape}%` : 'N/A'}</div>
              <div className="stat-card-label">MAPE (Accuracy)</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{forecastData.metrics.spikeCount}</div>
              <div className="stat-card-label">Demand Spikes</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">{forecastData.metrics.maxDemand}</div>
              <div className="stat-card-label">Peak Demand</div>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="section-card">
            <div className="section-card-header">
              <h3>Demand Forecast — {forecastData.product?.name}</h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Method: {method.replace(/_/g, ' ')}</span>
            </div>
            <div className="section-card-body">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={forecastData.forecast.map(f => ({ ...f, date: f.date.substring(5) }))} margin={{ top: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis />
                  <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#00d4ff" strokeWidth={2} dot={false} name="Actual Demand" connectNulls={false} />
                  <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
