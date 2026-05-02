'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import RegistrationForm from '@/components/RegistrationForm';
import IDCard from '@/components/IDCard';

export default function RegisterPage() {
  const [attendee, setAttendee] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleRegistered = (data) => {
    setIsGenerating(true);
    window.setTimeout(() => {
      setAttendee(data);
      setIsGenerating(false);
    }, 1800);
  };

  return (
    <main>
      <div className="container">
        <header className="nx-navbar">
          <div className="nx-logo">NEXUS PROTOCOL</div>
          <nav className="nx-menu">
            <a href="/">SCHEDULE</a>
            <a href="/">SPEAKERS</a>
            <a href="/">VENUES</a>
            <a href="/">TICKETS</a>
          </nav>
          <Link href="/register" className="nx-btn">REGISTER NOW</Link>
        </header>

        {!attendee && !isGenerating ? (
          <section className="nx-section nx-register-page">
            <div className="nx-register-head">
              <Link href="/" className="nx-back-link">
                <ArrowLeft size={15} /> Back to Landing
              </Link>
              <p className="nx-kicker">OPERATOR ONBOARDING</p>
              <h1 className="nx-title" style={{ fontSize: '4rem', marginTop: '0.8rem' }}>
                ACCESS PROTOCOL
              </h1>
              <div className="nx-register-divider"></div>
            </div>
            <div className="section-content-center">
              <div className="form-wrap nx-register-form-wrap">
                <RegistrationForm onRegistered={handleRegistered} />
              </div>
            </div>
          </section>
        ) : isGenerating ? (
          <section className="nx-section nx-register-page">
            <div className="nx-id-loading">
              <div className="nx-id-loading-ring"></div>
              <h2>GENERATING ID CARD</h2>
              <p>Encrypting profile and creating secure event pass...</p>
            </div>
          </section>
        ) : (
          <section className="nx-section">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', marginBottom: '2rem' }}
            >
              <ShieldCheck size={56} style={{ color: '#22c55e', margin: '0 auto 1rem' }} />
              <h2 className="nx-title" style={{ fontSize: '2rem' }}>
                REGISTRATION <span>CONFIRMED</span>
              </h2>
            </motion.div>
            <IDCard attendee={attendee} />
          </section>
        )}

        <footer className="nx-footer">
          <div className="nx-footer-inner">
            <div className="nx-logo">NEXUS PROTOCOL</div>
            <div className="nx-footer-links">
              <a href="/">PRIVACY</a>
              <a href="/">TERMS</a>
              <a href="/">CONTACT</a>
              <a href="/">PRESS</a>
            </div>
          </div>
          <p className="nx-footer-bottom">© 2026 NEXUS EVENT PROTOCOL. ALL RIGHTS RESERVED.</p>
        </footer>
      </div>
    </main>
  );
}
