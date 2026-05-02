'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({ hours: 24, minutes: 8, seconds: 14 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main>
      <div className="container">
        <>
          <header className="nx-navbar">
            <div className="nx-logo">NEXUS PROTOCOL</div>
            <nav className="nx-menu">
              <a href="#home">INTEL</a>
              <a href="#architects">SPEAKERS</a>
              <a href="#timeline">TIMELINE</a>
            </nav>
            <Link href="/register" className="nx-btn">REGISTER NOW</Link>
          </header>

          <section id="home" className="nx-hero">
            <div className="nx-overlay"></div>
            <div className="nx-hero-content">
              <p className="nx-kicker">EVENT PROTOCOL BY BILIMBE DEPLOYMENT</p>
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="nx-title"
              >
                DEFINE THE <span>NEW REALITY</span>
              </motion.h1>
              <p className="nx-subtitle">
                Join the most immersive event interface where registration, attendance and check-in
                are synchronized in one secure system.
              </p>

              <div className="nx-countdown">
                <div><strong>{String(timeLeft.hours).padStart(2, '0')}</strong><span>HOURS</span></div>
                <i>:</i>
                <div><strong>{String(timeLeft.minutes).padStart(2, '0')}</strong><span>MINUTES</span></div>
                <i>:</i>
                <div><strong>{String(timeLeft.seconds).padStart(2, '0')}</strong><span>SECS</span></div>
              </div>

              <Link href="/register" className="nx-hero-btn">JOIN THE PROTOCOL</Link>
            </div>
          </section>

            <section id="architects" className="nx-section">
              <div className="nx-section-head">
                <h2>INTELLIGENCE <span>ARCHITECTS</span></h2>
                <p>The minds behind the protocol. Specialists in registration systems and event operations.</p>
              </div>
              <div className="nx-grid">
                <article className="nx-card">
                  <img src="/about_festival.png" alt="speaker one" />
                  <h3>Neural Strategist</h3>
                  <p>Designs the attendee routing logic and onboarding flow.</p>
                </article>
                <article className="nx-card">
                  <img src="/music_guests.png" alt="speaker two" />
                  <h3>System Engineer</h3>
                  <p>Builds reliable pipelines from registration to final check-in.</p>
                </article>
                <article className="nx-card">
                  <img src="/festival_hero_bg.png" alt="speaker three" />
                  <h3>Quantum Analyst</h3>
                  <p>Converts event data into real-time operational intelligence.</p>
                </article>
                <article className="nx-card">
                  <img src="/about_festival.png" alt="speaker four" />
                  <h3>Ethical AI</h3>
                  <p>Protects verification integrity with secure authentication layers.</p>
                </article>
              </div>
            </section>

            <section id="timeline" className="nx-section nx-timeline">
              <div className="nx-section-head center">
                <h2>EVENT <span>CHRONICLE</span></h2>
                <p>THE OPERATIONAL TIMELINE</p>
              </div>
              <div className="nx-timeline-list">
                <div className="nx-time-item">
                  <div className="nx-time">09:00</div>
                  <div>
                    <h4>System Genesis: Keynote</h4>
                    <p>Opening address outlining the event operations and check-in framework.</p>
                  </div>
                </div>
                <div className="nx-time-item">
                  <div className="nx-time">13:00</div>
                  <div>
                    <h4>Neural Interface Workshop</h4>
                    <p>Hands-on setup for registration analytics and real-time visibility.</p>
                  </div>
                </div>
                <div className="nx-time-item">
                  <div className="nx-time">16:30</div>
                  <div>
                    <h4>Quantum Supremacy Panel</h4>
                    <p>Discussion on scalable event infrastructure and secure validation.</p>
                  </div>
                </div>
              </div>
            </section>

        </>

        <footer id="contact" className="nx-footer">
          <div className="nx-footer-inner">
            <div className="nx-logo">NEXUS PROTOCOL</div>
            <div className="nx-footer-links">
              <a href="#home">HOME</a>
              <a href="#architects">SPEAKERS</a>
              <a href="#timeline">TIMELINE</a>
              <a href="/scan"><CalendarClock size={13} /> VERIFY</a>
            </div>
          </div>
          <p className="nx-footer-bottom">© 2026 BILIMBE DIGITAL. ALL RIGHTS RESERVED.</p>
        </footer>
      </div>
    </main>
  );
}
