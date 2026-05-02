'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, XCircle, User, Mail, Phone, Users, Ticket, Calendar, ShieldCheck, CameraOff, Camera, Image as ImageIcon, FlipHorizontal } from 'lucide-react';
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

  const items = [
    { label: 'Full name', value: attendee.fullName, icon: User },
    { label: 'Email', value: attendee.email, icon: Mail },
    { label: 'Phone', value: attendee.phone, icon: Phone },
    { label: 'Squad', value: attendee.squad, icon: Users },
    { label: 'Ticket', value: ticketLabel, icon: Ticket },
    { label: 'Registered', value: fmtWhen(attendee.createdAt), icon: Calendar },
  ];

  return (
    <div className="attendee-grid">
      {items.map((item, idx) => (
        <motion.div 
          key={item.label} 
          className="attendee-item"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
        >
          <div className="item-icon">
            <item.icon size={14} />
          </div>
          <div className="item-content">
            <span className="item-label">{item.label}</span>
            <span className="item-value">{item.value || '—'}</span>
          </div>
        </motion.div>
      ))}
      <motion.div 
        className={`attendee-item full-width ${attendee.checkedIn ? 'checked-in' : 'not-checked-in'}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="item-icon">
          <ShieldCheck size={14} />
        </div>
        <div className="item-content">
          <span className="item-label">Access Status</span>
          <span className="item-value">
            {attendee.checkedIn
              ? `Checked-in at ${fmtWhen(attendee.checkedInAt)}`
              : 'Pending Check-in'}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default function QRScanner() {
  const [panel, setPanel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isTransitioning = useRef(false);
  const mountRef = useRef(true);

  const handleScan = useCallback(async (scanned) => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        // ignore
      }
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
    
    let element = document.getElementById("reader");
    if (!element) {
      setTimeout(() => startCamera(mode), 300);
      return;
    }

    try {
      isTransitioning.current = true;
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
        setCameraError("Camera access failed. Check permissions.");
      }
    } finally {
      isTransitioning.current = false;
    }
  }, [handleScan, facingMode]);

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

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const qr = new Html5Qrcode("reader");
      const text = await qr.scanFile(file, true);
      handleScan(text);
    } catch (err) {
      setPanel({ type: 'error', message: 'No QR code found' });
      setLoading(false);
    }
  };

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
                    <span>Initializing...</span>
                  </div>
                )}
              </div>
            )}
            
            {isCameraActive && <p className="scanner-hint">Align QR code within the frame</p>}

            <div className="scanner-controls">
              <button onClick={toggleCamera} className="control-btn" disabled={isTransitioning.current}>
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
          <motion.div key="loading" className="glass-card result-card loading-state">
            <Loader2 className="spinner" size={32} />
            <h3>Verifying...</h3>
          </motion.div>
        )}

        {panel?.type === 'success' && (
          <motion.div key="success" className="glass-card result-card success-state">
            <div className="status-header">
              <CheckCircle size={28} color="#22c55e" />
              <h2 className="status-title">Access Granted</h2>
            </div>
            <AttendeeDetails attendee={panel.attendee} />
            <button onClick={() => { setPanel(null); startCamera(); }} className="primary-cta-btn scanner-btn">Next Scan</button>
          </motion.div>
        )}

        {panel?.type === 'warning' && (
          <motion.div key="warning" className="glass-card result-card warning-state">
            <div className="status-header">
              <AlertTriangle size={28} color="#eab308" />
              <h2 className="status-title">Duplicate Entry</h2>
            </div>
            <AttendeeDetails attendee={panel.attendee} />
            <button onClick={() => { setPanel(null); startCamera(); }} className="secondary-cta-btn scanner-btn">Resume</button>
          </motion.div>
        )}

        {panel?.type === 'error' && (
          <motion.div key="error" className="glass-card result-card error-state">
            <XCircle size={40} color="#ef4444" />
            <h2 className="status-title">Access Denied</h2>
            <p>{panel.message}</p>
            <button onClick={() => { setPanel(null); startCamera(); }} className="primary-cta-btn scanner-btn">Try Again</button>
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
        #reader__scan_region > div {
          display: none !important;
        }
        #reader__scan_region canvas {
          display: none !important;
        }
        #reader [id*="qr-shaded-region"] {
          display: none !important;
        }
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
        
        .result-card {
          padding: 1.5rem;
          border-radius: 24px;
          text-align: center;
        }
        .status-header { display: flex; align-items: center; gap: 1rem; justify-content: center; margin-bottom: 1rem; }
        
        .attendee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1rem 0; text-align: left; }
        .attendee-item { background: rgba(255,255,255,0.03); padding: 0.75rem; border-radius: 12px; }
        .item-label { font-size: 0.6rem; color: rgba(255,255,255,0.4); text-transform: uppercase; display: block; }
        .item-value { font-size: 0.8rem; font-weight: 600; color: white; }
        .full-width { grid-column: span 2; }
        
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  );
}
