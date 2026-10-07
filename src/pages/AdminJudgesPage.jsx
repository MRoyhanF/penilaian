import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { ShieldCheck, UserCheck, RefreshCw, Loader2, Sparkles } from 'lucide-react';

export default function AdminJudgesPage() {
  const { t } = useLanguage();

  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadJudges = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminJudges();
      setJudges(data);
    } catch (err) {
      setError(err.message || 'Failed to load judges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJudges();
  }, []);

  if (loading) {
    return (
      <div className="page-loading-state">
        <Loader2 size={36} className="spinner-icon text-accent" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      <div className="dashboard-header-row">
        <div>
          <h1 className="page-main-title">{t('navJudges')}</h1>
          <p className="page-main-desc">{t('judgePairsTitle')}</p>
        </div>
        <button
          type="button"
          className="btn-refresh"
          onClick={loadJudges}
          title={t('refresh')}
        >
          <RefreshCw size={16} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {error && (
        <div className="alert-error-card">
          <span>{error}</span>
          <button type="button" onClick={loadJudges} className="btn-retry">
            {t('refresh')}
          </button>
        </div>
      )}

      <div className="judges-grid-full">
        {judges.map((j) => (
          <div key={j.id} className="judge-detailed-card">
            <div className="judge-detail-top">
              <div className="judge-avatar-large">
                <UserCheck size={28} />
              </div>
              <div className="judge-profile-meta">
                <h3 className="judge-name-heading">{j.name}</h3>
                <span className="judge-handle">@{j.username}</span>
              </div>
            </div>

            <div className="judge-categories-section">
              <span className="section-label-tiny">{t('assignedCategories')}:</span>
              <div className="judge-cat-chips">
                {j.categories ? j.categories.split(', ').map((catName, idx) => (
                  <span key={idx} className="cat-chip-pill">{catName}</span>
                )) : (
                  <span className="text-muted">{t('notAssigned')}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
