import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../services/api';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Loader2, 
  Layers, 
  ShieldAlert 
} from 'lucide-react';

export default function ResetScoresModal({
  isOpen,
  onClose,
  categories = [],
  onResetSuccess,
  showToast
}) {
  const { t } = useLanguage();

  const [scope, setScope] = useState('all'); // 'all' | 'category'
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories.length > 0 ? categories[0].id : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirmReset = async () => {
    const isCategory = scope === 'category';
    const selectedCat = categories.find(c => String(c.id) === String(selectedCategoryId));

    const confirmPrompt = isCategory
      ? t('resetConfirmCategory', { category: selectedCat ? selectedCat.name : '' })
      : t('resetConfirmAll');

    if (!window.confirm(confirmPrompt)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        scope,
        category_id: isCategory ? Number(selectedCategoryId) : null,
      };

      const res = await api.resetScores(payload);
      showToast?.(res.message || t('resetSuccessMsg'), 'success');
      if (onResetSuccess) onResetSuccess();
      onClose();
    } catch (err) {
      setError(err.message || t('resetErrorMsg'));
      showToast?.(err.message || t('resetErrorMsg'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-card reset-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-icon-danger">
            <ShieldAlert size={24} />
          </div>
          <div className="modal-header-text">
            <h3 className="modal-title">{t('resetScoresModalTitle')}</h3>
            <span className="modal-badge-admin">{t('admin')} Only</span>
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

        <div className="modal-body">
          <p className="modal-desc">{t('resetScoresModalDesc')}</p>

          {error && (
            <div className="modal-error-banner">
              <span>{error}</span>
            </div>
          )}

          {/* Scope selection */}
          <div className="reset-options-group">
            <label className={`reset-option-card ${scope === 'all' ? 'active' : ''}`}>
              <input
                type="radio"
                name="reset-scope"
                value="all"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
              />
              <div className="option-card-content">
                <span className="option-title font-danger">{t('resetScopeAll')}</span>
                <span className="option-desc">Menghapus seluruh nilai yang telah dimasukkan oleh semua juri di semua kategori lomba.</span>
              </div>
            </label>

            <label className={`reset-option-card ${scope === 'category' ? 'active' : ''}`}>
              <input
                type="radio"
                name="reset-scope"
                value="category"
                checked={scope === 'category'}
                onChange={() => setScope('category')}
              />
              <div className="option-card-content">
                <span className="option-title">{t('resetScopeCategory')}</span>
                <span className="option-desc">Hanya menghapus nilai untuk satu kategori perlombaan terpilih.</span>
              </div>
            </label>
          </div>

          {/* Category Dropdown if scope === 'category' */}
          {scope === 'category' && (
            <div className="form-group reset-cat-select-box">
              <label className="form-label">{t('resetScopeSelectCat')}</label>
              <div className="select-wrapper">
                <Layers size={16} className="select-icon" />
                <select
                  className="form-select"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          <div className="warning-callout-box">
            <AlertTriangle size={18} className="warning-icon" />
            <p className="warning-text">{t('resetWarningText')}</p>
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
            type="button"
            className="btn-modal-danger"
            onClick={handleConfirmReset}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spinner-icon" />
                <span>{t('processingReset')}</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>{t('btnConfirmReset')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
