import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../services/api';
import {
  EyeIcon,
  EyeOffIcon,
  UsersIcon,
  BoxIcon,
  FileTextIcon,
  TrendingUpIcon,
} from '../components/common/icons';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@example.com' },
  { role: 'Sales', email: 'sales@example.com' },
  { role: 'Warehouse', email: 'warehouse@example.com' },
  { role: 'Accounts', email: 'accounts@example.com' },
];

const DEMO_PASSWORD = 'Password123!';

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-inner">
          <span className="brand-icon">N</span>
          <h1>Nexora ERP + CRM</h1>
          <p>
            Run your wholesale and distribution operations — customers, products, inventory,
            and challans — from one smooth dashboard.
          </p>
          <div className="login-features">
            <div className="login-feature">
              <span className="login-feature-icon"><UsersIcon size={17} /></span>
              Customer CRM with follow-up tracking
            </div>
            <div className="login-feature">
              <span className="login-feature-icon"><BoxIcon size={17} /></span>
              Real-time inventory and low-stock alerts
            </div>
            <div className="login-feature">
              <span className="login-feature-icon"><FileTextIcon size={17} /></span>
              Sales challans with atomic stock deduction
            </div>
            <div className="login-feature">
              <span className="login-feature-icon"><TrendingUpIcon size={17} /></span>
              Live business analytics and revenue insights
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-header">
            <h1>Welcome back</h1>
            <p>Sign in to your operations portal</p>
          </div>
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          {import.meta.env.DEV && (
            <div className="login-hint">
              <p><strong>Demo accounts</strong> — tap to fill:</p>
              <div className="demo-accounts">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button key={acc.email} type="button" className="demo-account" onClick={() => fillDemo(acc.email)}>
                    {acc.role}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: 8 }}>Password for all accounts: <code>Password123!</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
