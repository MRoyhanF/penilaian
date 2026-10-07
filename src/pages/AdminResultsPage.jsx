import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import ResetScoresModal from '../components/ResetScoresModal';
import { 
  Trophy, 
  Download, 
  Printer, 
  Search, 
  School, 
  Code2, 
  Award, 
  RefreshCw, 
  Loader2, 
  Sparkles,
  ChevronRight,
  Trash2
} from 'lucide-react';

export default function AdminResultsPage({ initialCategoryCode, showToast }) {
  const { t } = useLanguage();

  const [allResults, setAllResults] = useState(null);
  const [activeCategory, setActiveCategory] = useState(initialCategoryCode || 'starter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminResults();
      setAllResults(data);
      const catKeys = Object.keys(data);
      if (catKeys.length > 0 && !data[activeCategory]) {
        setActiveCategory(catKeys[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    if (initialCategoryCode && allResults?.[initialCategoryCode]) {
      setActiveCategory(initialCategoryCode);
    }
  }, [initialCategoryCode, allResults]);

  const currentCategoryData = allResults ? allResults[activeCategory] : null;
  const rawResults = currentCategoryData?.results || [];

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return rawResults;
    return rawResults.filter((r) => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.school && r.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.project && r.project.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [rawResults, searchQuery]);

  // CSV Export functionality
  const handleExportCSV = () => {
    if (!currentCategoryData) return;

    const headers = ['Peringkat', 'No Peserta', 'Nama Peserta', 'Sekolah', 'Judul Proyek', 'Skor Rata-rata'];
    
    // Add judge header names
    const judgesList = currentCategoryData.judges || [];
    judgesList.forEach(j => {
      headers.push(`Nilai (${j.name})`);
    });

    const rows = rawResults.map((r) => {
      const judgeMap = {};
      (r.judge_scores || []).forEach(js => {
        judgeMap[js.judge_id] = js.has_scored ? js.total : '-';
      });

      const row = [
        r.rank,
        r.number,
        `"${r.name.replace(/"/g, '""')}"`,
        `"${(r.school || '').replace(/"/g, '""')}"`,
        `"${(r.project || '').replace(/"/g, '""')}"`,
        r.average
      ];

      judgesList.forEach(j => {
        row.push(judgeMap[j.id] !== undefined ? judgeMap[j.id] : '-');
      });

      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_nilai_${activeCategory}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="page-loading-state">
        <Loader2 size={36} className="spinner-icon text-accent" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  const categoriesList = allResults ? Object.values(allResults) : [];

  return (
    <div className="page-content-wrapper results-page">
      <div className="dashboard-header-row hide-on-print">
        <div>
          <h1 className="page-main-title">{t('resultsTitle')}</h1>
          <p className="page-main-desc">{t('resultsSubtitle')}</p>
        </div>

        <div className="results-actions-top">
          <button
            type="button"
            className="btn-danger-outline"
            onClick={() => setIsResetModalOpen(true)}
            title={t('resetScoresBtn')}
          >
            <Trash2 size={16} />
            <span className="btn-text-tablet">{t('resetScoresBtn')}</span>
          </button>
          <button
            type="button"
            className="btn-action-outline"
            onClick={loadResults}
            title={t('refresh')}
          >
            <RefreshCw size={16} />
            <span className="btn-text-tablet">{t('refresh')}</span>
          </button>
          <button
            type="button"
            className="btn-action-outline"
            onClick={handlePrint}
            title={t('printReport')}
          >
            <Printer size={16} />
            <span className="btn-text-tablet">{t('printReport')}</span>
          </button>
          <button
            type="button"
            className="btn-action-primary"
            onClick={handleExportCSV}
            title={t('exportCsv')}
          >
            <Download size={16} />
            <span>{t('exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs-bar hide-on-print">
        {categoriesList.map((cat) => (
          <button
            key={cat.code}
            type="button"
            className={`cat-tab-btn ${activeCategory === cat.code ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.code)}
          >
            <span className="cat-tab-code">{cat.code.toUpperCase()}</span>
            <span className="cat-tab-name">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="results-toolbar hide-on-print">
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
      </div>

      {/* Printable Leaderboard Header */}
      <div className="print-only-header">
        <h2>{t('competitionName')}</h2>
        <h3>{t('resultsTitle')} - {currentCategoryData?.name}</h3>
      </div>

      {/* Podium Cards for Top 3 (if scores exist) */}
      {!searchQuery && rawResults.length >= 3 && rawResults[0].average > 0 && (
        <div className="podium-container hide-on-print">
          {/* 2nd Place */}
          {rawResults[1] && (
            <div className="podium-card rank-2">
              <div className="podium-badge rank-silver">2</div>
              <span className="podium-rank-label">{t('rankChampion2')}</span>
              <h4 className="podium-name">{rawResults[1].name}</h4>
              <span className="podium-school">{rawResults[1].school}</span>
              <div className="podium-score">{rawResults[1].average} <small>/100</small></div>
            </div>
          )}

          {/* 1st Place */}
          {rawResults[0] && (
            <div className="podium-card rank-1">
              <div className="podium-crown">👑</div>
              <div className="podium-badge rank-gold">1</div>
              <span className="podium-rank-label">{t('rankChampion1')}</span>
              <h4 className="podium-name">{rawResults[0].name}</h4>
              <span className="podium-school">{rawResults[0].school}</span>
              <div className="podium-score">{rawResults[0].average} <small>/100</small></div>
            </div>
          )}

          {/* 3rd Place */}
          {rawResults[2] && (
            <div className="podium-card rank-3">
              <div className="podium-badge rank-bronze">3</div>
              <span className="podium-rank-label">{t('rankChampion3')}</span>
              <h4 className="podium-name">{rawResults[2].name}</h4>
              <span className="podium-school">{rawResults[2].school}</span>
              <div className="podium-score">{rawResults[2].average} <small>/100</small></div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="table-card-wrapper">
        {filteredResults.length === 0 ? (
          <div className="empty-state-box">
            <p>{t('noDataForCategory')}</p>
          </div>
        ) : (
          <div className="responsive-table-scroll">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>{t('colRank')}</th>
                  <th>{t('colParticipant')}</th>
                  <th>{t('colSchool')}</th>
                  {(currentCategoryData?.judges || []).map((j) => (
                    <th key={j.id} style={{ textAlign: 'center', minWidth: '110px' }}>
                      {j.name}
                    </th>
                  ))}
                  <th style={{ textAlign: 'right', minWidth: '120px' }}>{t('colFinalAverage')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((row) => {
                  const isTop1 = row.rank === 1 && row.average > 0;
                  const isTop2 = row.rank === 2 && row.average > 0;
                  const isTop3 = row.rank === 3 && row.average > 0;

                  return (
                    <tr 
                      key={row.id} 
                      className={`table-row-item ${isTop1 ? 'row-gold' : isTop2 ? 'row-silver' : isTop3 ? 'row-bronze' : ''}`}
                    >
                      <td style={{ textAlign: 'center' }}>
                        {isTop1 ? (
                          <span className="table-rank-badge gold">🥇 1</span>
                        ) : isTop2 ? (
                          <span className="table-rank-badge silver">🥈 2</span>
                        ) : isTop3 ? (
                          <span className="table-rank-badge bronze">🥉 3</span>
                        ) : (
                          <span className="table-rank-badge neutral">{row.rank}</span>
                        )}
                      </td>
                      <td>
                        <div className="participant-table-info">
                          <span className="participant-table-name">{row.name}</span>
                          {row.project && (
                            <span className="participant-table-project">
                              <Code2 size={13} />
                              {row.project}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="table-school-text">{row.school || '-'}</span>
                      </td>
                      {(currentCategoryData?.judges || []).map((j) => {
                        const judgeScore = (row.judge_scores || []).find(js => js.judge_id === j.id);
                        const hasVal = judgeScore && judgeScore.has_scored;

                        return (
                          <td key={j.id} style={{ textAlign: 'center' }}>
                            {hasVal ? (
                              <span className="judge-score-pill">{judgeScore.total}</span>
                            ) : (
                              <span className="score-pending-dash">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right' }}>
                        <span className={`table-avg-score ${row.average > 0 ? 'highlight-avg' : ''}`}>
                          {row.average > 0 ? row.average : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ResetScoresModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        categories={categoriesList}
        onResetSuccess={loadResults}
        showToast={showToast}
      />
    </div>
  );
}
