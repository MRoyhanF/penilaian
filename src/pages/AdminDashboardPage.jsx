import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import ResetScoresModal from '../components/ResetScoresModal';
import { 
  Users, 
  Award, 
  Layers, 
  CheckCircle2, 
  TrendingUp, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  Loader2,
  Trash2
} from 'lucide-react';

export default function AdminDashboardPage({ onNavigate, onSelectCategoryResults, showToast }) {
  const { t } = useLanguage();

  const [stats, setStats] = useState(null);
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashData, judgesData] = await Promise.all([
        api.getAdminDashboard(),
        api.getAdminJudges(),
      ]);
      setStats(dashData);
      setJudges(judgesData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="page-loading-state">
        <Loader2 size={36} className="spinner-icon text-accent" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  const categories = (stats?.categoryStats || []).map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  return (
    <div className="page-content-wrapper">
      <div className="dashboard-header-row">
        <div>
          <h1 className="page-main-title">{t('adminTitle')}</h1>
          <p className="page-main-desc">{t('adminSubtitle')}</p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-danger-outline"
            onClick={() => setIsResetModalOpen(true)}
            title={t('resetScoresBtn')}
          >
            <Trash2 size={16} />
            <span>{t('resetScoresBtn')}</span>
          </button>
          <button
            type="button"
            className="btn-refresh"
            onClick={loadDashboard}
            title={t('refresh')}
          >
            <RefreshCw size={16} />
            <span>{t('refresh')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error-card">
          <span>{error}</span>
          <button type="button" onClick={loadDashboard} className="btn-retry">
            {t('refresh')}
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon icon-blue">
            <Users size={22} />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">{t('statTotalParticipants')}</span>
            <span className="stat-card-number">{stats?.totalParticipants || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-purple">
            <UserCheck size={22} />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">{t('statTotalJudges')}</span>
            <span className="stat-card-number">{stats?.totalJudges || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-amber">
            <Layers size={22} />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">{t('statTotalCategories')}</span>
            <span className="stat-card-number">{stats?.totalCategories || 0}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon icon-green">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">{t('statTotalScored')}</span>
            <span className="stat-card-number">
              {stats?.totalScoresSubmitted || 0}
              <small className="denom-text"> / {stats?.expectedScores || 0}</small>
            </span>
          </div>
        </div>

        <div className="stat-card highlight-card">
          <div className="stat-card-icon icon-indigo">
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-body">
            <span className="stat-card-label">{t('statCompletionRate')}</span>
            <span className="stat-card-number">{stats?.completionRate || 0}%</span>
          </div>
          <div className="mini-progress-track">
            <div 
              className="mini-progress-fill" 
              style={{ width: `${stats?.completionRate || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Categories Progress Breakdown */}
      <div className="dashboard-section-block">
        <div className="section-header-flex">
          <h2 className="section-heading">{t('categoryOverview')}</h2>
          <button
            type="button"
            className="btn-link-action"
            onClick={() => onNavigate('admin-results')}
          >
            <span>{t('viewCategoryResults')}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="category-progress-grid">
          {stats?.categoryStats?.map((cat) => {
            const pct = cat.expected_count > 0 
              ? Math.round((cat.scored_count / cat.expected_count) * 100) 
              : 0;
            const isFinished = pct >= 100;

            return (
              <div 
                key={cat.id} 
                className="admin-cat-progress-card"
                onClick={() => onSelectCategoryResults(cat.code)}
              >
                <div className="admin-cat-header">
                  <div>
                    <span className="cat-badge-code">{cat.code.toUpperCase()}</span>
                    <h4 className="admin-cat-name">{cat.name}</h4>
                  </div>
                  {isFinished && (
                    <span className="badge-complete">
                      <CheckCircle2 size={14} />
                      {t('completed')}
                    </span>
                  )}
                </div>

                <div className="admin-cat-metrics">
                  <div className="metric-box">
                    <span className="metric-label">{t('statTotalParticipants')}</span>
                    <span className="metric-val">{cat.participant_count}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{t('statTotalScored')}</span>
                    <span className="metric-val">{cat.scored_count} / {cat.expected_count}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">{t('status')}</span>
                    <span className="metric-val font-accent">{pct}%</span>
                  </div>
                </div>

                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Judge Pairs Table / List */}
      <div className="dashboard-section-block">
        <h2 className="section-heading">{t('judgePairsTitle')}</h2>
        <div className="judges-cards-row">
          {judges.map((j) => (
            <div key={j.id} className="judge-info-card">
              <div className="judge-avatar-orb">
                <UserCheck size={20} />
              </div>
              <div className="judge-info-details">
                <h4 className="judge-card-name">{j.name}</h4>
                <span className="judge-username">@{j.username}</span>
                <div className="judge-assigned-tags">
                  {j.categories ? j.categories.split(', ').map((catName, idx) => (
                    <span key={idx} className="assigned-tag">{catName}</span>
                  )) : (
                    <span className="assigned-tag text-muted">{t('notAssigned')}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ResetScoresModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        categories={categories}
        onResetSuccess={loadDashboard}
        showToast={showToast}
      />
    </div>
  );
}
