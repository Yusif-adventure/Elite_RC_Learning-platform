import type { Page } from "./routes";

interface LegalPageProps {
  onNavigate: (page: Page) => void;
}

export function LegalNavTabs({
  active,
  onNavigate,
}: {
  active: "privacy" | "terms";
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="legal-tabs-wrapper">
      <div className="legal-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={active === "privacy"}
          className={`legal-tab ${active === "privacy" ? "active" : ""}`}
          onClick={() => onNavigate("privacy")}
        >
          Privacy Policy
        </button>
        <button
          role="tab"
          aria-selected={active === "terms"}
          className={`legal-tab ${active === "terms" ? "active" : ""}`}
          onClick={() => onNavigate("terms")}
        >
          Terms of Service
        </button>
      </div>
    </div>
  );
}

export function PrivacyPolicyContent({ onNavigate }: LegalPageProps) {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="legal-hero-inner">
          <button className="crumb" onClick={() => onNavigate("home")}>
            ← Back to home
          </button>
          <span className="eyebrow">YOUR PRIVACY MATTERS</span>
          <h1>Privacy Policy</h1>
          <p className="legal-hero-lead">
            Elite RC is committed to protecting your privacy. This policy explains what information
            we collect when you use the Elite RC Learning Hub, why we collect it, how we safeguard it,
            and your rights over your data.
          </p>
          <div className="legal-meta">
            <span className="badge">EFFECTIVE: NOVEMBER 2026</span>
            <span className="badge">VERSION 1.0</span>
          </div>
          <LegalNavTabs active="privacy" onNavigate={onNavigate} />
        </div>
      </section>

      <section className="legal-body">
        <div className="legal-container">
          <aside className="legal-toc">
            <h3>On this page</h3>
            <nav>
              <a href="#overview">1. Overview & Commitment</a>
              <a href="#information-we-collect">2. Information We Collect</a>
              <a href="#how-we-use-information">3. How We Use Information</a>
              <a href="#data-sharing">4. Sharing & Third Parties</a>
              <a href="#security-storage">5. Security & Data Storage</a>
              <a href="#your-rights">6. Your Rights & Choices</a>
              <a href="#youth-privacy">7. Young Learners & Students</a>
              <a href="#updates">8. Policy Updates</a>
              <a href="#contact">9. Contact & Support</a>
            </nav>
          </aside>

          <article className="legal-content">
            <section id="overview" className="legal-section">
              <h2>1. Overview & Our Commitment</h2>
              <p>
                Elite RC (“we”, “our”, or “us”) builds hands-on learning experiences for radio-controlled
                aircraft, ground vehicles, electronics, robotics, and connected devices across Africa and
                worldwide.
              </p>
              <p>
                We believe that learning engineering should be accessible, empowering, and respectful of your
                personal privacy. We only collect the minimal personal data required to deliver your courses,
                track your learning progress, and maintain the security of our community platform.
              </p>
              <div className="legal-callout">
                <strong>Our Core Promise:</strong> We never sell, rent, or monetize your personal information.
                Your learning data belongs to you and is used solely to enhance your educational experience.
              </div>
            </section>

            <section id="information-we-collect" className="legal-section">
              <h2>2. Information We Collect</h2>
              <p>
                When you interact with the Elite RC Learning Hub, we collect information in the following ways:
              </p>

              <h3>A. Information You Provide to Us</h3>
              <ul>
                <li>
                  <strong>Account Registration:</strong> When you join, we collect your full name, email address,
                  and a password. Your password is cryptographically hashed and never stored in plain text.
                </li>
                <li>
                  <strong>Profile Information:</strong> Any details you choose to add or update in your profile,
                  such as your name or workshop interests.
                </li>
                <li>
                  <strong>Course & Workshop Submissions:</strong> For instructors and contributors, curriculum data,
                  lesson outlines, uploaded documents, slides, and related educational resources.
                </li>
                <li>
                  <strong>Support & Feedback:</strong> Inquiries, bug reports, and suggestions you share via email,
                  in-app feedback forms, or our community channels.
                </li>
              </ul>

              <h3>B. Information Collected Automatically</h3>
              <ul>
                <li>
                  <strong>Lesson & Course Progress:</strong> We record which lessons you open, complete, and bookmark,
                  along with timestamps, so your progress syncs seamlessly across all your devices.
                </li>
                <li>
                  <strong>Technical & Device Data:</strong> Basic browser type, operating system, and device viewport
                  to ensure the platform renders properly on your screen (mobile, tablet, or PC).
                </li>
                <li>
                  <strong>Security & Session Logs:</strong> Standard server and authentication logs (e.g., login attempts,
                  session tokens) to detect unauthorized access and protect user accounts.
                </li>
              </ul>
            </section>

            <section id="how-we-use-information" className="legal-section">
              <h2>3. How We Use Your Information</h2>
              <p>We use the data we collect for purposeful, educational functions, including:</p>
              <ul>
                <li>
                  <strong>Delivering Course Curriculum:</strong> Giving you instant access to video lessons,
                  downloadable slides, diagrams, and project checklists.
                </li>
                <li>
                  <strong>Synchronizing Learning Progress:</strong> Enabling you to start a lesson on your phone and
                  continue on your computer without losing track of your completed modules.
                </li>
                <li>
                  <strong>Account & Security Management:</strong> Verifying identity, sending password reset links,
                  and guarding against spam or malicious activity.
                </li>
                <li>
                  <strong>Platform Improvement:</strong> Analyzing aggregated, anonymized learning trends (e.g., which
                  topics learners find most engaging) to develop better curriculum and workshop content.
                </li>
                <li>
                  <strong>Community Communication:</strong> Sending critical pilot announcements, course release
                  bulletins, or responses to your direct help requests.
                </li>
              </ul>
            </section>

            <section id="data-sharing" className="legal-section">
              <h2>4. Sharing & Third-Party Services</h2>
              <p>
                We do not share your private personal data with third-party advertisers or data brokers.
                We share data strictly with trusted service providers who help us operate the platform:
              </p>
              <ul>
                <li>
                  <strong>Database & Authentication (Supabase):</strong> We use Supabase to securely store encrypted
                  account credentials, profile information, and course progress under strict Row-Level Security (RLS).
                </li>
                <li>
                  <strong>Application Hosting (Vercel):</strong> Our frontend web application is hosted on secure cloud
                  infrastructure providing fast delivery and SSL/TLS encryption.
                </li>
                <li>
                  <strong>Video & Media Delivery (YouTube):</strong> Embedded instructional videos are streamed through
                  YouTube. Interacting with embedded players is subject to standard YouTube/Google privacy terms.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose information only if strictly required by
                  applicable law, court order, or to protect the vital safety of community members.
                </li>
              </ul>
            </section>

            <section id="security-storage" className="legal-section">
              <h2>5. Security & Data Storage</h2>
              <p>
                Security is integral to our platform architecture:
              </p>
              <ul>
                <li>
                  <strong>End-to-End Encryption:</strong> All communications between your browser and our servers are
                  encrypted using modern HTTPS/TLS protocols.
                </li>
                <li>
                  <strong>Row-Level Security (RLS):</strong> Our database employs granular access rules ensuring learners
                  can only read and write their own personal learning progress.
                </li>
                <li>
                  <strong>Credential Protection:</strong> Passwords are never stored in plaintext. Session tokens use
                  secure HTTP standards.
                </li>
                <li>
                  <strong>Data Retention:</strong> We keep your progress and account data as long as your account is
                  active. If you request account closure, your records are safely purged.
                </li>
              </ul>
            </section>

            <section id="your-rights" className="legal-section">
              <h2>6. Your Rights & Choices</h2>
              <p>You have full autonomy over your data:</p>
              <ul>
                <li>
                  <strong>Access & Review:</strong> You can review your profile information and completed lessons
                  anytime directly from your Dashboard and Profile tabs.
                </li>
                <li>
                  <strong>Correction:</strong> You can edit your name or update your password via the Profile page.
                </li>
                <li>
                  <strong>Data Deletion:</strong> You may request the permanent deletion of your account and all
                  associated learning history by sending an email to our support team.
                </li>
                <li>
                  <strong>Opt-Out of Communications:</strong> You may unsubscribe from non-essential emails or community
                  notices at any time.
                </li>
              </ul>
            </section>

            <section id="youth-privacy" className="legal-section">
              <h2>7. Young Learners & Students</h2>
              <p>
                Elite RC celebrates the curiosity of young engineers, students, and hobbyists. We design our educational
                tools to be safe for makers of all ages.
              </p>
              <p>
                We do not knowingly collect personal data beyond what is needed to facilitate learning. We encourage parents,
                guardians, and educators to guide younger builders, especially when undertaking physical workshop
                activities such as soldering or flight testing.
              </p>
            </section>

            <section id="updates" className="legal-section">
              <h2>8. Updates to This Policy</h2>
              <p>
                As the Elite RC Learning Hub expands with new engineering tracks, tools, and community features, we may
                update this Privacy Policy. Any modifications will be posted here with an updated effective date.
                For significant changes, we will notify registered members through an email announcement or in-app notice.
              </p>
            </section>

            <section id="contact" className="legal-section">
              <h2>9. Contact & Support</h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or your personal information,
                our team is here to assist:
              </p>
              <div className="legal-contact-card">
                <div>
                  <strong>Email Support:</strong>
                  <a href="mailto:testathelegacy129@gmail.com">testathelegacy129@gmail.com</a>
                </div>
                <div>
                  <strong>Community Channel:</strong>
                  <a
                    href="https://chat.whatsapp.com/CJUqUROgIGX0t2O4FJjhSG?s=cl&p=a&iam=2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join our WhatsApp Community
                  </a>
                </div>
                <div>
                  <strong>Platform:</strong>
                  <span>Elite RC Learning Hub</span>
                </div>
              </div>
            </section>
          </article>
        </div>
      </section>
    </main>
  );
}

