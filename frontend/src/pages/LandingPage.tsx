import React, { useEffect, useState } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* ============ NAVBAR ============ */}
      <nav className={`landing-nav ${navScrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-nav-logo">
            <div className="landing-nav-logo-icon">🧠</div>
            <span className="landing-nav-logo-text">Medico-Agent</span>
          </div>
          <ul className="landing-nav-links">
            <li><a href="#problem" onClick={(e) => { e.preventDefault(); scrollTo('problem'); }}>Problem</a></li>
            <li><a href="#solution" onClick={(e) => { e.preventDefault(); scrollTo('solution'); }}>Solution</a></li>
            <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a></li>
            <li><a href="#architecture" onClick={(e) => { e.preventDefault(); scrollTo('architecture'); }}>Architecture</a></li>
            <li><a href="#comparison" onClick={(e) => { e.preventDefault(); scrollTo('comparison'); }}>Compare</a></li>
            <li>
              <a href="#" className="landing-nav-cta" onClick={(e) => { e.preventDefault(); onEnterApp(); }}>
                Open Dashboard →
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="landing-hero">
        <div className="landing-section">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI-Powered Clinical Documentation
          </div>

          <h1 className="hero-title">
            A Digital Clinical Memory<br />
            <span className="hero-title-gradient">for Every Admission</span>
          </h1>

          <p className="hero-subtitle">
            Where no important event is lost, every clinical decision is traceable, and doctors spend less time reconstructing the past — and more time caring for patients.
          </p>

          <div className="hero-actions">
            <button className="hero-btn-primary" onClick={onEnterApp}>
              🚀 Launch Clinical Dashboard
            </button>
            <button className="hero-btn-secondary" onClick={() => scrollTo('solution')}>
              See How It Works ↓
            </button>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <div className="landing-section">
        <div className="landing-stats">
          <div className="stat-card">
            <div className="stat-number">11</div>
            <div className="stat-label">Pipeline Layers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">1‑Click</div>
            <div className="stat-label">Discharge Summary</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">4+</div>
            <div className="stat-label">Input Modalities</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Clinical Thread Active</div>
          </div>
        </div>
      </div>

      {/* ============ PROBLEM ============ */}
      <section id="problem" className="landing-problem">
        <div className="landing-section animate-on-scroll">
          <div className="section-label">
            <span className="section-label-dot" style={{ background: '#ff5630' }} />
            The Challenge
          </div>
          <h2 className="section-title">The Anatomy of Broken Clinical Data</h2>
          <p className="section-subtitle">
            A massive daily volume of critical patient information is generated, but remains trapped in manual, fragmented, and disconnected silos.
          </p>

          <div className="problem-grid">
            <div className="problem-card animate-on-scroll">
              <div className="problem-icon" style={{ background: '#ffebe6', color: '#de350b' }}>📋</div>
              <h3 className="problem-card-title">Retrospective Reconstruction</h3>
              <p className="problem-card-text">
                Discharge summaries are written by looking backwards through scattered notes, lab printouts, and memory — days after events occurred. Critical details are lost.
              </p>
            </div>

            <div className="problem-card animate-on-scroll">
              <div className="problem-icon" style={{ background: '#fff3cd', color: '#856404' }}>🔀</div>
              <h3 className="problem-card-title">Fragmented Workflows</h3>
              <p className="problem-card-text">
                Admission notes, progress notes, investigation reports, nursing records, and consultation notes live in separate systems. Copy-pasting between them wastes hours daily.
              </p>
            </div>

            <div className="problem-card animate-on-scroll">
              <div className="problem-icon" style={{ background: '#ffedf0', color: '#de350b' }}>⚠️</div>
              <h3 className="problem-card-title">Medico-Legal Risk</h3>
              <p className="problem-card-text">
                Manual omissions create documentation gaps. A missed medication change or procedure note can have serious legal consequences and compromise patient safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SOLUTION / CORE CONCEPT ============ */}
      <section id="solution" className="landing-solution">
        <div className="landing-section">
          <div className="solution-grid">
            <div className="solution-visual animate-on-scroll">
              <div className="section-label">
                <span className="section-label-dot" style={{ background: '#36b37e' }} />
                The Core Concept
              </div>
              <h2 className="section-title" style={{ marginBottom: '24px' }}>Dynamic Clinical Memory</h2>
              <p style={{ color: '#42526e', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '32px' }}>
                Instead of reconstructing the past at discharge, the <strong>Clinical Thread</strong> moves forward — silently accumulating and organizing every clinical event chronologically throughout hospitalization.
              </p>

              <div className="clinical-thread-diagram">
                <div className="thread-line" />
                <div className="thread-events">
                  <div className="thread-event">
                    <div className="thread-event-dot">🏥</div>
                    <span className="thread-event-label">Admission Note</span>
                  </div>
                  <div className="thread-event">
                    <div className="thread-event-dot">🩺</div>
                    <span className="thread-event-label">Daily Progress</span>
                  </div>
                  <div className="thread-event">
                    <div className="thread-event-dot">🔬</div>
                    <span className="thread-event-label">Lab Results</span>
                  </div>
                  <div className="thread-event">
                    <div className="thread-event-dot">💊</div>
                    <span className="thread-event-label">Rx Change</span>
                  </div>
                  <div className="thread-event">
                    <div className="thread-event-dot">📄</div>
                    <span className="thread-event-label">Discharge</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="solution-content animate-on-scroll">
              <div className="section-label">
                <span className="section-label-dot" style={{ background: '#0052cc' }} />
                What Changes
              </div>
              <h2 className="section-title">One Unified Platform</h2>

              <ul className="solution-list">
                <li className="solution-list-item">
                  <div className="solution-list-icon">🎙️</div>
                  <div className="solution-list-text">
                    <strong>Multimodal Ingestion</strong>
                    <span>Voice dictation, typed notes, scanned documents, and imaging — all flow into a single clinical ledger.</span>
                  </div>
                </li>
                <li className="solution-list-item">
                  <div className="solution-list-icon">🧠</div>
                  <div className="solution-list-text">
                    <strong>AI-Powered Extraction</strong>
                    <span>Gemini 2.5 Flash extracts diagnoses, medications, procedures, labs, and timestamps automatically.</span>
                  </div>
                </li>
                <li className="solution-list-item">
                  <div className="solution-list-icon">📝</div>
                  <div className="solution-list-text">
                    <strong>Continuous Narrative</strong>
                    <span>The Course in Hospital updates itself in real-time as new events arrive — always ready for review.</span>
                  </div>
                </li>
                <li className="solution-list-item">
                  <div className="solution-list-icon">🛡️</div>
                  <div className="solution-list-text">
                    <strong>Safety Validation</strong>
                    <span>Automated checks for drug interactions, dosage sanity, lab alerts, and missing documentation.</span>
                  </div>
                </li>
                <li className="solution-list-item">
                  <div className="solution-list-icon">✅</div>
                  <div className="solution-list-text">
                    <strong>1-Click Discharge</strong>
                    <span>Generate a complete, medico-legally defensible discharge summary with a single action.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="landing-features">
        <div className="landing-section">
          <div style={{ textAlign: 'center', marginBottom: '48px' }} className="animate-on-scroll">
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <span className="section-label-dot" style={{ background: '#0052cc' }} />
              Platform Capabilities
            </div>
            <h2 className="section-title" style={{ maxWidth: '600px', margin: '0 auto 16px' }}>
              Built for Clinicians, by Clinical Need
            </h2>
            <p className="section-subtitle" style={{ maxWidth: '560px', margin: '0 auto' }}>
              Every feature is designed around the real workflow of pulmonologists, intensivists, and critical-care teams.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card animate-on-scroll">
              <div className="feature-card-icon" style={{ background: '#e6fcff', color: '#00b8d9' }}>🩺</div>
              <h3 className="feature-card-title">Census & Bed Board</h3>
              <p className="feature-card-text">
                Kanban-style ward management with drag-and-drop patient flow across ICU, Ward, and Discharge columns. Real-time bed occupancy at a glance.
              </p>
              <span className="feature-card-tag" style={{ background: '#e6fcff', color: '#00b8d9' }}>Operational</span>
            </div>

            <div className="feature-card animate-on-scroll">
              <div className="feature-card-icon" style={{ background: '#deebff', color: '#0052cc' }}>📊</div>
              <h3 className="feature-card-title">Patient Timeline</h3>
              <p className="feature-card-text">
                Chronological, filterable event stream for each patient — diagnoses, medications, procedures, investigations, and notes on a unified timeline.
              </p>
              <span className="feature-card-tag" style={{ background: '#deebff', color: '#0052cc' }}>Core</span>
            </div>

            <div className="feature-card animate-on-scroll">
              <div className="feature-card-icon" style={{ background: '#fff3cd', color: '#856404' }}>🤖</div>
              <h3 className="feature-card-title">AI Clinical Copilot</h3>
              <p className="feature-card-text">
                Ask natural-language questions about any patient — get context-grounded answers from the clinical thread with source attribution and evidence linking.
              </p>
              <span className="feature-card-tag" style={{ background: '#fff3cd', color: '#856404' }}>AI-Powered</span>
            </div>

            <div className="feature-card animate-on-scroll">
              <div className="feature-card-icon" style={{ background: '#e8f5e9', color: '#36b37e' }}>📄</div>
              <h3 className="feature-card-title">Discharge Generator</h3>
              <p className="feature-card-text">
                One-click compilation of a complete discharge summary — HOPI, course in hospital, medications, investigations, and follow-up instructions.
              </p>
              <span className="feature-card-tag" style={{ background: '#e8f5e9', color: '#36b37e' }}>Automation</span>
            </div>

            <div className="feature-card animate-on-scroll">
              <div className="feature-card-icon" style={{ background: '#ffebe6', color: '#de350b' }}>🛡️</div>
              <h3 className="feature-card-title">Safety Guardrails</h3>
              <p className="feature-card-text">
                Real-time validation detects anticoagulant-hemorrhage conflicts, dosage outliers, critical lab values, and missing documentation before discharge.
              </p>
              <span className="feature-card-tag" style={{ background: '#ffebe6', color: '#de350b' }}>Safety</span>
            </div>

            <div className="feature-card animate-on-scroll">
              <div className="feature-card-icon" style={{ background: '#f3e8ff', color: '#6554c0' }}>🔐</div>
              <h3 className="feature-card-title">RBAC & Audit Trail</h3>
              <p className="feature-card-text">
                Role-based access for Physicians, Nurses, and Specialists. Every action is logged with full provenance for medico-legal defensibility.
              </p>
              <span className="feature-card-tag" style={{ background: '#f3e8ff', color: '#6554c0' }}>Compliance</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 11-LAYER ARCHITECTURE PIPELINE ============ */}
      <section id="architecture" className="landing-pipeline">
        <div className="landing-section">
          <div style={{ textAlign: 'center', marginBottom: '48px' }} className="animate-on-scroll">
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <span className="section-label-dot" style={{ background: '#4c9aff' }} />
              System Architecture
            </div>
            <h2 className="section-title">The 11-Layer Clinical Pipeline</h2>
            <p className="section-subtitle" style={{ maxWidth: '600px', margin: '0 auto', color: 'rgba(255,255,255,0.55)' }}>
              An event-centric architecture designed for traceability — every answer links back to source evidence with modality, timestamp, and provenance.
            </p>
          </div>

          <div className="pipeline-flow animate-on-scroll">
            {[
              { num: 1, icon: '📥', label: 'Data Sources' },
              { num: 2, icon: '⚙️', label: 'Ingestion Layer' },
              { num: 3, icon: '🧠', label: 'Clinical Understanding' },
              { num: 4, icon: '💾', label: 'Clinical Memory' },
              { num: 5, icon: '🔍', label: 'Retrieval (RAG)' },
              { num: 6, icon: '🧩', label: 'Context Assembly' },
              { num: 7, icon: '📝', label: 'Narrative Engine' },
              { num: 8, icon: '🖥️', label: 'Application Layer' },
              { num: 9, icon: '🛡️', label: 'Validation & Safety' },
              { num: 10, icon: '👨‍⚕️', label: 'Physician Review' },
              { num: 11, icon: '📤', label: 'Final Outputs' },
            ].map((step) => (
              <div className="pipeline-step" key={step.num}>
                <div className="pipeline-step-num">{step.num}</div>
                <div className="pipeline-step-icon">{step.icon}</div>
                <div className="pipeline-step-label">{step.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMPARISON TABLE ============ */}
      <section id="comparison" className="landing-comparison">
        <div className="landing-section">
          <div style={{ textAlign: 'center', marginBottom: '48px' }} className="animate-on-scroll">
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <span className="section-label-dot" style={{ background: '#36b37e' }} />
              Evolution
            </div>
            <h2 className="section-title">The Evolution of Clinical Documentation</h2>
          </div>

          <div className="animate-on-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Traditional EMR</th>
                  <th>Fragmented AI Tools</th>
                  <th>Medico-Agent</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Data Assembly</td>
                  <td>Retrospective & Manual</td>
                  <td>Semi-Automated (Copy-Paste)</td>
                  <td>✦ Continuous & Automatic</td>
                </tr>
                <tr>
                  <td>Clinical Memory</td>
                  <td>Lost / Fragmented</td>
                  <td>Real-Time but Disconnected</td>
                  <td>✦ Real-Time & Integrated</td>
                </tr>
                <tr>
                  <td>Physician Effort</td>
                  <td>High Burden</td>
                  <td>Medium (App Switching)</td>
                  <td>✦ Minimal (1-Click Output)</td>
                </tr>
                <tr>
                  <td>Medico-Legal Risk</td>
                  <td>High Vulnerability</td>
                  <td>Reduced</td>
                  <td>✦ Ironclad Defensibility</td>
                </tr>
                <tr>
                  <td>Discharge Summaries</td>
                  <td>Hours of manual work</td>
                  <td>Template-assisted</td>
                  <td>✦ Generated in seconds</td>
                </tr>
                <tr>
                  <td>Audit Trail</td>
                  <td>Partial / Manual</td>
                  <td>Basic logging</td>
                  <td>✦ Full provenance tracking</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ============ CASE STUDY ============ */}
      <section className="landing-usecase">
        <div className="landing-section">
          <div style={{ textAlign: 'center', marginBottom: '48px' }} className="animate-on-scroll">
            <div className="section-label" style={{ justifyContent: 'center' }}>
              <span className="section-label-dot" style={{ background: '#0052cc' }} />
              Real-World Validation
            </div>
            <h2 className="section-title">Built Around a Real ICU Admission</h2>
            <p className="section-subtitle" style={{ maxWidth: '560px', margin: '0 auto' }}>
              The platform was developed and validated against actual discharge documentation from a complex pulmonology case.
            </p>
          </div>

          <div className="usecase-card animate-on-scroll">
            <div className="usecase-header">
              <div className="usecase-icon">🫁</div>
              <div className="usecase-meta">
                <h4>Diffuse Alveolar Hemorrhage — ICU Admission</h4>
                <span>Complex multi-system case • Pulmonology + Nephrology + Cardiology</span>
              </div>
            </div>
            <div className="usecase-body">
              <div className="usecase-detail">
                <div className="usecase-detail-icon">🏥</div>
                <div className="usecase-detail-text">
                  <strong>Admission Context</strong>
                  <span>81-year-old male, post-CABG, on anticoagulation, presenting with hemoptysis and bilateral lung infiltrates.</span>
                </div>
              </div>
              <div className="usecase-detail">
                <div className="usecase-detail-icon">🔬</div>
                <div className="usecase-detail-text">
                  <strong>Investigations</strong>
                  <span>HRCT, ANA panel, ANCA, anti-GBM, renal function monitoring, BioFire panel, cultures — all tracked in the clinical thread.</span>
                </div>
              </div>
              <div className="usecase-detail">
                <div className="usecase-detail-icon">💊</div>
                <div className="usecase-detail-text">
                  <strong>Medication Journey</strong>
                  <span>Anticoagulation held → IV methylprednisolone started → oral prednisolone taper on discharge. Full reconciliation tracked.</span>
                </div>
              </div>
              <div className="usecase-detail">
                <div className="usecase-detail-icon">👥</div>
                <div className="usecase-detail-text">
                  <strong>Cross-Consults</strong>
                  <span>Nephrology, Cardiology, and Pulmonology teams — all recommendations captured and woven into the narrative.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TECH STACK STRIP ============ */}
      <div style={{ background: '#ffffff', padding: '40px 0', borderBottom: '1px solid #ebecf0' }}>
        <div className="landing-section">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#5e6c84' }}>
              Powered By
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', opacity: 0.6 }}>
            {['React + TypeScript', 'FastAPI + Python', 'SQLAlchemy', 'Gemini 2.5 Flash', 'SQLite', 'Mock Authentication'].map((tech) => (
              <span key={tech} style={{ fontSize: '0.9rem', fontWeight: 600, color: '#42526e', whiteSpace: 'nowrap' }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============ CTA ============ */}
      <section className="landing-cta">
        <div className="landing-section">
          <div className="cta-box animate-on-scroll">
            <h2 className="cta-title">Ready to Experience Clinical AI?</h2>
            <p className="cta-subtitle">
              Launch the dashboard, select a patient, and see how the Dynamic Clinical Memory works — from admission to discharge.
            </p>
            <div className="cta-actions">
              <button className="cta-btn-primary" onClick={onEnterApp}>
                🚀 Open Clinical Dashboard
              </button>
              <button className="cta-btn-secondary" onClick={() => scrollTo('features')}>
                Explore Features
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-icon">🧠</div>
            <span className="footer-brand-text">Medico-Agent</span>
          </div>
          <ul className="footer-links">
            <li><a href="#problem" onClick={(e) => { e.preventDefault(); scrollTo('problem'); }}>Problem</a></li>
            <li><a href="#solution" onClick={(e) => { e.preventDefault(); scrollTo('solution'); }}>Solution</a></li>
            <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a></li>
            <li><a href="#architecture" onClick={(e) => { e.preventDefault(); scrollTo('architecture'); }}>Architecture</a></li>
          </ul>
          <span className="footer-copy">© 2026 Medico-Agent — AI-Assisted Clinical Documentation Platform</span>
        </div>
      </footer>
    </div>
  );
};
