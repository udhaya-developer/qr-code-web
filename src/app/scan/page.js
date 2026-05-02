'use client';

import QRScanner from '@/components/QRScanner';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ScanPage() {
  return (
    <main>
      <div className="container">
        <header style={{ marginBottom: '2rem' }}>
          <Link href="/" className="print-btn" style={{ display: 'inline-flex', marginBottom: '2rem' }}>
            <ArrowLeft size={20} /> Back to Registration
          </Link>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="title"
            style={{ fontSize: '3rem' }}
          >
            Entry Verification
          </motion.h1>
          <p className="subtitle">
            Scan a ticket QR to verify entry and view full registration details.
          </p>
        </header>

        <QRScanner />

        <footer style={{ marginTop: '5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
          © 2026 SURGE STARTUPS. ENTRY PORTAL.
        </footer>
      </div>
    </main>
  );
}
