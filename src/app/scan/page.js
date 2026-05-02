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
        <header className="scan-header">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="exit-wrapper"
          >
            <Link href="/" className="exit-btn">
              <ArrowLeft size={16} /> <span>Exit Portal</span>
            </Link>
          </motion.div>

          <div className="staff-badge">
            <ShieldCheck size={14} className="badge-icon" />
            <span>Staff Verification Portal</span>
          </div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="title scan-title"
          >
            Entry <span>Control</span>
          </motion.h1>
        </header>

        <div className="scanner-wrapper">
          <QRScanner />
        </div>

        <footer className="scan-footer">
          SECURE ENCRYPTED VERIFICATION SYSTEM &copy; 2026 SURGE STARTUPS
        </footer>
      </div>

      <style jsx>{`
        .scan-main {
          min-height: 100vh;
          height: 100vh;
          background: #050508;
          position: relative;
          overflow: hidden;
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
          max-width: 600px;
          margin: 0 auto;
          padding: 1.5rem 1rem 0.5rem;
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
        }
        .scan-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          flex-shrink: 0;
          margin-top: 20px;
          gap: 10px;
        }
        .exit-wrapper {
          margin-bottom: 1.25rem;
        }
        .exit-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.6rem 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 10px 0px;
        }
        .exit-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--primary);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(202, 35, 255, 0.2);
        }
        .staff-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--primary);
          opacity: 0.8;
        }
        .badge-icon {
          color: var(--primary);
        }
        .scan-title {
          font-size: clamp(2rem, 8vw, 3rem) !important;
          margin-bottom: 0 !important;
          line-height: 1 !important;
          font-weight: 900 !important;
          letter-spacing: -0.02em !important;
          text-transform: uppercase !important;
          background: linear-gradient(to bottom, #fff 30%, rgba(255,255,255,0.4));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .scanner-wrapper {
          position: relative;
          width: 100%;
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
            padding: 1rem 0.75rem 0.25rem;
          }
        }
      `}</style>
    </main>
  );
}
