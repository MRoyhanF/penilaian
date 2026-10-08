'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  LayoutGrid, 
  Users, 
  Award, 
  BarChart3, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

export default function Sidebar({ 
  currentPage, 
  onNavigate, 
  sidebarOpen, 
  setSidebarOpen,
  sidebarMinimized,
  setSidebarMinimized,
  judgeCategories = [],
  selectedCategoryId,
  onSelectCategory
}) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleNav = (page) => {
    onNavigate(page);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleCatSelect = (catId) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const toggleMinimize = () => {
    if (setSidebarMinimized) {
      setSidebarMinimized(!sidebarMinimized);
    }
  };

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarMinimized ? 'minimized' : ''}`}>
        <div className="sidebar-inner">
          {/* Header with Minimize Toggle for Desktop/Tablet */}
          <div className="sidebar-header-bar">
            {!sidebarMinimized && (
              <span className="sidebar-section-title">
                {user?.role === 'admin' ? t('admin') : t('judge')} Menu
              </span>
            )}
            <button
              type="button"
              className="sidebar-minimize-toggle-btn"
              onClick={toggleMinimize}
              title={sidebarMinimized ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
              aria-label="Toggle Sidebar Size"
            >
              {sidebarMinimized ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <div className="sidebar-section">
            {user?.role === 'admin' ? (
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'admin-dashboard' ? 'active' : ''}`}
                  onClick={() => handleNav('admin-dashboard')}
                  title={sidebarMinimized ? t('navDashboard') : undefined}
                >
                  <BarChart3 size={19} className="nav-icon" />
                  {!sidebarMinimized && <span>{t('navDashboard')}</span>}
                </button>
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'admin-results' ? 'active' : ''}`}
                  onClick={() => handleNav('admin-results')}
                  title={sidebarMinimized ? t('navResults') : undefined}
                >
                  <Award size={19} className="nav-icon" />
                  {!sidebarMinimized && <span>{t('navResults')}</span>}
                </button>
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'admin-judges' ? 'active' : ''}`}
                  onClick={() => handleNav('admin-judges')}
                  title={sidebarMinimized ? t('navJudges') : undefined}
                >
                  <ShieldCheck size={19} className="nav-icon" />
                  {!sidebarMinimized && <span>{t('navJudges')}</span>}
                </button>
              </nav>
            ) : (
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'judge-categories' ? 'active' : ''}`}
                  onClick={() => handleNav('judge-categories')}
                  title={sidebarMinimized ? t('navCategories') : undefined}
                >
                  <LayoutGrid size={19} className="nav-icon" />
                  {!sidebarMinimized && <span>{t('navCategories')}</span>}
                </button>

                {judgeCategories.length > 0 && (
                  <div className="sidebar-sub-nav">
                    {!sidebarMinimized && (
                      <span className="sidebar-sub-title">{t('assignedCategories')}</span>
                    )}
                    {judgeCategories.map((cat) => {
                      const isCompleted = cat.scored_count >= cat.total_participants && cat.total_participants > 0;
                      const isSelected = selectedCategoryId === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`nav-sub-link ${isSelected ? 'active' : ''}`}
                          onClick={() => handleCatSelect(cat.id)}
                          title={sidebarMinimized ? `${cat.name} (${cat.scored_count || 0}/${cat.total_participants || 0})` : undefined}
                        >
                          <FolderOpen size={16} className="sub-nav-icon" />
                          {!sidebarMinimized ? (
                            <>
                              <div className="sub-link-info">
                                <span className="cat-name">{cat.name}</span>
                                <span className="cat-count">
                                  {cat.scored_count || 0}/{cat.total_participants || 0}
                                </span>
                              </div>
                              {isCompleted ? (
                                <CheckCircle2 size={15} className="text-success" />
                              ) : (
                                <span className="cat-progress-dot" />
                              )}
                            </>
                          ) : (
                            <span className={`cat-mini-indicator ${isCompleted ? 'completed' : 'pending'}`}>
                              {cat.scored_count || 0}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </nav>
            )}
          </div>

          {/* Quick Info / Tips Footer (only when not minimized) */}
          {!sidebarMinimized && (
            <div className="sidebar-footer-card">
              <div className="footer-card-header">
                <Sparkles size={16} className="text-accent" />
                <span className="footer-card-title">{t('rubricGuide')}</span>
              </div>
              <p className="footer-card-body">
                {t('touchFriendlyTip')}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
