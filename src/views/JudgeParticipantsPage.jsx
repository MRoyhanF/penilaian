import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  PlusCircle, 
  ArrowLeft, 
  Phone, 
  School, 
  Code2, 
  Loader2,
  Sparkles
} from 'lucide-react';

export default function JudgeParticipantsPage({ 
  categoryId, 
  onBack, 
  onSelectParticipant 
}) {
  const { t } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | scored | pending

  const loadParticipants = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getJudgeParticipants(categoryId);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoryId) {
      loadParticipants();
    }
  }, [categoryId]);

  const filteredParticipants = useMemo(() => {
    if (!data?.participants) return [];
    
    return data.participants.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.school && p.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.project && p.project.toLowerCase().includes(searchQuery.toLowerCase())) ||
        String(p.number).includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter === 'scored') return p.has_scored;
      if (statusFilter === 'pending') return !p.has_scored;
      return true;
    });
  }, [data, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="page-loading-state">
        <Loader2 size={36} className="spinner-icon text-accent" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  const category = data?.category;
  const participants = data?.participants || [];
  const scoredCount = participants.filter(p => p.has_scored).length;
  const pendingCount = participants.length - scoredCount;

  return (
    <div className="page-content-wrapper">
      <div className="page-header-with-back">
        <button type="button" className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>{t('back')}</span>
        </button>
        <div className="header-titles">
          <span className="section-category-tag">{t('scoringCategory')}: {category?.name}</span>
          <h1 className="page-main-title">{t('navParticipants')}</h1>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="participants-toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={t('search')}
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

        <div className="filter-pills-row">
          <button
            type="button"
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {t('filterAll', { count: participants.length })}
          </button>
          <button
            type="button"
            className={`filter-pill success ${statusFilter === 'scored' ? 'active' : ''}`}
            onClick={() => setStatusFilter('scored')}
          >
            <CheckCircle2 size={14} />
            <span>{t('filterScored', { count: scoredCount })}</span>
          </button>
          <button
            type="button"
            className={`filter-pill warning ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <Clock size={14} />
            <span>{t('filterPending', { count: pendingCount })}</span>
          </button>
        </div>
      </div>

      {/* Participants Grid / Cards for touch/tablet */}
      {filteredParticipants.length === 0 ? (
        <div className="empty-state-box">
          <p>{t('noParticipantsFound')}</p>
        </div>
      ) : (
        <div className="participants-cards-grid">
          {filteredParticipants.map((p) => {
            const hasScored = p.has_scored;
            const scoreTotal = p.score_total;

            return (
              <div 
                key={p.id} 
                className={`participant-card ${hasScored ? 'is-scored' : 'is-pending'}`}
                onClick={() => onSelectParticipant(p.id)}
              >
                <div className="participant-card-top">
                  <div className="participant-num-badge">#{p.number}</div>
                  <div className={`status-pill ${hasScored ? 'status-scored' : 'status-pending'}`}>
                    {hasScored ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span>{t('scored')}</span>
                      </>
                    ) : (
                      <>
                        <Clock size={13} />
                        <span>{t('pending')}</span>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="participant-card-name">{p.name}</h3>

                {p.school && (
                  <div className="participant-meta-item">
                    <School size={15} className="meta-icon" />
                    <span>{p.school}</span>
                  </div>
                )}

                {p.project && (
                  <div className="participant-project-box">
                    <Code2 size={15} className="project-icon" />
                    <span className="project-title">{p.project}</span>
                  </div>
                )}

                <div className="participant-card-footer">
                  {hasScored ? (
                    <div className="score-summary-display">
                      <span className="score-label">{t('currentScore')}:</span>
                      <span className="score-value-bold">{scoreTotal}</span>
                      <span className="score-denom">/100</span>
                    </div>
                  ) : (
                    <span className="not-scored-text">{t('pending')}</span>
                  )}

                  <button
                    type="button"
                    className={`btn-score-action ${hasScored ? 'btn-edit' : 'btn-input'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectParticipant(p.id);
                    }}
                  >
                    {hasScored ? <Edit3 size={15} /> : <PlusCircle size={15} />}
                    <span>{hasScored ? t('editScoreBtn') : t('inputScoreBtn')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
