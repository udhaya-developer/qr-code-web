'use client';

import { useCallback, useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function fmtWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function AttendeeDetails({ attendee }) {
  const ticketLabel =
    attendee.ticketNumber != null ? `#${attendee.ticketNumber}` : '—';

  const rows = [
    ['Full name', attendee.fullName],
    ['Email', attendee.email],
    ['Phone', attendee.phone],
    ['Squad', attendee.squad],
    ['Referred by', attendee.referredBy],
    ['Ticket', ticketLabel],
    ['Registration ID', attendee.registrationId],
    ['Registered', fmtWhen(attendee.createdAt)],
    [
      'Check-in',
      attendee.checkedIn
        ? `Yes · ${fmtWhen(attendee.checkedInAt)}`
        : 'No',
    ],
  ];

  return (
    <dl className="scan-details">
      {rows.map(([label, value]) => (
        <div key={label} className="scan-detail-row">
          <dt>{label}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function QRScanner() {
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = useCallback(async (scanned) => {
    setLoading(true);
    setPanel(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: scanned }),
      });

      const data = await res.json();

      if (data.success && data.attendee) {
        setPanel({ type: 'success', attendee: data.attendee });
      } else if (data.attendee) {
        setPanel({
          type: 'warning',
          attendee: data.attendee,
          message: data.message || 'Notice',
        });
      } else {
        setPanel({
          type: 'error',
          message: data.message || 'Verification failed',
        });
      }
    } catch {
      setPanel({ type: 'error', message: 'Connection error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(
      (decodedText) => {
        handleScan(decodedText);
        scanner.clear();
      },
      () => {}
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [handleScan]);

  const resetScanner = () => {
    setPanel(null);
    window.location.reload();
  };

  const showCamera = !loading && !panel;

  return (
    <div className="scanner-container">
      <AnimatePresence mode="wait">
        {showCamera && (
          <motion.div
            key="reader-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="reader"
            className="glass-card"
          />
        )}

        {loading && (
          <motion.div
            key="loading"
            className="glass-card loading-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="spinner" size={48} />
            <h3>Loading attendee…</h3>
          </motion.div>
        )}

        {panel?.type === 'success' && (
          <motion.div
            key="success"
            className="glass-card success-card scan-result-card"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <CheckCircle className="status-icon success" size={48} />
            <h2 className="status-title">Access granted</h2>
            <p className="scan-result-sub">Check-in recorded. Attendee details:</p>
            <AttendeeDetails attendee={panel.attendee} />
            <button type="button" onClick={resetScanner} className="submit-btn scanner-action-btn">
              <RefreshCw size={20} /> Scan next
            </button>
          </motion.div>
        )}

        {panel?.type === 'warning' && (
          <motion.div
            key="warning"
            className="glass-card warning-card scan-result-card"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <AlertTriangle className="status-icon warning" size={48} />
            <h2 className="status-title">{panel.message}</h2>
            <p className="scan-result-sub">Profile on file:</p>
            <AttendeeDetails attendee={panel.attendee} />
            <button type="button" onClick={resetScanner} className="submit-btn scanner-action-btn warning-btn">
              <RefreshCw size={20} /> Scan next
            </button>
          </motion.div>
        )}

        {panel?.type === 'error' && (
          <motion.div
            key="error"
            className="glass-card error-card scan-result-card"
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <XCircle className="status-icon error" size={48} />
            <h2 className="status-title">Not verified</h2>
            <p className="error-message">{panel.message}</p>
            <button type="button" onClick={resetScanner} className="submit-btn scanner-action-btn error-btn">
              <RefreshCw size={20} /> Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .scanner-container {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
        }
        .loading-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem;
          text-align: center;
          gap: 0.75rem;
        }
        .spinner {
          color: #fbb03b;
          margin-bottom: 0.5rem;
          animation: spin 1s linear infinite;
        }
        #reader {
          border: none !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .scan-result-card {
          text-align: left;
          border-width: 1px;
          padding: 1.5rem 1.35rem 1.75rem;
        }
        .success-card {
          border-color: #22c55e !important;
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.15);
        }
        .warning-card {
          border-color: #eab308 !important;
          box-shadow: 0 0 28px rgba(234, 179, 8, 0.18);
        }
        .error-card {
          text-align: center;
          border-color: #ef4444 !important;
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.2);
        }
        .status-icon {
          margin: 0 auto 0.75rem;
          display: block;
        }
        .status-icon.success {
          color: #22c55e;
        }
        .status-icon.warning {
          color: #eab308;
        }
        .status-icon.error {
          color: #ef4444;
        }
        .status-title {
          font-size: 1.45rem;
          font-weight: 800;
          margin-bottom: 0.35rem;
          text-align: center;
        }
        .scan-result-sub {
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.85rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .scan-details {
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .scan-detail-row {
          display: grid;
          grid-template-columns: 8.5rem 1fr;
          gap: 0.65rem 1rem;
          align-items: start;
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding-bottom: 0.55rem;
        }
        .scan-detail-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .scan-detail-row dt {
          margin: 0;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-size: 0.72rem;
        }
        .scan-detail-row dd {
          margin: 0;
          color: rgba(255, 255, 255, 0.92);
          word-break: break-word;
        }
        .error-message {
          color: #f87171;
          font-size: 1.05rem;
          margin-bottom: 1rem;
        }
        .scanner-action-btn {
          margin-top: 1.35rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
        }
        .error-btn {
          background: rgba(127, 29, 29, 0.25);
          color: #fca5a5;
          border: 1px solid #ef4444;
        }
        .error-btn:hover {
          background: #ef4444;
          color: #fff;
        }
        .warning-btn {
          background: rgba(113, 63, 18, 0.35);
          color: #fde047;
          border: 1px solid rgba(234, 179, 8, 0.7);
        }
        .warning-btn:hover {
          background: rgba(234, 179, 8, 0.25);
          color: #fff;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (max-width: 520px) {
          .scan-detail-row {
            grid-template-columns: 1fr;
            gap: 0.2rem;
          }
        }
      `}</style>
    </div>
  );
}
