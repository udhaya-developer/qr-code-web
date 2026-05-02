'use client';

import { useEffect, useState } from 'react';
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
  const [form, setForm] = useState(DEFAULT_ID_CARD_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 674, height: 1024 });
  const [imageLoaded, setImageLoaded] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage('');
    }, 2200);
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setForm(normalizeIdCardSettings(parsed));
    } catch {
      // Keep defaults.
    }
  }, []);

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
    <main>
      <div className="container">
        <section className="nx-section nx-register-page">
          <div className="nx-register-head">
            <Link href="/register" className="nx-back-link">Back to Register</Link>
            <p className="nx-kicker">ID TEMPLATE CONTROL</p>
            <h1 className="nx-title" style={{ fontSize: '2.8rem', marginTop: '0.8rem' }}>
              QR PLACEMENT <span>SETTINGS</span>
            </h1>
            <p className="nx-subtitle">Set X, Y and Width to place the QR correctly per event template.</p>
            <p className="nx-form-note" style={{ marginTop: '0.75rem' }}>
              Current template size: {imageSize.width} x {imageSize.height}px
            </p>
          </div>

          <div className="glass-card nx-settings-card">
            <div className="nx-settings-grid">
              <div className="form-group">
                <label>Template file (inside public folder)</label>
                <input
                  value={form.templateFile}
                  onChange={(event) => update('templateFile', event.target.value)}
                  placeholder="milezero-id-template.png"
                />
              </div>
              <div className="form-group">
                <label>Template Width (auto)</label>
                <input value={imageSize.width} readOnly />
              </div>
              <div className="form-group">
                <label>Template Height (auto)</label>
                <input value={imageSize.height} readOnly />
              </div>
              <div className="form-group">
                <label>QR X (px)</label>
                <input
                  type="number"
                  value={form.qrX}
                  onChange={(event) => update('qrX', event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>QR Y (px)</label>
                <input
                  type="number"
                  value={form.qrY}
                  onChange={(event) => update('qrY', event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>QR Width (px)</label>
                <input
                  type="number"
                  value={form.qrWidth}
                  onChange={(event) => update('qrWidth', event.target.value)}
                />
              </div>
            </div>

            <div className="print-actions" style={{ marginTop: '0.5rem' }}>
              <button className="print-btn" onClick={saveSettings}>Save Settings</button>
              <button className="print-btn" onClick={resetDefaults}>Reset Defaults</button>
              <Link href="/register" className="print-btn">Go to Register</Link>
            </div>

            {saved && <p className="nx-form-note" style={{ marginTop: '1rem' }}>Settings saved.</p>}
            {toastMessage && <div className="nx-settings-toast">{toastMessage}</div>}

            <div className="nx-settings-preview">
              <p className="nx-form-note">Live Preview</p>
              <div className="id-card id-card-template">
                <img
                  src={`/${preview.templateFile}`}
                  alt="Template preview"
                  className="id-template-image"
                  onError={() => {
                    setImageLoaded(false);
                  }}
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
                      setImageLoaded(true);
                    }
                  }}
                />
                <div
                  className="id-template-qr-slot"
                  style={qrSlotStyle}
                >
                  <div className="id-template-qr-inner">
                    <QRCodeSVG value="PREVIEW-QR-1234" size={placement.qrWidth} includeMargin={false} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
