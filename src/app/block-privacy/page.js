export const metadata = {
  title: 'Block & Privacy Settings - Serendipity Stream',
};

export default function BlockPrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <p className="eyebrow">Serendipity Stream</p>
          <h1>Block &amp; Privacy Settings</h1>
          <p className="legal-meta">
            Your privacy and safety are fundamental. This page explains how you can control who interacts with you and
            how your information is used.
          </p>
        </header>

        <section className="legal-section">
          <h2>1. Blocking a User</h2>
          <p>
            If you feel uncomfortable, unsafe, or simply do not wish to interact with someone, you may block them at
            any time.
          </p>
          <p>What Happens When You Block Someone:</p>
          <p>They can no longer:</p>
          <ul>
            <li>See your profile</li>
            <li>Appear in your encounter queue</li>
            <li>Start video calls with you</li>
            <li>Send you messages</li>
          </ul>
          <ul>
            <li>Any ongoing interaction is immediately terminated.</li>
            <li>The blocked user is not notified that they have been blocked.</li>
            <li>Blocking is permanent unless you manually unblock them.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. Unblocking a User</h2>
          <p>You can manage blocked users in your Settings panel.</p>
          <p>To unblock:</p>
          <ul>
            <li>Go to Settings -&gt; Blocked Users</li>
            <li>Select the user</li>
            <li>Click "Unblock"</li>
          </ul>
          <p>After unblocking:</p>
          <ul>
            <li>The user may appear again in encounters.</li>
            <li>Messaging will require mutual re-enablement.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Chat Control (Mutual Consent Required)</h2>
          <p>Messaging on Serendipity Stream is based on mutual opt-in.</p>
          <p>Chat works only when:</p>
          <p>You enable chat for a user AND that user enables chat for you</p>
          <p>If either party disables chat:</p>
          <ul>
            <li>Messaging immediately stops.</li>
            <li>Message input becomes disabled.</li>
          </ul>
          <p>This ensures conversations happen only when both parties consent.</p>
        </section>

        <section className="legal-section">
          <h2>4. Video Interaction Privacy</h2>
          <p>You control when you appear on video.</p>
          <p>Your rights:</p>
          <ul>
            <li>You must manually accept a video encounter.</li>
            <li>You may leave a call at any time.</li>
            <li>You may report or block a user during or after a call.</li>
            <li>Recording video calls without consent is strictly prohibited.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Profile Visibility</h2>
          <p>Your profile may be visible to:</p>
          <ul>
            <li>Users who encounter you in the rotation</li>
            <li>Users you have interacted with</li>
          </ul>
          <p>You may update or edit your profile at any time.</p>
        </section>

        <section className="legal-section">
          <h2>6. Data Usage &amp; Storage</h2>
          <p>We collect limited information necessary to operate the platform:</p>
          <ul>
            <li>Account details</li>
            <li>Interaction logs</li>
            <li>Message history (if chat is mutually enabled)</li>
            <li>Video call metadata (not recordings)</li>
          </ul>
          <p>We do not record video calls.</p>
          <p>Data is stored securely in accordance with applicable Indian law.</p>
        </section>

        <section className="legal-section">
          <h2>7. Reporting vs Blocking</h2>
          <p>Use Block when:</p>
          <ul>
            <li>You want to stop interacting with someone.</li>
          </ul>
          <p>Use Report when:</p>
          <ul>
            <li>A user violates our Community Guidelines.</li>
          </ul>
          <p>Blocking does not automatically trigger a report.</p>
        </section>

        <section className="legal-section">
          <h2>8. Safety Tips</h2>
          <ul>
            <li>Never share personal contact details publicly.</li>
            <li>Avoid sharing financial information.</li>
            <li>Leave the call immediately if you feel unsafe.</li>
            <li>Use the report function if necessary.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>9. Legal Compliance (India)</h2>
          <p>We comply with:</p>
          <ul>
            <li>Information Technology Act, 2000</li>
            <li>IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</li>
          </ul>
          <p>
            Users may request data deletion or raise grievances through our official grievance mechanism.
          </p>
        </section>
      </div>
    </main>
  );
}
