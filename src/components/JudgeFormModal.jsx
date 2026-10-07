import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { 
  User, 
  Lock, 
  Layers, 
  X, 
  Save, 
  Loader2, 
  ShieldCheck, 
  Check, 
  Eye, 
  EyeOff 
} from 'lucide-react';

export default function JudgeFormModal({
  isOpen,
  onClose,
  judge = null, // null for create, object for edit
  categories = [],
  onSaved,
  showToast
}) {
  const { t } = useLanguage();

  const isEdit = !!judge;
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (judge) {
      setName(judge.name || '');
      setUsername(judge.username || '');
      setPassword('');
      setSelectedCatIds(judge.category_ids || []);
    } else {
      setName('');
      setUsername('');
      setPassword('');
      setSelectedCatIds([]);
    }
    setError('');
    setShowPassword(false);
  }, [judge, isOpen]);

  if (!isOpen) return null;

  const handleCategoryToggle = (catId) => {
    setSelectedCatIds((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((id) => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('judgeNameRequired'));
      return;
    }
    if (!username.trim()) {
      setError(t('judgeUsernameRequired'));
      return;
    }
    if (!isEdit && !password.trim()) {
      setError(t('judgePasswordRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        username: username.trim(),
        password: password.trim() || undefined,
        category_ids: selectedCatIds,
      };

      if (isEdit) {
        await api.updateJudge(judge.id, payload);
        showToast?.(t('judgeUpdatedSuccess'), 'success');
      } else {
        await api.createJudge(payload);
        showToast?.(t('judgeCreatedSuccess'), 'success');
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || (isEdit ? t('judgeUpdateError') : t('judgeCreateError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card judge-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-icon-accent">
            <ShieldCheck size={22} />
          </div>
          <div className="modal-header-text">
            <h3 className="modal-title">
              {isEdit ? t('editJudgeTitle') : t('addJudgeTitle')}
            </h3>
            <span className="modal-badge-admin">{t('admin')} Portal</span>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="modal-error-banner" role="alert">
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="judge-form-name">
                {t('judgeFullName')} <span className="text-danger">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="judge-form-name"
                  type="text"
                  className="form-input"
                  placeholder={t('judgeNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="judge-form-username">
                {t('username')} <span className="text-danger">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  id="judge-form-username"
                  type="text"
                  className="form-input"
                  placeholder={t('judgeUsernamePlaceholder')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="judge-form-password">
                {isEdit ? t('judgePasswordEditLabel') : t('password')} {!isEdit && <span className="text-danger">*</span>}
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="judge-form-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={isEdit ? t('judgePasswordEditPlaceholder') : t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isEdit}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isEdit && (
                <span className="form-hint">{t('judgePasswordEditHint')}</span>
              )}
            </div>

            {/* Category Assignment Multi-Select */}
            <div className="form-group">
              <label className="form-label">
                <Layers size={16} className="inline-icon" />
                <span>{t('assignedCategories')}</span>
              </label>
              <div className="category-checkbox-grid">
                {categories.map((cat) => {
                  const isChecked = selectedCatIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`cat-toggle-pill ${isChecked ? 'active' : ''}`}
                      onClick={() => handleCategoryToggle(cat.id)}
                    >
                      <div className={`checkbox-indicator ${isChecked ? 'checked' : ''}`}>
                        {isChecked && <Check size={12} />}
                      </div>
                      <span className="cat-pill-name">{cat.name}</span>
                      <span className="cat-pill-code">({cat.code.toUpperCase()})</span>
                    </button>
                  );
                })}
              </div>
              <span className="form-hint">{t('judgeCategoryHint')}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={loading}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn-modal-save"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{isEdit ? t('saveChanges') : t('createJudgeBtn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
