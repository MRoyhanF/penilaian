import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Sparkles,
  Trophy,
  Loader2
} from 'lucide-react';

export default function JudgeCategoriesPage({ onSelectCategory }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getJudgeCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
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
      <div className="page-header-block">
        <div className="welcome-tag">
          <Sparkles size={16} className="text-accent" />
          <span>{t('judgeWelcome', { name: user?.name || '' })}</span>
        </div>
        <h1 className="page-main-title">{t('navCategories')}</h1>
        <p className="page-main-desc">{t('judgeCategoryPrompt')}</p>
      </div>

      {error && (
        <div className="alert-error-card">
          <span>{error}</span>
          <button type="button" onClick={loadCategories} className="btn-retry">
            {t('refresh')}
          </button>
        </div>
      )}

      <div className="categories-grid">
        {categories.map((cat) => {
          const total = cat.total_participants || 0;
          const scored = cat.scored_count || 0;
          const percentage = total > 0 ? Math.round((scored / total) * 100) : 0;
          const isComplete = scored >= total && total > 0;

          return (
            <div
              key={cat.id}
              className={`category-card ${isComplete ? 'completed-card' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <div className="category-card-glow" />

              <div className="category-card-top">
                <div className="category-code-badge">{cat.code.toUpperCase()}</div>
                {isComplete && (
                  <div className="completed-badge">
                    <CheckCircle2 size={15} />
                    <span>{t('completed')}</span>
                  </div>
                )}
              </div>

              <h3 className="category-title">{cat.name}</h3>

              <div className="category-stats-row">
                <div className="stat-pill">
                  <Users size={16} />
                  <span>{t('participantsCount', { count: total })}</span>
                </div>
                <div className="stat-pill">
                  <Trophy size={16} />
                  <span>{percentage}% {t('completed')}</span>
                </div>
              </div>

              <div className="progress-bar-container">
                <div className="progress-bar-label">
                  <span>{t('evaluatedOf', { scored, total })}</span>
                  <span className="progress-pct">{percentage}%</span>
                </div>
                <div className="progress-track">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="category-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCategory(cat.id);
                }}
              >
                <span>{t('startScoring')}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