export function TermsOfServiceContent({ onNavigate }: LegalPageProps) {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="legal-hero-inner">
          <button className="crumb" onClick={() => onNavigate("home")}>
            ← Back to home
          </button>
          <span className="eyebrow">COMMUNITY & USE AGREEMENT</span>
          <h1>Terms of Service</h1>
          <p className="legal-hero-lead">
            Welcome to the Elite RC Learning Hub. These terms govern your access to our courses,
            curriculum, workshop guides, and community spaces. By using the platform, you agree
            to these principles.
          </p>
          <div className="legal-meta">
            <span className="badge">EFFECTIVE: NOVEMBER 2026</span>
            <span className="badge">VERSION 1.0</span>
          </div>
          <LegalNavTabs active="terms" onNavigate={onNavigate} />
        </div>
      </section>

      <section className="legal-body">
        <div className="legal-container">
          <aside className="legal-toc">
            <h3>On this page</h3>
            <nav>
              <a href="#acceptance">1. Acceptance of Terms</a>
              <a href="#accounts">2. Accounts & Access</a>
              <a href="#conduct">3. Community Code of Conduct</a>
              <a href="#safety">4. Workshop & Flight Safety</a>
              <a href="#intellectual-property">5. Intellectual Property</a>
              <a href="#content-submissions">6. Member Feedback & Content</a>
              <a href="#disclaimers">7. Disclaimers & Warranties</a>
              <a href="#liability">8. Limitation of Liability</a>
              <a href="#termination">9. Account Termination</a>
              <a href="#modifications">10. Modifications</a>
              <a href="#contact-terms">11. Contact Information</a>
            </nav>
          </aside>

          <article className="legal-content">
            <section id="acceptance" className="legal-section">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By creating an account, accessing courses, or browsing the Elite RC Learning Hub, you agree to comply with
                and be legally bound by these Terms of Service and our Privacy Policy.
              </p>
              <p>
                If you do not agree with any portion of these terms, please do not use the platform.
              </p>
            </section>

            <section id="accounts" className="legal-section">
              <h2>2. Accounts & Access</h2>
              <ul>
                <li>
                  <strong>One Person Per Account:</strong> Each member must register their own individual account. Account
                  sharing is prohibited to preserve personal learning tracking and community integrity.
                </li>
                <li>
                  <strong>Credential Security:</strong> You are responsible for safeguarding your login password. Elite RC
                  staff will never ask you for your password. If you suspect unauthorized access, reset your password
                  immediately.
                </li>
                <li>
                  <strong>Accurate Information:</strong> Please provide a valid email address that you control so you can
                  verify your account and receive course updates.
                </li>
              </ul>
            </section>

            <section id="conduct" className="legal-section">
              <h2>3. Community Code of Conduct</h2>
              <p>
                Elite RC is a collaborative environment built on curiosity, mentorship, and mutual encouragement. Every
                member agrees to uphold our conduct standards:
              </p>
              <ul>
                <li>
                  <strong>Respect & Professionalism:</strong> Treat instructors, peers, and staff with courtesy. We welcome
                  builders of all skill levels, from beginners picking up a transmitter for the first time to master builders.
                </li>
                <li>
                  <strong>Constructive Collaboration:</strong> Share knowledge, offer helpful feedback, and foster a positive
                  learning space.
                </li>
                <li>
                  <strong>Zero Tolerance for Abuse:</strong> Harassment, hate speech, bullying, defamation, and disruptive
                  conduct are strictly prohibited and will lead to immediate account termination.
                </li>
                <li>
                  <strong>Platform Integrity:</strong> Do not attempt to reverse engineer, hack, bypass security mechanisms,
                  flood our systems with automated scripts, or tamper with course data.
                </li>
              </ul>
            </section>

            <section id="safety" className="legal-section">
              <h2>4. Workshop, Electronics & RC Flight Safety Disclaimer</h2>
              <div className="legal-callout warning">
                <strong>CRITICAL SAFETY NOTICE:</strong> Building radio-controlled models involves rotating propellers,
                soldering equipment, electric motors, radio frequencies, and high-energy Lithium Polymer (LiPo) batteries.
                Safety is your first and most vital responsibility.
              </div>
              <p>
                All tutorials, diagrams, schematics, and video instructions provided on Elite RC are strictly for educational
                and informational purposes. When applying any concept in a real workshop or flight field, you agree to:
              </p>
              <ul>
                <li>
                  <strong>Follow LiPo Battery Safety:</strong> Always inspect batteries for swelling or damage, use balanced
                  chargers in fire-resistant containers, never leave charging batteries unattended, and store cells at proper storage voltages.
                </li>
                <li>
                  <strong>Wear Protective Equipment:</strong> Wear safety glasses when soldering, cutting materials, or bench-testing
                  power systems with propellers installed.
                </li>
                <li>
                  <strong>Adhere to Aviation & Radio Regulations:</strong> Fly only in designated, legal open airspaces away from
                  airports, crowds, power lines, and private property. Comply with all local civil aviation authority rules.
                </li>
                <li>
                  <strong>Independent Responsibility:</strong> You alone are responsible for inspecting your equipment, ensuring
                  structural airworthiness, and operating your models safely.
                </li>
              </ul>
            </section>

            <section id="intellectual-property" className="legal-section">
              <h2>5. Intellectual Property & Course Materials</h2>
              <p>
                The curriculum, text, illustrations, slides, video lessons, and branding of Elite RC are protected by intellectual
                property rights:
              </p>
              <ul>
                <li>
                  <strong>Personal Learning License:</strong> We grant you a limited, non-transferable, non-exclusive license
                  to view and download materials strictly for your personal, non-commercial education and project builds.
                </li>
                <li>
                  <strong>Restrictions:</strong> You may not re-publish, sell, redistribute, mirror, or repackage Elite RC
                  materials for commercial training programs without prior written consent from Elite RC leadership.
                </li>
              </ul>
            </section>

            <section id="content-submissions" className="legal-section">
              <h2>6. Member Feedback & Content</h2>
              <p>
                If you submit feedback, suggestions, comments, or project showcases to Elite RC, you grant us the royalty-free
                right to use this feedback to enhance our curriculum, showcase student achievements (with appropriate credit),
                and refine the learning platform.
              </p>
            </section>

            <section id="disclaimers" className="legal-section">
              <h2>7. Disclaimers & Warranties</h2>
              <p>
                The Elite RC Learning Hub and all its contents are provided on an “AS IS” and “AS AVAILABLE” basis without
                warranties of any kind, whether express or implied.
              </p>
              <p>
                While we strive for technical accuracy and excellence in every lesson, we do not warrant that tutorials are
                error-free, that the platform will operate uninterrupted, or that specific models will achieve particular
                aerodynamic performance results.
              </p>
            </section>

            <section id="liability" className="legal-section">
              <h2>8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by applicable law, Elite RC, its founders, instructors, contributors, and
                volunteers shall not be held liable for any direct, indirect, incidental, punitive, or consequential damages
                resulting from:
              </p>
              <ul>
                <li>Physical injury, burns, or workshop accidents occurring during the construction or testing of projects.</li>
                <li>Loss of equipment, model crashes, property damage, or battery malfunctions.</li>
                <li>Inability to access the platform, service outages, or data loss.</li>
              </ul>
            </section>

            <section id="termination" className="legal-section">
              <h2>9. Account Termination</h2>
              <p>
                You may discontinue use of the platform at any time. Elite RC reserves the right to suspend or terminate your
                account access without prior notice if you violate these Terms of Service or engage in conduct detrimental to the
                learning community.
              </p>
            </section>

            <section id="modifications" className="legal-section">
              <h2>10. Modifications to Terms</h2>
              <p>
                We may revise these Terms of Service periodically to reflect platform updates or legal standards. Continued use of
                the platform after modifications indicates your acceptance of the updated terms.
              </p>
            </section>

            <section id="contact-terms" className="legal-section">
              <h2>11. Contact Information</h2>
              <p>
                For questions regarding these Terms of Service or to report a violation, please contact us:
              </p>
              <div className="legal-contact-card">
                <div>
                  <strong>Official Email:</strong>
                  <a href="mailto:testathelegacy129@gmail.com">testathelegacy129@gmail.com</a>
                </div>
                <div>
                  <strong>WhatsApp Community:</strong>
                  <a
                    href="https://chat.whatsapp.com/CJUqUROgIGX0t2O4FJjhSG?s=cl&p=a&iam=2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join our WhatsApp Community
                  </a>
                </div>
              </div>
            </section>
          </article>
        </div>
      </section>
    </main>
  );
}
