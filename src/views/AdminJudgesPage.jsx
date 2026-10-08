import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import JudgeFormModal from '../components/JudgeFormModal';
import { 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Search, 
  Layers, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  Users
} from 'lucide-react';

export default function AdminJudgesPage({ showToast }) {
  const { t } = useLanguage();

  const [judges, setJudges] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJudge, setSelectedJudge] = useState(null); // null for create, object for edit

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [judgesData, categoriesData] = await Promise.all([
        api.getAdminJudges(),
        api.getCategories(),
      ]);
      setJudges(judgesData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message || 'Failed to load judges data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredJudges = useMemo(() => {
    if (!searchQuery.trim()) return judges;
    const q = searchQuery.toLowerCase();
    return judges.filter((j) => 
      j.name.toLowerCase().includes(q) ||
      j.username.toLowerCase().includes(q) ||
      (j.categories_label && j.categories_label.toLowerCase().includes(q))
    );
  }, [judges, searchQuery]);

  const handleCreate = () => {
    setSelectedJudge(null);
    setIsModalOpen(true);
  };

  const handleEdit = (judge) => {
    setSelectedJudge(judge);
    setIsModalOpen(true);
  };

  const handleDelete = async (judge) => {
    if (!window.confirm(t('deleteJudgeConfirm', { name: judge.name }))) {
      return;
    }

    try {
      await api.deleteJudge(judge.id);
      showToast?.(t('judgeDeletedSuccess'), 'success');
      loadData();
    } catch (err) {
      showToast?.(err.message || t('judgeDeleteError'), 'error');
    }
  };

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
      {/* Header Row */}
      <div className="dashboard-header-row">
        <div>
          <h1 className="page-main-title">{t('manageJudgesTitle')}</h1>
          <p className="page-main-desc">{t('manageJudgesSubtitle')}</p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-action-primary"
            onClick={handleCreate}
          >
            <UserPlus size={16} />
            <span>{t('addJudgeBtn')}</span>
          </button>
          <button
            type="button"
            className="btn-refresh"
            onClick={loadData}
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
          <button type="button" onClick={loadData} className="btn-retry">
            {t('refresh')}
          </button>
        </div>
      )}

      {/* Search & Counter Toolbar */}
      <div className="participants-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t('searchJudgePlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              type="button" 
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="counter-pill-badge">
          <Users size={16} className="text-accent" />
          <span>{t('totalJudgesCount', { count: judges.length })}</span>
        </div>
      </div>

      {/* Judges Cards Grid */}
      {filteredJudges.length === 0 ? (
        <div className="empty-state-box">
          <p>{t('noJudgesFound')}</p>
        </div>
      ) : (
        <div className="judges-management-grid">
          {filteredJudges.map((judge) => {
            const hasAssigned = judge.categories && judge.categories.length > 0;
            const scored = judge.scored_count || 0;
            const total = judge.total_participants || 0;
            const progressPct = total > 0 ? Math.round((scored / total) * 100) : 0;

            return (
              <div key={judge.id} className="judge-management-card">
                <div className="judge-mgmt-top">
                  <div className="judge-avatar-large">
                    <UserCheck size={26} />
                  </div>
                  <div className="judge-mgmt-info">
                    <h3 className="judge-name-heading">{judge.name}</h3>
                    <span className="judge-handle">@{judge.username}</span>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="judge-card-actions">
                    <button
                      type="button"
                      className="btn-icon-action edit-btn"
                      onClick={() => handleEdit(judge)}
                      title={t('editJudgeBtn')}
                      aria-label={t('editJudgeBtn')}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-action delete-btn"
                      onClick={() => handleDelete(judge)}
                      title={t('deleteJudgeBtn')}
                      aria-label={t('deleteJudgeBtn')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Assigned Categories */}
                <div className="judge-mgmt-section">
                  <span className="section-label-tiny">{t('assignedCategories')}:</span>
                  <div className="judge-cat-chips">
                    {hasAssigned ? (
                      judge.categories.map((cat) => (
                        <span key={cat.id} className="cat-chip-pill">
                          {cat.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-sm">{t('notAssigned')}</span>
                    )}
                  </div>
                </div>

                {/* Scoring Progress bar */}
                <div className="judge-progress-box">
                  <div className="progress-bar-label">
                    <span>{t('scoringProgress')}</span>
                    <span className="font-mono-bold">
                      {scored} / {total} ({progressPct}%)
                    </span>
                  </div>
                  <div className="progress-track">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Judge Form Modal */}
      <JudgeFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        judge={selectedJudge}
        categories={categories}
        onSaved={loadData}
        showToast={showToast}
      />
    </div>
  );
}
