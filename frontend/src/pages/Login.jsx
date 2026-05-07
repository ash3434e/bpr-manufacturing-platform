import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Factory, Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div className="sidebar-logo-icon" style={{ width: 56, height: 56, fontSize: '1.6rem' }}>B</div>
          </div>
          <h1>BPR Manufacturing Platform</h1>
          <p>AI-Enabled Buffer & Supply Chain Optimization</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label"><User size={14} style={{verticalAlign:'middle',marginRight:4}} />Username</label>
            <input id="login-username" className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label"><Lock size={14} style={{verticalAlign:'middle',marginRight:4}} />Password</label>
            <input id="login-password" className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          <button id="login-submit" className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-hint">
          <p>Contact your administrator for access credentials</p>
        </div>
      </div>
    </div>
  );
}
