'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IDCARD_SETTINGS_STORAGE_EVENT } from '@/hooks/useIdCardSettingsFromStorage';
import { QRCodeSVG } from 'qrcode.react';
import {
  DEFAULT_ID_CARD_SETTINGS,
  getDefaultIdCardProfiles,
  getIdCardTemplateImageSrc,
  getQrSlotPercentStyle,
  getScaledQrPlacement,
  ID_CARD_SETTINGS_KEY,
  ID_CARD_TEMPLATE_PRESETS_KEY,
  normalizeAllProfiles,
  normalizeIdCardSettings,
} from '@/lib/idCardTemplateSettings';

const PROFILE_TABS = [
  { id: 'default', label: 'Website registration', hint: 'Used for the public registration form & QR preview.' },
  { id: 'guest', label: 'Excel — Guest / Normal', hint: 'Used when Excel row guest type is Normal.' },
  { id: 'vip', label: 'Excel — VIP', hint: 'Used when Excel row guest type is VIP.' },
];

const blankImageSize = () => ({
  default: { width: 674, height: 1024 },
  guest: { width: 674, height: 1024 },
  vip: { width: 674, height: 1024 },
});

export default function SettingsPage() {
  const [profiles, setProfiles] = useState(() => getDefaultIdCardProfiles());
  const [activeProfile, setActiveProfile] = useState('default');
  const [saved, setSaved] = useState(false);
  const [imageSizeByProfile, setImageSizeByProfile] = useState(blankImageSize);
  const [imageLoaded, setImageLoaded] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [mongoAssetStatus, setMongoAssetStatus] = useState(null);
  const templatePreviewDiagnosticRef = useRef('');
  const activeProfileRef = useRef(activeProfile);

  useEffect(() => {
    activeProfileRef.current = activeProfile;
  }, [activeProfile]);

  const fetchMongoTemplateStatus = async () => {
    try {
      const res = await fetch('/api/template/assets', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.profiles) {
        setMongoAssetStatus(data);
      } else {
        setMongoAssetStatus(null);
      }
    } catch {
      setMongoAssetStatus(null);
    }
  };

  useEffect(() => {
    void fetchMongoTemplateStatus();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      /* Hydration: server cannot read localStorage; apply saved form after mount only. */
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional deferred read for SSR/client match
      setProfiles(normalizeAllProfiles(parsed));
    } catch {
      // keep defaults
    }
  }, []);

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
    const prof = activeProfileRef.current;

    if (key === 'templateFile') {
      templatePreviewDiagnosticRef.current = '';
      const normalizedTemplateFile = String(value || '')
        .trim()
        .replace(/^\/+/, '')
        .replace(/\\/g, '/');
      if (!normalizedTemplateFile) {
        setProfiles((prevProfiles) => {
          const cur = prevProfiles[prof];
          return { ...prevProfiles, [prof]: { ...cur, templateFile: '' } };
        });
        setImageLoaded(false);
        return;
      }

      const preset = getTemplatePreset(normalizedTemplateFile);
      if (preset) {
        showToast(`Loaded saved preset for ${normalizedTemplateFile}`);
        setProfiles((prevProfiles) => ({ ...prevProfiles, [prof]: preset }));
        setImageLoaded(false);
        return;
      }
      setProfiles((prevProfiles) => {
        const cur = prevProfiles[prof];
        return { ...prevProfiles, [prof]: { ...cur, templateFile: normalizedTemplateFile } };
      });
      setImageLoaded(false);
      return;
    }

    setProfiles((prevProfiles) => {
      const cur = prevProfiles[prof];
      return { ...prevProfiles, [prof]: { ...cur, [key]: value } };
    });
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
      body.append('profile', activeProfileRef.current);

      const res = await fetch('/api/template/upload', {
        method: 'POST',
        body,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const msg = data?.message || 'Upload failed';
        const hint = typeof data?.hint === 'string' && data.hint.trim() ? data.hint.trim() : '';
        const code =
          typeof data?.mongoErrorCode === 'number' ? ` (MongoDB error ${data.mongoErrorCode})` : '';
        const name =
          typeof data?.mongoErrorName === 'string' && data.mongoErrorName.trim()
            ? ` [${data.mongoErrorName}]`
            : '';
        showToast(hint ? `${msg} ${hint}${code}${name}` : `${msg}${code}${name}`);
        return;
      }

      update('templateFile', data.templateFile);
      showToast('Template uploaded. Preview updated.');
      void fetchMongoTemplateStatus();
    } catch (e) {
      showToast(e?.message || 'Upload failed');
    } finally {
      setIsUploadingTemplate(false);
      event.target.value = '';
    }
  };

  const syncProfilesToServer = async (normalizedProfiles) => {
    try {
      await fetch('/api/id-card-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles: normalizedProfiles }),
      });
    } catch {
      // Server sync is optional for local-only dev
    }
  };

  const saveSettings = () => {
    const normalizedProfiles = {
      default: normalizeIdCardSettings({
        ...profiles.default,
        templateWidth: imageSizeByProfile.default.width,
        templateHeight: imageSizeByProfile.default.height,
      }),
      guest: normalizeIdCardSettings({
        ...profiles.guest,
        templateWidth: imageSizeByProfile.guest.width,
        templateHeight: imageSizeByProfile.guest.height,
      }),
      vip: normalizeIdCardSettings({
        ...profiles.vip,
        templateWidth: imageSizeByProfile.vip.width,
        templateHeight: imageSizeByProfile.vip.height,
      }),
    };

    const previousRaw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY);
    const previous = previousRaw ? normalizeAllProfiles(JSON.parse(previousRaw)) : getDefaultIdCardProfiles();
    const hasChanges = JSON.stringify(previous) !== JSON.stringify(normalizedProfiles);

    window.localStorage.setItem(ID_CARD_SETTINGS_KEY, JSON.stringify(normalizedProfiles));
    window.dispatchEvent(new Event(IDCARD_SETTINGS_STORAGE_EVENT));
    try {
      const raw = window.localStorage.getItem(ID_CARD_TEMPLATE_PRESETS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      for (const k of ['default', 'guest', 'vip']) {
        const n = normalizedProfiles[k];
        map[n.templateFile] = n;
      }
      window.localStorage.setItem(ID_CARD_TEMPLATE_PRESETS_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }

    setProfiles(normalizedProfiles);
    setSaved(true);
    void syncProfilesToServer(normalizedProfiles);

    if (!imageLoaded) {
      showToast(hasChanges ? 'Saved with last known template size.' : 'No changes to save.');
    } else {
      showToast(hasChanges ? 'Settings saved successfully.' : 'No changes to save.');
    }
  };

  const resetDefaults = () => {
    const prof = activeProfileRef.current;
    setProfiles((prev) => ({
      ...prev,
      [prof]: normalizeIdCardSettings({ ...DEFAULT_ID_CARD_SETTINGS }),
    }));

    const previousRaw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY);
    const merged = previousRaw ? normalizeAllProfiles(JSON.parse(previousRaw)) : getDefaultIdCardProfiles();
    merged[prof] = normalizeIdCardSettings({ ...DEFAULT_ID_CARD_SETTINGS });
    window.localStorage.setItem(ID_CARD_SETTINGS_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event(IDCARD_SETTINGS_STORAGE_EVENT));
    void syncProfilesToServer(merged);

    setSaved(true);
    showToast('This profile was reset to defaults.');
  };

  const form = profiles[activeProfile];
  const activeProfileLabel = PROFILE_TABS.find((t) => t.id === activeProfile)?.label ?? '';
  const imageSize = imageSizeByProfile[activeProfile];
  const preview = normalizeIdCardSettings(form);
  const placement = getScaledQrPlacement(preview, imageSize.width, imageSize.height);
  const qrSlotStyle = getQrSlotPercentStyle(placement, imageSize.width, imageSize.height);

  const handleTemplatePreviewError = () => {
    setImageLoaded(false);
    const key = preview.templateFile;
    const src = getIdCardTemplateImageSrc(key);
    if (!key || !src) return;

    const diagKey = `${key}|${src}`;
    if (templatePreviewDiagnosticRef.current === diagKey) return;
    templatePreviewDiagnosticRef.current = diagKey;

    (async () => {
      try {
        const resolveRes = await fetch(`/api/template/resolve?q=${encodeURIComponent(key)}`);
        const resolveData = await resolveRes.json().catch(() => null);
        if (
          resolveRes.ok &&
          resolveData?.ok &&
          resolveData.templateFile &&
          resolveData.templateFile !== key
        ) {
          templatePreviewDiagnosticRef.current = '';
          update('templateFile', resolveData.templateFile);
          showToast('Template path corrected automatically.');
          return;
        }

        const imgRes = await fetch(src, { cache: 'no-store' });
        const ct = (imgRes.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json')) {
          const errBody = await imgRes.json().catch(() => ({}));
          showToast(
            errBody?.message ||
              'Template not available on this server. Upload the image again in Settings, then Save.'
          );
          return;
        }
        if (!imgRes.ok) {
          showToast(
            `Template request failed (HTTP ${imgRes.status}). On production, re-upload the file so it is stored in MongoDB.`
          );
        }
      } catch {
        showToast('Could not load the template. Check MONGODB_URI on your host and upload again.');
      }
    })();
  };

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
          <p className="nx-subtitle" style={{ maxWidth: '640px', margin: '0' }}>
            Choose which template you are editing: <strong>registration</strong> (website form), or{' '}
            <strong>Guest</strong> / <strong>VIP</strong> for Excel imports. Saving writes all three to the browser and
            syncs calibration to MongoDB for server-side email distribution.
          </p>
        </div>

        <div className="nx-settings-layout">
          <div className="nx-settings-form-section">
            <div className="nx-settings-group">
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {PROFILE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className="nx-btn"
                    onClick={() => {
                      setActiveProfile(tab.id);
                      setSaved(false);
                    }}
                    style={{
                      flex: '1 1 160px',
                      minHeight: '48px',
                      background:
                        activeProfile === tab.id ? 'rgba(var(--primary-rgb, 139, 92, 246), 0.35)' : 'transparent',
                      border: `1px solid ${activeProfile === tab.id ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
                      boxShadow: 'none',
                      fontSize: '0.8rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="nx-form-note" style={{ textAlign: 'left', marginBottom: '1rem', textTransform: 'none' }}>
                {PROFILE_TABS.find((t) => t.id === activeProfile)?.hint}
              </p>

              {mongoAssetStatus?.profiles ? (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p className="nx-form-note" style={{ marginBottom: '0.6rem', textTransform: 'none' }}>
                    MongoDB (<code>idcardtemplateassets</code>) — one image document per{' '}
                    <code>profile</code>: <code>default</code> (website), <code>guest</code>, <code>vip</code>:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {['default', 'guest', 'vip'].map((pid) => {
                      const st = mongoAssetStatus.profiles[pid];
                      const label = PROFILE_TABS.find((t) => t.id === pid)?.label ?? pid;
                      const ok = st?.stored;
                      return (
                        <span
                          key={pid}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '999px',
                            border: `1px solid ${ok ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.18)'}`,
                            background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                            color: ok ? '#86efac' : '#9ca3af',
                          }}
                        >
                          {ok ? '✓' : '○'} {label}
                          {st?.byteLength ? ` · ${Math.round(st.byteLength / 1024)} KB` : ''}
                        </span>
                      );
                    })}
                  </div>
                  {mongoAssetStatus.allStored ? (
                    <p className="nx-form-note" style={{ marginTop: '0.5rem', marginBottom: 0, color: '#86efac', textTransform: 'none' }}>
                      All three profiles have image bytes stored in MongoDB.
                    </p>
                  ) : (
                    <p className="nx-form-note" style={{ marginTop: '0.5rem', marginBottom: 0, textTransform: 'none' }}>
                      Switch each tab and upload once so <code>default</code>, <code>guest</code>, and <code>vip</code> each have their own row.
                    </p>
                  )}
                </div>
              ) : null}

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
                  Use a file under <code>/public</code>, or upload — stored per tab in MongoDB on production.
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
                  Applies to the <strong>{PROFILE_TABS.find((t) => t.id === activeProfile)?.label}</strong> template only.
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
                  <input type="number" value={form.qrX} onChange={(event) => update('qrX', event.target.value)} />
                </div>
                <div className="nx-input-wrapper nx-half">
                  <label>Y-Coordinate (px)</label>
                  <input type="number" value={form.qrY} onChange={(event) => update('qrY', event.target.value)} />
                </div>
                <div className="nx-input-wrapper nx-full">
                  <label>QR Size / Width (px)</label>
                  <input type="number" value={form.qrWidth} onChange={(event) => update('qrWidth', event.target.value)} />
                </div>
              </div>
            </div>

            <div className="nx-settings-actions">
              <button className="nx-btn" onClick={saveSettings} style={{ width: '100%', height: '54px' }}>
                Save All Profiles
              </button>
              <button
                className="nx-btn"
                onClick={resetDefaults}
                style={{ width: '100%', height: '54px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none' }}
              >
                Reset Active Profile Only
              </button>
            </div>

            {saved && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  color: '#4ade80',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>✓</span> Settings successfully persisted.
              </div>
            )}
          </div>

          <div className="nx-settings-preview" style={{ marginTop: '0' }}>
            <h3 className="nx-settings-group-title" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', rowGap: '0.35rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.35rem' }}>
                Real-time preview
                {activeProfileLabel ? (
                  <span style={{ fontWeight: 600, color: '#e5e7eb', textTransform: 'none', letterSpacing: '0.02em' }}>
                    — {activeProfileLabel}
                  </span>
                ) : null}
              </span>
            </h3>
            <div className="nx-preview-container">
              <div className="id-card id-card-template" style={{ margin: '0' }}>
                <img
                  src={getIdCardTemplateImageSrc(preview.templateFile)}
                  alt="Template preview"
                  className="id-template-image"
                  key={`${activeProfile}-${preview.templateFile}`}
                  onError={handleTemplatePreviewError}
                  onLoad={(event) => {
                    templatePreviewDiagnosticRef.current = '';
                    const img = event.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      const ap = activeProfileRef.current;
                      setImageSizeByProfile((prev) => ({
                        ...prev,
                        [ap]: { width: img.naturalWidth, height: img.naturalHeight },
                      }));
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
                The preview matches the selected tab. Excel rows use the Guest or VIP template based on the{' '}
                <code>prefers</code> column.
              </p>
            </div>
          </div>
        </div>
      </div>
      {toastMessage && <div className="nx-settings-toast">{toastMessage}</div>}
    </main>
  );
}
