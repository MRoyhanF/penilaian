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
  Info
} from 'lucide-react';

export default function Sidebar({ 
  currentPage, 
  onNavigate, 
  sidebarOpen, 
  setSidebarOpen,
  judgeCategories = [],
  selectedCategoryId,
  onSelectCategory
}) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleNav = (page) => {
    onNavigate(page);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleCatSelect = (catId) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
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

      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-section">
            <span className="sidebar-section-title">
              {user?.role === 'admin' ? t('admin') : t('judge')} Menu
            </span>

            {user?.role === 'admin' ? (
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'admin-dashboard' ? 'active' : ''}`}
                  onClick={() => handleNav('admin-dashboard')}
                >
                  <BarChart3 size={18} />
                  <span>{t('navDashboard')}</span>
                </button>
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'admin-results' ? 'active' : ''}`}
                  onClick={() => handleNav('admin-results')}
                >
                  <Award size={18} />
                  <span>{t('navResults')}</span>
                </button>
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'admin-judges' ? 'active' : ''}`}
                  onClick={() => handleNav('admin-judges')}
                >
                  <ShieldCheck size={18} />
                  <span>{t('navJudges')}</span>
                </button>
              </nav>
            ) : (
              <nav className="sidebar-nav">
                <button
                  type="button"
                  className={`nav-link ${currentPage === 'judge-categories' ? 'active' : ''}`}
                  onClick={() => handleNav('judge-categories')}
                >
                  <LayoutGrid size={18} />
                  <span>{t('navCategories')}</span>
                </button>

                {judgeCategories.length > 0 && (
                  <div className="sidebar-sub-nav">
                    <span className="sidebar-sub-title">{t('assignedCategories')}</span>
                    {judgeCategories.map((cat) => {
                      const isCompleted = cat.scored_count >= cat.total_participants && cat.total_participants > 0;
                      const isSelected = selectedCategoryId === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`nav-sub-link ${isSelected ? 'active' : ''}`}
                          onClick={() => handleCatSelect(cat.id)}
                        >
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
                        </button>
                      );
                    })}
                  </div>
                )}
              </nav>
            )}
          </div>

          {/* Quick Info / Tips Footer */}
          <div className="sidebar-footer-card">
            <div className="footer-card-header">
              <Sparkles size={16} className="text-accent" />
              <span className="footer-card-title">{t('rubricGuide')}</span>
            </div>
            <p className="footer-card-body">
              {t('touchFriendlyTip')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
