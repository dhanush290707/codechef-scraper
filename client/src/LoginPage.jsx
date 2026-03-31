import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, UserPlus, User, Lock, AlertCircle, Tag } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError('');
  };

  const toggleMode = () => {
    resetForm();
    setIsRegister(!isRegister);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register(username.trim(), password, displayName.trim() || username.trim());
      } else {
        await login(username.trim(), password);
      }
    } catch (err) {
      setError(err.response?.data?.error || `${isRegister ? 'Registration' : 'Login'} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orb login-bg-orb-1"></div>
      <div className="login-bg-orb login-bg-orb-2"></div>
      <div className="login-bg-orb login-bg-orb-3"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">⚡</span>
          </div>
          <h1>CodeChef Profiler</h1>
          <p>{isRegister ? 'Create a viewer account' : 'Sign in to access the dashboard'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div className="login-field fade-in">
              <label htmlFor="register-displayname">
                <Tag size={14} />
                Display Name
              </label>
              <input
                id="register-displayname"
                type="text"
                placeholder="Your display name (optional)"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-username">
              <User size={14} />
              Username
            </label>
            <input
              id="login-username"
              type="text"
              placeholder={isRegister ? 'Choose a username' : 'Enter your username'}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">
              <Lock size={14} />
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder={isRegister ? 'Choose a password (min 4 chars)' : 'Enter your password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {isRegister && (
            <div className="login-field fade-in">
              <label htmlFor="register-confirm">
                <Lock size={14} />
                Confirm Password
              </label>
              <input
                id="register-confirm"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <div className="spinner-small"></div>
            ) : isRegister ? (
              <UserPlus size={18} />
            ) : (
              <LogIn size={18} />
            )}
            {loading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="login-footer">
          <div className="login-toggle">
            <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
            <button type="button" className="login-toggle-btn" onClick={toggleMode}>
              {isRegister ? 'Sign In' : 'Register as Viewer'}
            </button>
          </div>

          {!isRegister && (
            <div className="login-creds-section">
              <p>Default credentials</p>
              <div className="login-creds">
                <span className="login-cred">
                  <strong>Admin:</strong> admin / admin123
                </span>
                <span className="login-cred">
                  <strong>Viewer:</strong> viewer / viewer123
                </span>
              </div>
            </div>
          )}

          {isRegister && (
            <div className="login-register-note fade-in">
              <p>Registered accounts are <strong>viewer-only</strong> — you'll be able to view saved profiles, analytics, and download data.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
