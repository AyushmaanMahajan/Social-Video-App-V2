import Link from 'next/link';

export const metadata = {
  title: 'Community Safety Resources - Serendipity Stream',
};

export default function CommunitySafetyResourcesPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <p className="eyebrow">Serendipity Stream</p>
          <h1>Community Safety Resources</h1>
        </header>

        <section className="legal-section">
          <p>
            Your safety is our priority. While we provide tools to report and block users, we also encourage proactive
            safety practices. This page outlines important guidance and external support resources, particularly for
            users in India.
          </p>
        </section>

        <section className="legal-section">
          <h2>1. Personal Safety Guidelines</h2>
          <h3>Protect Your Identity</h3>
          <ul>
            <li>Do not share personal contact information (phone number, address, workplace, financial details).</li>
            <li>Avoid sharing sensitive documents or ID images.</li>
            <li>Be cautious when moving conversations off-platform.</li>
          </ul>
          <h3>During Video Calls</h3>
          <ul>
            <li>Participate only when comfortable.</li>
            <li>End the call immediately if you feel unsafe.</li>
            <li>Do not tolerate harassment, coercion, or inappropriate behavior.</li>
            <li>Use the Block or Report features when necessary.</li>
          </ul>
          <h3>Financial Safety</h3>
          <ul>
            <li>Never send money to someone you met through the platform.</li>
            <li>Do not share OTPs, banking credentials, or payment information.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. Online Harassment and Abuse</h2>
          <p>If you experience harassment:</p>
          <ul>
            <li>Document the incident (date, time, screenshots if applicable).</li>
            <li>Use the Report feature within the app.</li>
            <li>Block the user to prevent further contact.</li>
          </ul>
          <p>Persistent harassment may also be reported to local authorities under applicable Indian laws.</p>
        </section>

        <section className="legal-section">
          <h2>3. Sexual Exploitation and Child Safety</h2>
          <p>Serendipity Stream has zero tolerance for:</p>
          <ul>
            <li>Grooming</li>
            <li>Exploitation</li>
            <li>Sexual content involving minors</li>
          </ul>
          <p>If you suspect child exploitation:</p>
          <ul>
            <li>Report immediately through the app.</li>
            <li>
              You may also contact the Cyber Crime Portal (India):{' '}
              <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">
                cybercrime.gov.in
              </a>
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Emergency Support (India)</h2>
          <p>If you feel physically threatened or unsafe:</p>
          <ul>
            <li>Police Emergency: 100</li>
            <li>Women&apos;s Helpline: 181</li>
            <li>National Cyber Crime Helpline: 1930</li>
            <li>Childline: 1098</li>
          </ul>
          <p>If you are outside India, contact your local emergency services.</p>
        </section>

        <section className="legal-section">
          <h2>5. Mental Health and Crisis Support</h2>
          <p>If you are feeling overwhelmed, distressed, or unsafe:</p>
          <ul>
            <li>Kiran Mental Health Helpline (India): 1800-599-0019</li>
            <li>AASRA Suicide Prevention Helpline: +91-9820466726</li>
          </ul>
          <p>If in immediate danger, contact emergency services.</p>
        </section>

        <section className="legal-section">
          <h2>6. Privacy and Digital Safety</h2>
          <ul>
            <li>Use strong passwords.</li>
            <li>Enable two-factor authentication if available.</li>
            <li>Log out on shared devices.</li>
            <li>Regularly review privacy settings.</li>
          </ul>
          <p>
            We do not record video calls. However, if you believe someone has recorded you without consent, report
            immediately.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Legal Rights (India)</h2>
          <p>Under Indian law, you have the right to:</p>
          <ul>
            <li>File a police complaint for harassment or abuse.</li>
            <li>Seek protection under the Information Technology Act, 2000.</li>
            <li>Request removal of unlawful content.</li>
          </ul>
          <p>Serendipity Stream may cooperate with lawful requests from authorities where required.</p>
        </section>

        <section className="legal-section">
          <h2>8. When to Use Platform Tools</h2>
          <div className="legal-table-wrap">
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Situation</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mild discomfort</td>
                  <td>Block user</td>
                </tr>
                <tr>
                  <td>Harassment or rule violation</td>
                  <td>Report user</td>
                </tr>
                <tr>
                  <td>Immediate physical danger</td>
                  <td>Contact emergency services</td>
                </tr>
                <tr>
                  <td>Fraud attempt</td>
                  <td>Report and do not share financial info</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="legal-section">
          <h2>Related Safety Pages</h2>
          <ul>
            <li>
              <Link href="/report-user">Report a User</Link>
            </li>
            <li>
              <Link href="/block-privacy">Block and Privacy Settings</Link>
            </li>
            <li>
              <Link href="/profile?support=1">Support Center</Link>
            </li>
            <li>
              <Link href="/community-guidelines">Community Guidelines</Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
