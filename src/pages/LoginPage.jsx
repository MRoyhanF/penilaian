import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  Trophy, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  Languages, 
  ShieldCheck, 
  UserCheck 
} from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const { login } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('loginError'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await login(username.trim(), password);
      if (onLoginSuccess) onLoginSuccess(user);
    } catch (err) {
      setError(err.message || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-header-controls">
        <button
          type="button"
          className="lang-switch-btn"
          onClick={toggleLanguage}
          title={t('switchLanguage')}
        >
          <Languages size={17} className="lang-icon" />
          <span className="lang-badge active">{lang.toUpperCase()}</span>
          <span className="lang-toggle-indicator">
            {lang === 'id' ? '🇮🇩 Bahasa' : '🇬🇧 English'}
          </span>
        </button>
      </div>

      <div className="login-card-container">
        {/* Glow orb */}
        <div className="card-ambient-glow" />

        <div className="login-card">
          <div className="login-branding">
            <div className="login-logo-orb">
              <Trophy size={32} className="logo-trophy" />
            </div>
            <h1 className="login-title">{t('loginTitle')}</h1>
            <p className="login-subtitle">{t('loginSubtitle')}</p>
          </div>

          {error && (
            <div className="login-error-banner" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">
                {t('username')}
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="login-username"
                  type="text"
                  className="form-input"
                  placeholder={t('usernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                {t('password')}
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner-text">{t('loggingIn')}</span>
              ) : (
                <>
                  <span>{t('loginButton')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="demo-accounts-box">
            <div className="demo-title">
              <Sparkles size={14} className="text-accent" />
              <span>{t('quickDemoLogin')}</span>
            </div>
            <div className="demo-grid">
              <button
                type="button"
                className="demo-chip admin-chip"
                onClick={() => handleDemoFill('admin', 'admin123')}
              >
                <ShieldCheck size={14} />
                <span>{t('demoAdmin')}</span>
              </button>
              <button
                type="button"
                className="demo-chip judge-chip"
                onClick={() => handleDemoFill('eko', 'eko123')}
              >
                <UserCheck size={14} />
                <span>{t('demoJudge1')}</span>
              </button>
              <button
                type="button"
                className="demo-chip judge-chip"
                onClick={() => handleDemoFill('husna', 'husna123')}
              >
                <UserCheck size={14} />
                <span>{t('demoJudge2')}</span>
              </button>
              <button
                type="button"
                className="demo-chip judge-chip"
                onClick={() => handleDemoFill('royhan', 'royhan123')}
              >
                <UserCheck size={14} />
                <span>{t('demoJudge3')}</span>
              </button>
              <button
                type="button"
                className="demo-chip judge-chip"
                onClick={() => handleDemoFill('laylin', 'laylin123')}
              >
                <UserCheck size={14} />
                <span>{t('demoJudge4')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
