import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  Sparkles, 
  HelpCircle, 
  Lightbulb, 
  Code2, 
  Presentation, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp, 
  Scale, 
  Calculator,
  Award,
  Layers,
  Info
} from 'lucide-react';

export default function RubricGuideCard({ defaultExpanded = false }) {
  const { t, lang } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'idea', 'code', 'presentation'

  const criteriaData = [
    {
      id: 'idea',
      code: 'idea',
      title: t('criteriaIdea'),
      weight: 40,
      icon: <Lightbulb size={20} className="text-amber" />,
      colorClass: 'criterion-amber',
      accentColor: '#f59e0b',
      subCriteria: [
        {
          code: 'pdb_ppt',
          title: t('rubric.pdb_ppt_title'),
          desc: t('rubric.pdb_ppt_desc'),
          max: 25,
        },
        {
          code: 'theme_relevance',
          title: t('rubric.theme_relevance_title'),
          desc: t('rubric.theme_relevance_desc'),
          max: 25,
        },
        {
          code: 'creativity',
          title: t('rubric.creativity_title'),
          desc: t('rubric.creativity_desc'),
          max: 25,
        },
        {
          code: 'content_suitability',
          title: t('rubric.content_suitability_title'),
          desc: t('rubric.content_suitability_desc'),
          max: 25,
        },
      ]
    },
    {
      id: 'code',
      code: 'code',
      title: t('criteriaCode'),
      weight: 30,
      icon: <Code2 size={20} className="text-cyan" />,
      colorClass: 'criterion-cyan',
      accentColor: '#06b6d4',
      subCriteria: [
        {
          code: 'readability',
          title: t('rubric.readability_title'),
          desc: t('rubric.readability_desc'),
          max: 25,
        },
        {
          code: 'functionality',
          title: t('rubric.functionality_title'),
          desc: t('rubric.functionality_desc'),
          max: 25,
        },
        {
          code: 'efficiency',
          title: t('rubric.efficiency_title'),
          desc: t('rubric.efficiency_desc'),
          max: 25,
        },
        {
          code: 'ai_interactivity',
          title: t('rubric.ai_interactivity_title'),
          desc: t('rubric.ai_interactivity_desc'),
          max: 25,
        },
      ]
    },
    {
      id: 'presentation',
      code: 'presentation',
      title: t('criteriaPresentation'),
      weight: 30,
      icon: <Presentation size={20} className="text-purple" />,
      colorClass: 'criterion-purple',
      accentColor: '#a855f7',
      subCriteria: [
        {
          code: 'project_presentation',
          title: t('rubric.project_presentation_title'),
          desc: t('rubric.project_presentation_desc'),
          max: 25,
        },
        {
          code: 'communication',
          title: t('rubric.communication_title'),
          desc: t('rubric.communication_desc'),
          max: 25,
        },
        {
          code: 'body_language',
          title: t('rubric.body_language_title'),
          desc: t('rubric.body_language_desc'),
          max: 25,
        },
        {
          code: 'supporting_tools',
          title: t('rubric.supporting_tools_title'),
          desc: t('rubric.supporting_tools_desc'),
          max: 25,
        },
      ]
    }
  ];

  const filteredCriteria = activeTab === 'all' 
    ? criteriaData 
    : criteriaData.filter(c => c.id === activeTab);

  return (
    <div className="rubric-guide-card-container">
      <div 
        className="rubric-guide-toggle-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded); }}
      >
        <div className="rubric-header-main">
          <div className="rubric-icon-orb">
            <Scale size={20} className="text-accent" />
          </div>
          <div className="rubric-header-text">
            <div className="rubric-header-title-row">
              <h3 className="rubric-guide-title">{t('rubricGuideHeading')}</h3>
              <span className="badge-rubric-weight">3 {t('criteria')} (Total 100%)</span>
            </div>
            <p className="rubric-guide-subtitle">{t('rubricGuideSubtitle')}</p>
          </div>
        </div>

        <button 
          type="button" 
          className="btn-toggle-rubric"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          aria-expanded={isExpanded}
        >
          <span>{isExpanded ? t('toggleRubricHide') : t('toggleRubricShow')}</span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && (
        <div className="rubric-guide-expanded-body">
          {/* Quick Filter Tabs */}
          <div className="rubric-filter-tabs">
            <button
              type="button"
              className={`rubric-tab-chip ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Layers size={14} />
              <span>{t('all')} ({criteriaData.length})</span>
            </button>
            {criteriaData.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`rubric-tab-chip ${activeTab === c.id ? 'active' : ''}`}
                onClick={() => setActiveTab(c.id)}
              >
                {c.icon}
                <span>{c.title} ({c.weight}%)</span>
              </button>
            ))}
          </div>

          {/* Criteria Cards Grid */}
          <div className="rubric-criteria-display-grid">
            {filteredCriteria.map((c) => (
              <div key={c.id} className={`rubric-crit-card ${c.colorClass}`}>
                <div className="rubric-crit-header">
                  <div className="crit-title-flex">
                    <div className="crit-badge-icon">{c.icon}</div>
                    <div>
                      <h4 className="crit-name-text">{c.title}</h4>
                      <span className="crit-sub-counter">4 Sub-kriteria • Maks. 100 Poin</span>
                    </div>
                  </div>
                  <div className="crit-weight-tag" style={{ borderColor: c.accentColor }}>
                    <span className="weight-num">{c.weight}%</span>
                    <span className="weight-label">{t('weightLabel')}</span>
                  </div>
                </div>

                <div className="rubric-subcrit-list">
                  {c.subCriteria.map((sub, sIdx) => (
                    <div key={sub.code} className="rubric-subcrit-item">
                      <div className="subcrit-top-row">
                        <span className="subcrit-num-badge">{sIdx + 1}</span>
                        <span className="subcrit-name">{sub.title}</span>
                        <span className="subcrit-max-pts">0 - {sub.max} {t('points')}</span>
                      </div>
                      <p className="subcrit-desc-text">{sub.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Scoring Scale & Calculation Box */}
          <div className="rubric-scales-calc-row">
            {/* Score Scale Guide */}
            <div className="rubric-scale-box">
              <div className="box-title-bar">
                <Award size={17} className="text-accent" />
                <h4>{t('scoringScaleTitle')}</h4>
              </div>
              <div className="scale-levels-list">
                <div className="scale-item level-excellent">
                  <div className="scale-range-pill">21 - 25</div>
                  <div className="scale-desc-content">
                    <strong>{lang === 'id' ? 'Sangat Baik (Excellent)' : 'Excellent'}</strong>
                    <span>{lang === 'id' ? 'Memenuhi kriteria secara sempurna, detail, sangat inovatif, dan orisinal.' : 'Perfectly meets all criteria, highly innovative, detailed and original.'}</span>
                  </div>
                </div>
                <div className="scale-item level-good">
                  <div className="scale-range-pill">16 - 20</div>
                  <div className="scale-desc-content">
                    <strong>{lang === 'id' ? 'Baik (Good)' : 'Good'}</strong>
                    <span>{lang === 'id' ? 'Memenuhi kriteria dengan baik, terstruktur, relevan, ada sedikit ruang perbaikan.' : 'Meets criteria well, structured, relevant, with minor room for improvement.'}</span>
                  </div>
                </div>
                <div className="scale-item level-fair">
                  <div className="scale-range-pill">11 - 15</div>
                  <div className="scale-desc-content">
                    <strong>{lang === 'id' ? 'Cukup (Fair)' : 'Fair'}</strong>
                    <span>{lang === 'id' ? 'Memenuhi kriteria dasar namun belum optimal atau ada beberapa kekurangan.' : 'Meets baseline criteria but lacks optimization or completeness.'}</span>
                  </div>
                </div>
                <div className="scale-item level-poor">
                  <div className="scale-range-pill">0 - 10</div>
                  <div className="scale-desc-content">
                    <strong>{lang === 'id' ? 'Kurang (Needs Work)' : 'Needs Improvement'}</strong>
                    <span>{lang === 'id' ? 'Belum memenuhi kriteria, tidak lengkap, tidak berjalan, atau tidak ada.' : 'Does not meet criteria, broken, incomplete, or missing.'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Formula Calculation Guide */}
            <div className="rubric-formula-box">
              <div className="box-title-bar">
                <Calculator size={17} className="text-accent" />
                <h4>{t('scoringFormulaTitle')}</h4>
              </div>
              <div className="formula-explanation-card">
                <div className="formula-math-line">
                  <code>Skor Akhir = (Ide × 0.40) + (Kode × 0.30) + (Presentasi × 0.30)</code>
                </div>
                <ul className="formula-points-list">
                  <li>
                    <span className="dot-bullet bg-amber" />
                    <span><strong>Ide & Kreativitas:</strong> 4 sub-kriteria (maks. 100) dikalikan bobot <strong>40%</strong></span>
                  </li>
                  <li>
                    <span className="dot-bullet bg-cyan" />
                    <span><strong>Kode & Desain:</strong> 4 sub-kriteria (maks. 100) dikalikan bobot <strong>30%</strong></span>
                  </li>
                  <li>
                    <span className="dot-bullet bg-purple" />
                    <span><strong>Presentasi:</strong> 4 sub-kriteria (maks. 100) dikalikan bobot <strong>30%</strong></span>
                  </li>
                </ul>
                <div className="formula-hint-note">
                  <Info size={15} />
                  <span>{lang === 'id' ? 'Sistem akan menghitung skor berbobot secara otomatis begitu Anda mengisi nilai sub-kriteria.' : 'The system automatically calculates the weighted final score in real-time.'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
