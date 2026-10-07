import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import ScoreSlider from '../components/ScoreSlider';
import { 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  School, 
  Code2, 
  Phone, 
  MessageSquare, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  HelpCircle,
  Award
} from 'lucide-react';

export default function JudgeScoringPage({ 
  participantId, 
  onBack, 
  onNavigateParticipant,
  showToast 
}) {
  const { t } = useLanguage();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState({}); // { [subCriteriaId]: number }
  const [notes, setNotes] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadScoring = async () => {
    setLoading(true);
    try {
      const res = await api.getJudgeScoring(participantId);
      setData(res);
      
      // Initialize scores map
      const initialScores = {};
      if (res.scores && res.scores.length > 0) {
        res.scores.forEach((s) => {
          initialScores[s.sub_criteria_id] = s.score;
        });
      }
      setScores(initialScores);
      setNotes(res.notes || '');
    } catch (err) {
      showToast?.(err.message || t('scoreSavedError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (participantId) {
      loadScoring();
      setSaveSuccess(false);
    }
  }, [participantId]);

  const handleScoreChange = (subCriteriaId, value) => {
    setScores((prev) => ({
      ...prev,
      [subCriteriaId]: value,
    }));
  };

  // Calculate weighted scores per criteria and total
  const calculation = useMemo(() => {
    if (!data?.criteria) return { totalWeighted: 0, criteriaBreakdown: {} };

    let grandTotal = 0;
    const breakdown = {};

    data.criteria.forEach((crit) => {
      let rawSum = 0;
      let maxPossible = 0;

      crit.sub_criteria.forEach((sub) => {
        const val = scores[sub.id] !== undefined ? Number(scores[sub.id]) : 0;
        rawSum += val;
        maxPossible += (sub.max_score || 25);
      });

      // Weight calculation: (rawSum / maxPossible) * weight
      const weighted = maxPossible > 0 ? (rawSum / maxPossible) * crit.weight : 0;
      const roundedWeighted = Math.round(weighted * 100) / 100;

      breakdown[crit.id] = {
        rawSum,
        maxPossible,
        weight: crit.weight,
        weightedScore: roundedWeighted,
      };

      grandTotal += weighted;
    });

    return {
      totalWeighted: Math.round(grandTotal * 100) / 100,
      criteriaBreakdown: breakdown,
    };
  }, [data, scores]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const scoresPayload = Object.entries(scores).map(([subId, val]) => ({
        sub_criteria_id: Number(subId),
        score: Number(val),
      }));

      await api.saveScores({
        participant_id: Number(participantId),
        scores: scoresPayload,
        notes: notes.trim(),
      });

      setSaveSuccess(true);
      showToast?.(t('scoreSavedSuccess', { name: data?.participant?.name || '' }), 'success');

      // Trigger festive confetti animation
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'],
        });
      } catch {
        // Fallback if canvas confetti fails
      }
    } catch (err) {
      showToast?.(err.message || t('scoreSavedError'), 'error');
    } finally {
      setSaving(false);
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

  const participant = data?.participant;
  const criteriaList = data?.criteria || [];

  return (
    <div className="page-content-wrapper scoring-page-layout">
      {/* Top Header with Back Button and Quick Switch */}
      <div className="page-header-with-back">
        <button type="button" className="btn-back" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>{t('backToList')}</span>
        </button>

        {/* Previous / Next Participant Quick Switchers */}
        <div className="participant-nav-steppers">
          {data?.prev_participant_id && (
            <button
              type="button"
              className="btn-stepper-nav"
              onClick={() => onNavigateParticipant(data.prev_participant_id)}
              title={t('prevParticipant')}
            >
              <ChevronLeft size={18} />
              <span className="btn-nav-label">{t('prevParticipant')}</span>
            </button>
          )}
          {data?.next_participant_id && (
            <button
              type="button"
              className="btn-stepper-nav"
              onClick={() => onNavigateParticipant(data.next_participant_id)}
              title={t('nextParticipant')}
            >
              <span className="btn-nav-label">{t('nextParticipant')}</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Participant Profile Card */}
      <div className="participant-profile-banner">
        <div className="banner-left">
          <div className="participant-badge-large">#{participant?.number}</div>
          <div className="profile-info">
            <span className="profile-category-tag">{data?.category?.name}</span>
            <h1 className="profile-name">{participant?.name}</h1>
            <div className="profile-details-row">
              {participant?.school && (
                <div className="detail-tag">
                  <School size={15} />
                  <span>{participant.school}</span>
                </div>
              )}
              {participant?.project && (
                <div className="detail-tag project-tag">
                  <Code2 size={15} />
                  <span>{participant.project}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Total Score Preview (Desktop & Tablet) */}
        <div className="live-score-preview-box">
          <span className="preview-label">{t('totalWeightedScore')}</span>
          <div className="preview-score-number">
            <span className="grand-score">{calculation.totalWeighted}</span>
            <span className="grand-denom">/100</span>
          </div>
          <div className="preview-weights-summary">
            {criteriaList.map((crit) => {
              const info = calculation.criteriaBreakdown[crit.id];
              return (
                <span key={crit.id} className="weight-mini-chip">
                  {crit.code.toUpperCase()}: {info ? info.weightedScore : 0}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scoring Rubric Forms by Category */}
      <form onSubmit={handleSave} className="rubric-form-container">
        {criteriaList.map((crit) => {
          const breakdown = calculation.criteriaBreakdown[crit.id];
          const critTitle = crit.code === 'idea' ? t('criteriaIdea') : crit.code === 'code' ? t('criteriaCode') : t('criteriaPresentation');

          return (
            <div key={crit.id} className="criteria-section-card">
              <div className="criteria-section-header">
                <div className="criteria-header-titles">
                  <h3 className="criteria-name">{critTitle || crit.name}</h3>
                  <span className="criteria-weight-pill">
                    {t('weightLabel')}: {crit.weight}% ({t('subCriteriaMax')})
                  </span>
                </div>

                <div className="criteria-score-accumulator">
                  <span className="accum-label">{t('total')}:</span>
                  <span className="accum-val">
                    {breakdown ? breakdown.weightedScore : 0} / {crit.weight} {t('points')}
                  </span>
                </div>
              </div>

              <div className="sub-criteria-list">
                {crit.sub_criteria.map((sub) => (
                  <ScoreSlider
                    key={sub.id}
                    subCriterion={sub}
                    value={scores[sub.id] !== undefined ? scores[sub.id] : 0}
                    onChange={(val) => handleScoreChange(sub.id, val)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Notes & Comments Section */}
        <div className="notes-section-card">
          <div className="notes-header">
            <MessageSquare size={18} className="text-accent" />
            <h3 className="notes-title">{t('notes')}</h3>
          </div>
          <textarea
            className="notes-textarea"
            placeholder={t('notesPlaceholder')}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <span className="notes-hint">{t('notesSaved')}</span>
        </div>

        {/* Floating/Sticky Save Action Bar (Ergonomic for iPad & Mobile) */}
        <div className="sticky-scoring-footer">
          <div className="sticky-score-info">
            <span className="sticky-label">{t('totalWeightedScore')}</span>
            <span className="sticky-val">{calculation.totalWeighted} / 100</span>
          </div>

          <div className="sticky-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onBack}
            >
              {t('back')}
            </button>
            <button
              type="submit"
              className={`btn-save-score ${saveSuccess ? 'btn-saved' : ''}`}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="spinner-icon" />
                  <span>{t('saving')}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>{t('saved')}</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{t('save')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
