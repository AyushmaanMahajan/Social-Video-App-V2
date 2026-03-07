export const metadata = {
  title: 'Report a User - CNXR',
};

export default function ReportUserPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <p className="eyebrow">CNXR</p>
          <h1>Report a User</h1>
          <p className="legal-meta">Your safety matters.</p>
          <p className="legal-meta">
            If someone violates our Community Guidelines or makes you feel unsafe, you can report them here.
          </p>
        </header>

        <section className="legal-section">
          <p>
            All reports are reviewed carefully. We may take action including warning, restriction, suspension, or
            reporting to authorities where required by law.
          </p>
        </section>

        <section className="legal-section">
          <h2>When Should You Report Someone?</h2>
          <p>You should submit a report if a user:</p>
          <ul>
            <li>Harassed, threatened, or bullied you</li>
            <li>Used hate speech or discriminatory language</li>
            <li>Shared sexually explicit or inappropriate content</li>
            <li>Attempted fraud, impersonation, or deception</li>
            <li>Violated mutual consent during video encounters</li>
            <li>Sent unwanted explicit messages</li>
            <li>Appears to be under 18</li>
            <li>Attempted to record or distribute private interactions</li>
            <li>Engaged in illegal activity</li>
          </ul>
          <p>If you are in immediate danger, contact local authorities.</p>
        </section>

        <section className="legal-section">
          <h2>How to Submit a Report</h2>
          <p>Please provide the following details:</p>

          <h3>1. User Information</h3>
          <ul>
            <li>Username of the person you are reporting</li>
            <li>Link to their profile (if available)</li>
          </ul>

          <h3>2. What Happened?</h3>
          <p>Describe the incident clearly:</p>
          <ul>
            <li>What occurred?</li>
            <li>When did it happen?</li>
            <li>Was it during video or chat?</li>
          </ul>

          <h3>3. Supporting Evidence</h3>
          <p>If possible:</p>
          <ul>
            <li>Screenshots of chat</li>
            <li>Description of video behavior</li>
            <li>Any other relevant context</li>
          </ul>
          <p>Do not upload explicit content unless necessary for the report.</p>
        </section>

        <section className="legal-section">
          <h2>What Happens After You Report</h2>
          <p>Our moderation team reviews the report.</p>
          <p>We may:</p>
          <ul>
            <li>Issue a warning</li>
            <li>Temporarily restrict account access</li>
            <li>Permanently suspend the account</li>
            <li>Report to law enforcement if required under Indian law</li>
          </ul>
          <p>In some cases, we may contact you for clarification.</p>
          <p>We treat all reports confidentially.</p>
        </section>

        <section className="legal-section">
          <h2>False Reporting</h2>
          <p>Submitting knowingly false reports to harass another user may result in account action.</p>
        </section>

        <section className="legal-section">
          <h2>Legal Compliance (India)</h2>
          <p>In accordance with:</p>
          <ul>
            <li>The Information Technology Act, 2000</li>
            <li>IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</li>
          </ul>
          <p>We are required to:</p>
          <ul>
            <li>Address grievances within prescribed timelines</li>
            <li>Preserve records when legally required</li>
            <li>Cooperate with lawful government requests</li>
          </ul>
          <p>We do not disclose reporter identity except where legally mandated.</p>
        </section>

        <section className="legal-section">
          <h2>Block vs Report</h2>
          <p>If someone makes you uncomfortable but has not violated guidelines:</p>
          <ul>
            <li>Use the Block feature to stop communication.</li>
          </ul>
          <p>If the user violated rules:</p>
          <ul>
            <li>Submit a report.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Emergency Situations</h2>
          <p>If you believe someone is at risk of:</p>
          <ul>
            <li>Physical harm</li>
            <li>Sexual exploitation</li>
            <li>Child abuse</li>
          </ul>
          <p>Please immediately contact local law enforcement in addition to submitting a report.</p>
        </section>
      </div>
    </main>
  );
}
