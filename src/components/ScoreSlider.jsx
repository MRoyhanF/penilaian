import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Minus, Plus } from 'lucide-react';

export default function ScoreSlider({
  subCriterion,
  value,
  onChange,
  subKey,
}) {
  const { t } = useLanguage();
  const currentVal = value !== undefined && value !== null ? Number(value) : 0;
  const max = subCriterion.max_score || 25;

  const handleSliderChange = (e) => {
    onChange(Number(e.target.value));
  };

  const handleStep = (step) => {
    const newVal = Math.max(0, Math.min(max, currentVal + step));
    onChange(newVal);
  };

  const handlePreset = (val) => {
    onChange(val);
  };

  // Get translated title & description or fallback to DB values
  const titleKey = `rubric.${subCriterion.code}_title`;
  const descKey = `rubric.${subCriterion.code}_desc`;
  const title = t(titleKey) !== titleKey ? t(titleKey) : subCriterion.name;
  const detail = t(descKey) !== descKey ? t(descKey) : (subCriterion.detail || '');

  // Score color intensity
  const percentage = (currentVal / max) * 100;
  let scoreColorClass = 'score-low';
  if (percentage >= 80) scoreColorClass = 'score-high';
  else if (percentage >= 50) scoreColorClass = 'score-med';

  return (
    <div className="sub-criteria-card">
      <div className="sub-criteria-header">
        <div className="sub-criteria-info">
          <h4 className="sub-criteria-title">{title}</h4>
          {detail && <p className="sub-criteria-desc">{detail}</p>}
        </div>
        <div className={`score-badge ${scoreColorClass}`}>
          <span className="score-num">{currentVal}</span>
          <span className="score-max">/{max}</span>
        </div>
      </div>

      <div className="score-controls-container">
        {/* Quick presets for rapid touch interaction on tablets */}
        <div className="presets-row">
          <span className="presets-label">{t('quickPick')}</span>
          <div className="presets-buttons">
            {[0, 5, 10, 15, 20, 25].map((presetVal) => (
              <button
                key={presetVal}
                type="button"
                className={`preset-btn ${currentVal === presetVal ? 'active' : ''}`}
                onClick={() => handlePreset(presetVal)}
              >
                {presetVal}
              </button>
            ))}
          </div>
        </div>

        {/* Stepper + Interactive Range Slider */}
        <div className="slider-row">
          <button
            type="button"
            className="stepper-btn"
            onClick={() => handleStep(-1)}
            disabled={currentVal <= 0}
            title={t('stepperDec')}
            aria-label={t('stepperDec')}
          >
            <Minus size={18} />
          </button>

          <div className="range-wrapper">
            <input
              type="range"
              min="0"
              max={max}
              step="1"
              value={currentVal}
              onChange={handleSliderChange}
              className="touch-slider"
              style={{
                background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-secondary) ${percentage}%, var(--bg-input) ${percentage}%, var(--bg-input) 100%)`
              }}
            />
            <div className="slider-ticks">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
            </div>
          </div>

          <button
            type="button"
            className="stepper-btn"
            onClick={() => handleStep(1)}
            disabled={currentVal >= max}
            title={t('stepperInc')}
            aria-label={t('stepperInc')}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
