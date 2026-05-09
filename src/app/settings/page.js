'use client';

import { useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  DEFAULT_ID_CARD_SETTINGS,
  getQrSlotPercentStyle,
  getScaledQrPlacement,
  ID_CARD_SETTINGS_KEY,
  ID_CARD_TEMPLATE_PRESETS_KEY,
  normalizeIdCardSettings,
} from '@/lib/idCardTemplateSettings';

export default function SettingsPage() {
  const [form, setForm] = useState(() => {
    try {
      if (typeof window === 'undefined') return DEFAULT_ID_CARD_SETTINGS;
      const raw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY);
      if (!raw) return DEFAULT_ID_CARD_SETTINGS;
      const parsed = JSON.parse(raw);
      return normalizeIdCardSettings(parsed);
    } catch {
      return DEFAULT_ID_CARD_SETTINGS;
    }
  });
  const [saved, setSaved] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 674, height: 1024 });
  const [imageLoaded, setImageLoaded] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage('');
    }, 2200);
  };

  const getTemplatePreset = (templateFile) => {
    try {
      const raw = window.localStorage.getItem(ID_CARD_TEMPLATE_PRESETS_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw);
      const preset = map?.[templateFile];
      return preset ? normalizeIdCardSettings(preset) : null;
    } catch {
      return null;
    }
  };

  const update = (key, value) => {
    setSaved(false);
    if (key === 'templateFile') {
      const normalizedTemplateFile = String(value || '').trim();
      if (!normalizedTemplateFile) {
        setForm((prev) => ({ ...prev, templateFile: '' }));
        setImageLoaded(false);
        return;
      }

      const preset = getTemplatePreset(normalizedTemplateFile);
      if (preset) {
        setForm(preset);
        setImageLoaded(false);
        showToast(`Loaded saved preset for ${normalizedTemplateFile}`);
      } else {
        setForm((prev) => ({ ...prev, templateFile: normalizedTemplateFile }));
        setImageLoaded(false);
      }
      return;
    }

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTemplateUpload = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    try {
      setIsUploadingTemplate(true);
      setSaved(false);
      showToast('Uploading template...');

      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/template/upload', {
        method: 'POST',
        body,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const msg = data?.message || 'Upload failed';
        showToast(msg);
        return;
      }

      update('templateFile', data.templateFile);
      showToast('Template uploaded. Preview updated.');
    } catch (e) {
      showToast(e?.message || 'Upload failed');
    } finally {
      setIsUploadingTemplate(false);
      // Let user re-upload the same filename again
      event.target.value = '';
    }
  };

  const saveSettings = () => {
    const normalized = normalizeIdCardSettings({
      ...form,
      templateWidth: imageSize.width,
      templateHeight: imageSize.height,
    });
    const previousRaw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY);
    const previous = previousRaw ? normalizeIdCardSettings(JSON.parse(previousRaw)) : DEFAULT_ID_CARD_SETTINGS;
    const hasChanges = JSON.stringify(previous) !== JSON.stringify(normalized);

    window.localStorage.setItem(ID_CARD_SETTINGS_KEY, JSON.stringify(normalized));
    try {
      const raw = window.localStorage.getItem(ID_CARD_TEMPLATE_PRESETS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[normalized.templateFile] = normalized;
      window.localStorage.setItem(ID_CARD_TEMPLATE_PRESETS_KEY, JSON.stringify(map));
    } catch {
      // ignore localStorage map write failures
    }
    setForm(normalized);
    setSaved(true);
    if (!imageLoaded) {
      showToast(hasChanges ? 'Saved with last known template size.' : 'No changes to save.');
    } else {
      showToast(hasChanges ? 'Settings saved successfully.' : 'No changes to save.');
    }
  };

  const resetDefaults = () => {
    window.localStorage.setItem(ID_CARD_SETTINGS_KEY, JSON.stringify(DEFAULT_ID_CARD_SETTINGS));
    setForm(DEFAULT_ID_CARD_SETTINGS);
    setSaved(true);
    showToast('Default settings restored.');
  };

  const preview = normalizeIdCardSettings(form);
  const placement = getScaledQrPlacement(preview, imageSize.width, imageSize.height);
  const qrSlotStyle = getQrSlotPercentStyle(placement, imageSize.width, imageSize.height);

  return (
    <main className="nx-register-page">
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        <div className="nx-register-head">
          <Link href="/register" className="nx-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Register
          </Link>
          <p className="nx-kicker">Template Control Panel</p>
          <h1 className="nx-title" style={{ fontSize: '3rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
            QR <span>Calibration</span>
          </h1>
          <p className="nx-subtitle" style={{ maxWidth: '600px', margin: '0' }}>
            Precision-tune the QR code placement for your event templates. Changes are reflected in real-time.
          </p>
        </div>

        <div className="nx-settings-layout">
          {/* Left Column: Form Settings */}
          <div className="nx-settings-form-section">
            <div className="nx-settings-group">
              <h3 className="nx-settings-group-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Template Assets
              </h3>
              <div className="nx-input-wrapper">
                <label>Template Filename</label>
                <input
                  value={form.templateFile}
                  onChange={(event) => update('templateFile', event.target.value)}
                  placeholder="e.g. event-template.png"
                />
                <p className="nx-form-note" style={{ textAlign: 'left', marginTop: '0.5rem', textTransform: 'none' }}>
                  You can type a filename in <code>/public</code>, or upload a new template below.
                </p>
              </div>

              <div className="nx-input-wrapper" style={{ marginTop: '1rem' }}>
                <label>Upload Template Image</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleTemplateUpload}
                  disabled={isUploadingTemplate}
                />
                <p className="nx-form-note" style={{ textAlign: 'left', marginTop: '0.5rem', textTransform: 'none' }}>
                  Uploaded files are saved to <code>/public/id-templates</code> and selected automatically.
                </p>
              </div>

              <div className="nx-form-grid" style={{ marginTop: '1.5rem' }}>
                <div className="nx-input-wrapper nx-half">
                  <label>Width (Auto)</label>
                  <input value={`${imageSize.width}px`} readOnly />
                </div>
                <div className="nx-input-wrapper nx-half">
                  <label>Height (Auto)</label>
                  <input value={`${imageSize.height}px`} readOnly />
                </div>
              </div>
            </div>

            <div className="nx-settings-group">
              <h3 className="nx-settings-group-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                QR Positioning
              </h3>
              <div className="nx-form-grid">
                <div className="nx-input-wrapper nx-half">
                  <label>X-Coordinate (px)</label>
                  <input
                    type="number"
                    value={form.qrX}
                    onChange={(event) => update('qrX', event.target.value)}
                  />
                </div>
                <div className="nx-input-wrapper nx-half">
                  <label>Y-Coordinate (px)</label>
                  <input
                    type="number"
                    value={form.qrY}
                    onChange={(event) => update('qrY', event.target.value)}
                  />
                </div>
                <div className="nx-input-wrapper nx-full">
                  <label>QR Size / Width (px)</label>
                  <input
                    type="number"
                    value={form.qrWidth}
                    onChange={(event) => update('qrWidth', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="nx-settings-actions">
              <button className="nx-btn" onClick={saveSettings} style={{ width: '100%', height: '54px' }}>
                Save Configuration
              </button>
              <button className="nx-btn" onClick={resetDefaults} style={{ width: '100%', height: '54px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}>
                Reset to Default
              </button>
            </div>

            {saved && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                background: 'rgba(34, 197, 94, 0.1)', 
                border: '1px solid rgba(34, 197, 94, 0.2)', 
                borderRadius: '8px',
                color: '#4ade80',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>✓</span> Settings successfully persisted.
              </div>
            )}
          </div>

          {/* Right Column: Live Preview */}
          <div className="nx-settings-preview" style={{ marginTop: '0' }}>
            <h3 className="nx-settings-group-title" style={{ marginBottom: '1.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Real-time Preview
            </h3>
            <div className="nx-preview-container">
              <div className="id-card id-card-template" style={{ margin: '0' }}>
                <img
                  src={`/${preview.templateFile}`}
                  alt="Template preview"
                  className="id-template-image"
                  onError={() => setImageLoaded(false)}
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
                      setImageLoaded(true);
                    }
                  }}
                />
                <div className="id-template-qr-slot" style={qrSlotStyle}>
                  <div className="id-template-qr-inner">
                    <QRCodeSVG value="PREVIEW-QR-1234" size={placement.qrWidth} includeMargin={false} />
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Preview Scale</span>
                <span style={{ fontSize: '0.75rem', color: '#fff' }}>Fit to Width</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--primary)' }}></div>
              </div>
              <p className="nx-form-note" style={{ marginTop: '1rem', textAlign: 'left', textTransform: 'none' }}>
                The preview above represents how the final ID card will look. Use the coordinates on the left to align the QR code precisely over the intended slot.
              </p>
            </div>
          </div>
        </div>
      </div>
      {toastMessage && <div className="nx-settings-toast">{toastMessage}</div>}
    </main>
  );
}
