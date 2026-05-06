'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  XCircle, 
  User, 
  Mail, 
  Phone, 
  Users, 
  Ticket, 
  Calendar, 
  ShieldCheck, 
  CameraOff, 
  Camera, 
  Image as ImageIcon, 
  FlipHorizontal,
  ChevronRight,
  Fingerprint,
  Activity
} from 'lucide-react';
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
  const ticketLabel = attendee.ticketNumber != null ? `#${attendee.ticketNumber}` : '—';

  const secondaryItems = [
    { label: 'Squad', value: attendee.squad, icon: Users },
    { label: 'Phone', value: attendee.phone, icon: Phone },
    { label: 'Ticket', value: ticketLabel, icon: Ticket },
    { label: 'Registered', value: fmtWhen(attendee.createdAt), icon: Calendar },
  ];

  return (
    <div className="advanced-details">
      {/* Profile Section */}
      <motion.div 
        className="profile-section"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="profile-avatar">
          <User size={32} />
          <div className="avatar-pulse" />
        </div>
        <div className="profile-info">
          <h3 className="profile-name">{attendee.fullName || 'Anonymous Participant'}</h3>
          <p className="profile-email">{attendee.email || 'No email provided'}</p>
        </div>
        <div className="profile-badge">
          <Fingerprint size={14} />
          <span>{attendee.registrationId || 'PENDING'}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="details-bento-grid">
        {secondaryItems.map((item, idx) => (
          <motion.div 
            key={item.label} 
            className="bento-item"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
          >
            <div className="item-icon-box">
              <item.icon size={16} />
            </div>
            <div className="item-text">
              <span className="item-label">{item.label}</span>
              <span className="item-value">{item.value || '—'}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status Footer */}
      <motion.div 
        className={`status-footer ${attendee.checkedIn ? 'is-active' : 'is-pending'}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="status-indicator">
          <Activity size={14} className="activity-icon" />
          <span>{attendee.checkedIn ? 'Verification Synchronized' : 'Access Authorization Pending'}</span>
        </div>
        <p className="status-timestamp">
          {attendee.checkedIn 
            ? `Verified at ${fmtWhen(attendee.checkedInAt)}` 
            : 'Awaiting entry checkpoint scan'}
        </p>
      </motion.div>

      <style jsx>{`
        .advanced-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          text-align: left;
          overflow-y: auto;
          max-height: 50vh;
          padding-right: 4px;
        }
        .advanced-details::-webkit-scrollbar {
          width: 4px;
        }
        .advanced-details::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        /* Profile Section */
        .profile-section {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
          flex-shrink: 0;
        }
        .profile-avatar {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--primary), #ca23ff);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
          flex-shrink: 0;
        }
        .avatar-pulse {
          position: absolute;
          inset: -3px;
          border-radius: 15px;
          border: 2px solid var(--primary);
          opacity: 0.3;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .profile-info {
          flex: 1;
          min-width: 0;
        }
        .profile-name {
          font-size: 1rem;
          font-weight: 800;
          color: white;
          margin: 0;
        }
        .profile-email {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .profile-badge {
          position: absolute;
          top: 8px;
          right: 10px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2px 8px;
          border-radius: 100px;
          display: flex;
          align-items: center;
          gap: 4px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.6rem;
          font-weight: 700;
        }

        /* Bento Grid */
        .details-bento-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .bento-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }
        .item-icon-box {
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.04);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          flex-shrink: 0;
        }
        .item-text {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          gap: 1rem;
        }
        .item-value {
          font-size: 1rem;
          font-weight: 800;
          color: white;
          text-align: left;
          flex: 1;
        }
        .item-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 700;
          text-align: right;
          flex-shrink: 0;
        }

        /* Status Footer */
        .status-footer {
          padding: 1rem 1.25rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          border: 1px solid transparent;
        }
        .status-footer.is-active {
          background: rgba(34, 197, 94, 0.05);
          border-color: rgba(34, 197, 94, 0.1);
        }
        .status-footer.is-pending {
          background: rgba(234, 179, 8, 0.05);
          border-color: rgba(234, 179, 8, 0.1);
        }
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .is-active .status-indicator { color: #22c55e; }
        .is-pending .status-indicator { color: #eab308; }
        .activity-icon {
          animation: pulse-slow 2s infinite;
        }
        .status-timestamp {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(1.1);
            opacity: 0;
          }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 420px) {
          .details-bento-grid {
            grid-template-columns: 1fr;
          }
          .profile-section {
            padding: 1rem;
            gap: 1rem;
          }
          .profile-avatar {
            width: 50px;
            height: 50px;
          }
          .profile-name {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function QRScanner() {
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [transitioning, setTransitioning] = useState(false);
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isTransitioning = useRef(false);
  const mountRef = useRef(true);
  const Html5QrcodeRef = useRef(null);
  const html5LoadPromiseRef = useRef(null);

  const ensureHtml5Qrcode = useCallback(async () => {
    if (Html5QrcodeRef.current) return Html5QrcodeRef.current;
    if (!html5LoadPromiseRef.current) {
      html5LoadPromiseRef.current = import('html5-qrcode')
        .then((mod) => {
          Html5QrcodeRef.current = mod.Html5Qrcode;
          return Html5QrcodeRef.current;
        })
        .catch((err) => {
          html5LoadPromiseRef.current = null;
          throw err;
        });
    }
    return html5LoadPromiseRef.current;
  }, []);

  const handleScan = useCallback(async (scanned) => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {}
      setIsCameraActive(false);
    }

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

  const startCamera = useCallback(async (mode = facingMode) => {
    if (!mountRef.current || isTransitioning.current) return;
    
    // Wait briefly for the reader element to exist (avoids self-referencing startCamera).
    let element = document.getElementById("reader");
    if (!element) {
      for (let i = 0; i < 4; i++) {
        await new Promise((r) => setTimeout(r, 200));
        element = document.getElementById("reader");
        if (element) break;
      }
      if (!element) return;
    }

    try {
      const Html5Qrcode = await ensureHtml5Qrcode();
      isTransitioning.current = true;
      setTransitioning(true);
      setCameraError(null);
      
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {}
      }

      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: mode },
        {
          fps: 25,
          qrbox: (w, h) => {
            const size = Math.max(Math.floor(Math.min(w, h) * 0.7), 250);
            return { width: size, height: size };
          }
        },
        (text) => handleScan(text),
        () => {}
      );
      
      if (mountRef.current) {
        setIsCameraActive(true);
      }
    } catch (err) {
      const msg = err.toString().toLowerCase();
      if (!msg.includes("transition") && !msg.includes("state")) {
        setCameraError("Camera access failed. Check permissions or reload.");
      }
    } finally {
      isTransitioning.current = false;
      if (mountRef.current) setTransitioning(false);
    }
  }, [ensureHtml5Qrcode, handleScan, facingMode]);

  useEffect(() => {
    mountRef.current = true;
    const timer = setTimeout(() => startCamera(), 800);
    return () => {
      mountRef.current = false;
      clearTimeout(timer);
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [startCamera]);

  const toggleCamera = () => {
    if (isTransitioning.current) return;
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const handleGalleryUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const Html5Qrcode = await ensureHtml5Qrcode();
      const qr = new Html5Qrcode("reader");
      const text = await qr.scanFile(file, true);
      handleScan(text);
    } catch (err) {
      setPanel({ type: 'error', message: 'No QR code found' });
      setLoading(false);
    }
  }, [ensureHtml5Qrcode, handleScan]);

  return (
    <div className="scanner-container">
      <AnimatePresence mode="wait">
        {!loading && !panel && (
          <motion.div
            key="scanner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="scanner-box"
          >
            <div id="reader" />
            
            {cameraError ? (
              <div className="camera-error-overlay">
                <CameraOff size={48} />
                <p>{cameraError}</p>
                <button onClick={() => startCamera()} className="retry-btn">Retry</button>
              </div>
            ) : (
              <div className="scanner-overlay">
                <div className="viewfinder-guide">
                  <div className="scan-corner top-left" />
                  <div className="scan-corner top-right" />
                  <div className="scan-corner bottom-left" />
                  <div className="scan-corner bottom-right" />
                  <div className="scan-line" />
                </div>
                {!isCameraActive && (
                  <div className="camera-loading">
                    <Loader2 className="spinner" size={32} />
                    <span>Initializing Security Layer...</span>
                  </div>
                )}
              </div>
            )}
            
            {isCameraActive && <p className="scanner-hint">Align QR code within the frame</p>}

            <div className="scanner-controls">
              <button onClick={toggleCamera} className="control-btn" disabled={transitioning}>
                <FlipHorizontal size={20} />
                <span>Switch</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="control-btn">
                <ImageIcon size={20} />
                <span>Gallery</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleGalleryUpload} accept="image/*" style={{ display: 'none' }} />
            </div>
          </motion.div>
        )}

        {loading && (
          <motion.div 
            key="loading" 
            className="glass-card result-card loading-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
          >
            <div className="loading-container">
              <Loader2 className="spinner" size={48} />
              <div className="loader-orbit" />
            </div>
            <h3>Verifying Identity</h3>
            <p>Processing decentralized scan record...</p>
          </motion.div>
        )}

        {panel?.type === 'success' && (
          <motion.div 
            key="success" 
            className="glass-card result-card success-panel"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="status-hero success">
              <div className="hero-icon-wrap">
                <CheckCircle size={40} />
              </div>
              <div className="hero-text">
                <h2 className="status-title">Access Authorized</h2>
                <p className="status-subtitle">Participant Verified Successfully</p>
              </div>
            </div>
            
            <AttendeeDetails attendee={panel.attendee} />
            
            <button 
              onClick={() => { setPanel(null); startCamera(); }} 
              className="action-button success-btn"
            >
              <span>Ready for Next Entry</span>
              <ChevronRight size={18} />
            </button>
          </motion.div>
        )}

        {panel?.type === 'warning' && (
          <motion.div 
            key="warning" 
            className="glass-card result-card warning-panel"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="status-hero warning">
              <div className="hero-icon-wrap">
                <AlertTriangle size={40} />
              </div>
              <div className="hero-text">
                <h2 className="status-title">Duplicate Entry</h2>
                <p className="status-subtitle">{panel.message}</p>
              </div>
            </div>
            
            <AttendeeDetails attendee={panel.attendee} />
            
            <button 
              onClick={() => { setPanel(null); startCamera(); }} 
              className="action-button warning-btn"
            >
              <span>Acknowledge & Continue</span>
              <ChevronRight size={18} />
            </button>
          </motion.div>
        )}

        {panel?.type === 'error' && (
          <motion.div 
            key="error" 
            className="glass-card result-card error-panel"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="status-hero error">
              <div className="hero-icon-wrap">
                <XCircle size={64} />
              </div>
              <h2 className="status-title">Security Violation</h2>
              <p className="status-subtitle">{panel.message}</p>
            </div>
            
            <div className="error-body">
              <p>The scanned identity could not be verified against the master registration records. Please escort the participant to the help desk for manual check-in.</p>
            </div>
            
            <button 
              onClick={() => { setPanel(null); startCamera(); }} 
              className="action-button error-btn"
            >
              <span>Reset Scanner</span>
              <RefreshCw size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .scanner-container {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          min-height: 0;
        }
        .scanner-box {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #000;
          border-radius: 0;
          overflow: hidden;
          border: 1px solid rgba(202, 35, 255, 0.3);
          box-shadow: 0 0 20px rgba(202, 35, 255, 0.05);
        }
        #reader {
          width: 100% !important;
          height: 100% !important;
          flex: 1 !important;
          background: #000 !important;
          border: none !important;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }
        #reader__scan_region {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
        }
        #reader__scan_region video {
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        #reader__scan_region > div { display: none !important; }
        #reader__scan_region canvas { display: none !important; }
        #reader [id*="qr-shaded-region"] { display: none !important; }
        #reader img { display: none !important; }
        
        .scanner-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          overflow: hidden;
        }
        .viewfinder-guide {
          position: relative;
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.65);
          border-radius: 20px;
          z-index: 5;
        }
        .camera-loading {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          background: #000;
          color: rgba(255,255,255,0.7);
          z-index: 30;
        }
        .scan-corner {
          position: absolute;
          width: 48px;
          height: 48px;
          border: 4px solid rgba(202, 35, 255, 1);
          filter: drop-shadow(0 0 12px rgba(202, 35, 255, 0.4));
          z-index: 2;
        }
        .top-left { top: -2px; left: -2px; border-right: none; border-bottom: none; border-radius: 16px 0 0 0; }
        .top-right { top: -2px; right: -2px; border-left: none; border-bottom: none; border-radius: 0 16px 0 0; }
        .bottom-left { bottom: -2px; left: -2px; border-right: none; border-top: none; border-radius: 0 0 0 16px; }
        .bottom-right { bottom: -2px; right: -2px; border-left: none; border-top: none; border-radius: 0 0 16px 0; }
        
        .scan-line {
          position: absolute;
          top: 10%;
          left: 5%;
          right: 5%;
          height: 2px;
          background: var(--primary);
          box-shadow: 0 0 20px var(--primary);
          animation: scan 2.5s infinite;
        }
        
        .scanner-hint {
          position: absolute;
          bottom: 120px;
          width: 100%;
          text-align: center;
          color: white;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          z-index: 15;
          opacity: 0.8;
        }
        
        .scanner-controls {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 1rem;
          z-index: 20;
          padding: 0 1rem;
        }
        
        .control-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 0.8rem 1.2rem;
          background: rgba(255,255,255,0.1) !important;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 16px;
          color: white !important;
          cursor: pointer;
          min-width: 90px;
          transition: all 0.2s;
        }
        .control-btn:hover { background: rgba(255,255,255,0.2) !important; }
        .control-btn span { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }
        
        /* Result Panels */
        .result-card {
          padding: 1.5rem;
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
        }

        .status-hero {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 0.5rem 0;
        }
        .status-hero.error {
          flex-direction: column;
          text-align: center;
          padding: 2rem 0;
        }
        .hero-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .success .hero-icon-wrap { background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.2); }
        .warning .hero-icon-wrap { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.2); }
        .error .hero-icon-wrap { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); width: 100px; height: 100px; margin-bottom: 1rem; }

        .status-title {
          font-size: 1.5rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .status-subtitle {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0.25rem 0 0;
          font-weight: 500;
        }

        .action-button {
          width: 100%;
          padding: 1.15rem;
          border-radius: 20px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .success-btn { background: #22c55e; color: black; }
        .warning-btn { background: #eab308; color: black; }
        .error-btn { background: #ef4444; color: white; }
        .action-button:hover { transform: scale(1.02); filter: brightness(1.1); }
        .action-button:active { transform: scale(0.98); }

        .error-body {
          text-align: center;
          background: rgba(239, 68, 68, 0.05);
          padding: 1.5rem;
          border-radius: 20px;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }
        .error-body p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.7);
        }

        .loading-state {
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 4rem 2rem;
        }
        .loading-container {
          position: relative;
          margin-bottom: 2rem;
        }
        .loader-orbit {
          position: absolute;
          inset: -10px;
          border: 2px solid var(--primary);
          border-radius: 50%;
          border-right-color: transparent;
          border-bottom-color: transparent;
          animation: rotate 1.5s linear infinite;
        }

        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
