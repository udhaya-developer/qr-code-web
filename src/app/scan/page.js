'use client';

import QRScanner from '@/components/QRScanner';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  return (
    <main className="scan-main">
      <div className="scan-bg-overlay" />
      
      <div className="scan-container-outer">
        <header className="scan-header nx-register-head">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="exit-wrapper"
          >
            <Link href="/" className="exit-btn nx-back-link">
              <ArrowLeft size={16} /> <span>Exit Portal</span>
            </Link>
          </motion.div>

          <div className="staff-badge nx-kicker">
            <ShieldCheck size={14} className="badge-icon" />
            <span>Staff Verification Portal</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="scan-title nx-title"
          >
            ENTRY <span>CONTROL</span>
          </motion.h1>

          <div className="scan-divider nx-register-divider" />
        </header>

        <div className="scanner-shell">
          <div className="scanner-wrapper">
            <QRScanner />
          </div>
        </div>

        <footer className="scan-footer">
          SECURE ENCRYPTED VERIFICATION SYSTEM &copy; 2026 SURGE STARTUPS
        </footer>
      </div>

      <style jsx>{`
        .scan-main {
          min-height: 100dvh;
          height: auto;
          background: #050508;
          position: relative;
          overflow-x: hidden;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .scan-bg-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(202, 35, 255, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(95, 41, 255, 0.05) 0%, transparent 40%);
          z-index: 1;
        }
        .scan-container-outer {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 1.25rem 1.25rem 0.5rem;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 100%;
          padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
        }
        .scan-header {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          flex-shrink: 0;
          margin-top: 6px;
          gap: 8px;
        }
        .exit-wrapper {
          margin-bottom: 0.35rem;
        }
        .exit-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 0;
          color: #9ca3af;
          text-decoration: none;
          font-size: 0.76rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 0;
        }
        .exit-btn:hover {
          color: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }
        .staff-badge {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.2rem;
        }
        .badge-icon {
          color: var(--primary);
        }
        .scan-title {
          font-size: clamp(2.4rem, 6.5vw, 5.2rem);
          margin: 0;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }
        .scan-divider {
          margin-top: 0.35rem;
        }
        .scanner-shell {
          width: 100%;
          flex: 1;
          display: flex;
          justify-content: center;
          min-height: 0;
        }
        .scanner-wrapper {
          position: relative;
          width: 100%;
          max-width: 600px;
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-top: 1rem;
          min-height: 0; /* Important for flex-grow in column */
        }
        .scan-footer {
          flex-shrink: 0;
          padding: 1rem 0;
          text-align: center;
          color: rgba(255, 255, 255, 0.1);
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          font-weight: 500;
        }

        @media (max-width: 480px) {
          .scan-container-outer {
            padding: 1rem 0.9rem 0.25rem;
          }
          .scanner-wrapper {
            margin-top: 0.75rem;
          }
        }
      `}</style>
    </main>
  );
}
