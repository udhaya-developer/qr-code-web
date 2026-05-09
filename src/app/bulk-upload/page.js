'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Upload, FileSpreadsheet, Send, CheckCircle2, XCircle, ImageDown } from 'lucide-react';
import {
  DEFAULT_ID_CARD_SETTINGS,
  getScaledQrPlacement,
  ID_CARD_SETTINGS_KEY,
  normalizeIdCardSettings,
} from '@/lib/idCardTemplateSettings';

export default function BulkUploadPage() {
  const [file, setFile] = useState(null);
  const [distribute, setDistribute] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState('');

  const accept = useMemo(() => '.xlsx,.xls,.csv', []);

  const getLocalTemplateSettings = () => {
    try {
      const raw = window.localStorage.getItem(ID_CARD_SETTINGS_KEY);
      if (!raw) return DEFAULT_ID_CARD_SETTINGS;
      return normalizeIdCardSettings(JSON.parse(raw));
    } catch {
      return DEFAULT_ID_CARD_SETTINGS;
    }
  };

  const downloadIdCardPng = async ({ registrationId, ticketNumber }) => {
    const qrValue = String(ticketNumber != null ? ticketNumber : registrationId);
    if (!registrationId || !qrValue) return;
    const key = `${registrationId}-${qrValue}`;
    if (downloadingKey === key) return;

    try {
      setDownloadingKey(key);
      const settings = getLocalTemplateSettings();
      const placement = getScaledQrPlacement(settings, settings.templateWidth || 674, settings.templateHeight || 1024);
      const slotPercent = {
        leftPct: placement.qrX / (settings.templateWidth || 674),
        topPct: placement.qrY / (settings.templateHeight || 1024),
        sizePct: placement.qrWidth / (settings.templateWidth || 674),
      };

      const res = await fetch('/api/id-card-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          qrValue,
          settings,
          placement,
          slotPercent,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate card image');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `id-card-${qrValue}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingKey('');
    }
  };

  const downloadQrSvg = (ticketNumber, registrationId) => {
    const id = `qr-${String(ticketNumber)}`;
    const svg = document.getElementById(id);
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgText = serializer.serializeToString(svg);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${registrationId || `ticket-${ticketNumber}`}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!file) {
      setError('Please select an Excel file.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('distribute', distribute ? 'true' : 'false');

      const res = await fetch('/api/bulk-upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Bulk upload failed');
      }
      setResult(data);
    } catch (err) {
      setError(err?.message || 'Bulk upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="nx-register-page">
      <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
        <div className="nx-register-head">
          <Link href="/register" className="nx-back-link">
            <ArrowLeft size={15} /> Back
          </Link>
          <p className="nx-kicker">BULK OPERATIONS</p>
          <h1 className="nx-title" style={{ fontSize: '3.2rem', marginTop: '0.8rem' }}>
            EXCEL <span>IMPORT</span>
          </h1>
          <p className="nx-subtitle" style={{ maxWidth: '720px', margin: '0' }}>
            Upload an Excel sheet with columns <code>name</code>, <code>email</code>, <code>number</code>, <code>prefers</code> (VIP/Normal).
            We’ll generate a QR ID card and send it by Email + WhatsApp.
          </p>
          <p className="nx-form-note" style={{ textAlign: 'left', textTransform: 'none', marginTop: '0.75rem' }}>
            To match your fixed template placement, configure it in <Link href="/settings" style={{ textDecoration: 'underline' }}>Template Settings</Link>.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '1.25rem' }}>
          <form onSubmit={onSubmit} className="nx-form-grid">
            <div className="form-group nx-full">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={16} /> Excel file
              </label>
              <input
                type="file"
                accept={accept}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="nx-form-note nx-full" style={{ textAlign: 'left', textTransform: 'none' }}>
                Required headers: <b>name</b>, <b>email</b>, <b>number</b>, <b>prefers</b> (values: VIP / Normal).
              </p>
            </div>

            <div className="form-group nx-full" style={{ marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={16} /> Send QR by Email & WhatsApp
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  id="distribute"
                  type="checkbox"
                  checked={distribute}
                  onChange={(e) => setDistribute(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <label htmlFor="distribute" style={{ margin: 0, fontWeight: 800 }}>
                  Distribute automatically after import
                </label>
              </div>
            </div>

            {error && <p className="nx-form-error nx-full">{error}</p>}

            <button type="submit" className="submit-btn nx-full" disabled={loading}>
              {loading ? 'Uploading…' : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}><Upload size={18} /> Upload & Process</span>)}
            </button>
          </form>
        </motion.div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Summary</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div className="nx-pill">Total: <b>{result.summary?.total ?? 0}</b></div>
                <div className="nx-pill">Created: <b>{result.summary?.created ?? 0}</b></div>
                <div className="nx-pill">Duplicates: <b>{result.summary?.duplicates ?? 0}</b></div>
                <div className="nx-pill">Invalid: <b>{result.summary?.invalid ?? 0}</b></div>
              </div>

              <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
                <table className="nx-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Status</th>
                      <th>Guest</th>
                      <th>QR</th>
                      <th>Registration</th>
                      <th>Email</th>
                      <th>WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.results || []).slice(0, 200).map((r, idx) => (
                      <tr key={`${r.row}-${idx}`}>
                        <td>{r.row}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {r.status === 'created' ? (
                            <span className="nx-status ok"><CheckCircle2 size={14} /> created</span>
                          ) : (
                            <span className="nx-status bad"><XCircle size={14} /> {r.status}</span>
                          )}
                        </td>
                        <td style={{ textTransform: 'uppercase', fontWeight: 900 }}>{r.guestType || 'normal'}</td>
                        <td>
                          {r.ticketNumber != null ? (
                            <div className="nx-qr-cell">
                              <QRCodeSVG
                                id={`qr-${String(r.ticketNumber)}`}
                                value={String(r.ticketNumber)}
                                size={52}
                                includeMargin={false}
                                bgColor="transparent"
                                fgColor="#ffffff"
                              />
                              <div className="nx-qr-label">#{r.ticketNumber}</div>
                              <button
                                type="button"
                                className="nx-qr-download"
                                onClick={() => downloadQrSvg(r.ticketNumber, r.registrationId)}
                              >
                                Download QR
                              </button>
                              <button
                                type="button"
                                className="nx-qr-download"
                                onClick={() => downloadIdCardPng({ registrationId: r.registrationId, ticketNumber: r.ticketNumber })}
                                disabled={downloadingKey === `${r.registrationId}-${String(r.ticketNumber)}`}
                                title="Downloads the full template-based ID card PNG"
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <ImageDown size={14} />
                                  {downloadingKey === `${r.registrationId}-${String(r.ticketNumber)}` ? 'Generating…' : 'Download Card'}
                                </span>
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.registrationId || '—'}</td>
                        <td>{r.emailStatus || '—'}</td>
                        <td>{r.whatsappStatus || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="nx-form-note" style={{ marginTop: '0.75rem', textAlign: 'left', textTransform: 'none' }}>
                  Showing up to 200 rows. Fix duplicates/invalid rows and re-upload if needed.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style jsx global>{`
        .nx-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.6rem 0.9rem;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 700;
        }
        .nx-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }
        .nx-table th, .nx-table td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.75rem 0.7rem;
          text-align: left;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.85);
        }
        .nx-qr-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.25rem;
        }
        .nx-qr-label {
          font-size: 0.7rem;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.06em;
        }
        .nx-qr-download {
          margin-top: 0.15rem;
          padding: 0.35rem 0.6rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 0.6rem;
          cursor: pointer;
          width: fit-content;
        }
        .nx-qr-download:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .nx-table th {
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.55);
          font-weight: 900;
        }
        .nx-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-size: 0.7rem;
        }
        .nx-status.ok { color: #4ade80; }
        .nx-status.bad { color: #fb7185; }
      `}</style>
    </main>
  );
}

