import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { api } from './services/api';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

import LoginPage from './pages/LoginPage';
import JudgeCategoriesPage from './pages/JudgeCategoriesPage';
import JudgeParticipantsPage from './pages/JudgeParticipantsPage';
import JudgeScoringPage from './pages/JudgeScoringPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminResultsPage from './pages/AdminResultsPage';
import AdminJudgesPage from './pages/AdminJudgesPage';

export default function App() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  const [currentPage, setCurrentPage] = useState('login');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [judgeCategories, setJudgeCategories] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((tItem) => tItem.id !== id));
  };

  // Sync user state with default landing page
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'admin') {
          if (currentPage === 'login' || !currentPage.startsWith('admin')) {
            setCurrentPage('admin-dashboard');
          }
        } else {
          if (currentPage === 'login' || !currentPage.startsWith('judge')) {
            setCurrentPage('judge-categories');
          }
          fetchJudgeCategories();
        }
      } else {
        setCurrentPage('login');
      }
    }
  }, [user, loading]);

  const fetchJudgeCategories = async () => {
    try {
      const cats = await api.getJudgeCategories();
      setJudgeCategories(cats);
    } catch {
      // Ignored
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    showToast(t('loginSuccess'), 'success');
    if (loggedInUser.role === 'admin') {
      setCurrentPage('admin-dashboard');
    } else {
      setCurrentPage('judge-categories');
      fetchJudgeCategories();
    }
  };

  // Navigation handlers
  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    setCurrentPage('judge-participants');
  };

  const handleSelectParticipant = (pId) => {
    setSelectedParticipantId(pId);
    setCurrentPage('judge-scoring');
  };

  const handleBackToCategories = () => {
    fetchJudgeCategories();
    setCurrentPage('judge-categories');
    setSelectedCategoryId(null);
  };

  const handleBackToParticipants = () => {
    fetchJudgeCategories();
    setCurrentPage('judge-participants');
    setSelectedParticipantId(null);
  };

  const handleAdminSelectCategoryResults = (catCode) => {
    setSelectedCategoryCode(catCode);
    setCurrentPage('admin-results');
  };

  if (loading) {
    return (
      <div className="page-loading-state" style={{ minHeight: '100vh' }}>
        <div className="spinner-icon text-accent" style={{ fontSize: '2rem' }}>⏳</div>
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (!user || currentPage === 'login') {
    return (
      <>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // Generate breadcrumbs
  const breadcrumbs = [];
  if (user.role === 'judge') {
    breadcrumbs.push({
      label: t('navCategories'),
      action: currentPage !== 'judge-categories' ? handleBackToCategories : null,
    });
    if (currentPage === 'judge-participants' || currentPage === 'judge-scoring') {
      const activeCat = judgeCategories.find((c) => c.id === selectedCategoryId);
      breadcrumbs.push({
        label: activeCat ? activeCat.name : t('navParticipants'),
        action: currentPage === 'judge-scoring' ? handleBackToParticipants : null,
      });
    }
    if (currentPage === 'judge-scoring') {
      breadcrumbs.push({
        label: t('navScoring'),
      });
    }
  } else if (user.role === 'admin') {
    if (currentPage === 'admin-dashboard') {
      breadcrumbs.push({ label: t('navDashboard') });
    } else if (currentPage === 'admin-results') {
      breadcrumbs.push({
        label: t('navDashboard'),
        action: () => setCurrentPage('admin-dashboard'),
      });
      breadcrumbs.push({ label: t('navResults') });
    } else if (currentPage === 'admin-judges') {
      breadcrumbs.push({
        label: t('navDashboard'),
        action: () => setCurrentPage('admin-dashboard'),
      });
      breadcrumbs.push({ label: t('navJudges') });
    }
  }

  return (
    <div className="app-container">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        breadcrumbs={breadcrumbs}
      />

      <div className="app-body">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          judgeCategories={judgeCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
        />

        <main className="app-main-content">
          {currentPage === 'judge-categories' && (
            <JudgeCategoriesPage onSelectCategory={handleSelectCategory} />
          )}

          {currentPage === 'judge-participants' && (
            <JudgeParticipantsPage
              categoryId={selectedCategoryId}
              onBack={handleBackToCategories}
              onSelectParticipant={handleSelectParticipant}
            />
          )}

          {currentPage === 'judge-scoring' && (
            <JudgeScoringPage
              participantId={selectedParticipantId}
              onBack={handleBackToParticipants}
              onNavigateParticipant={handleSelectParticipant}
              showToast={showToast}
            />
          )}

          {currentPage === 'admin-dashboard' && (
            <AdminDashboardPage
              onNavigate={setCurrentPage}
              onSelectCategoryResults={handleAdminSelectCategoryResults}
              showToast={showToast}
            />
          )}

          {currentPage === 'admin-results' && (
            <AdminResultsPage 
              initialCategoryCode={selectedCategoryCode} 
              showToast={showToast}
            />
          )}

          {currentPage === 'admin-judges' && (
            <AdminJudgesPage />
          )}
        </main>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
