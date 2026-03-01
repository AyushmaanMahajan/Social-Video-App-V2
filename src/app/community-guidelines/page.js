import Link from 'next/link';

export const metadata = {
  title: 'Community Guidelines - Serendipity Stream',
};

export default function CommunityGuidelinesPage() {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <header className="legal-header">
          <p className="eyebrow">Serendipity Stream</p>
          <h1>Community Guidelines</h1>
          <p className="legal-meta">Last Updated: March 2026</p>
          <p className="legal-meta">Applies To: All users of Serendipity Stream (Web and Mobile)</p>
        </header>

        <section className="legal-section">
          <p>
            These Community Guidelines are designed to ensure Serendipity Stream remains a safe, respectful, lawful,
            and inclusive platform for all users. They apply to all interactions including profiles, video encounters,
            text messaging, and any media shared on the platform.
          </p>
          <p>
            By using Serendipity Stream, you agree to comply with these guidelines. Violation may result in warnings,
            restrictions, suspension, or permanent account termination.
          </p>
        </section>

        <section className="legal-section">
          <h2>1. Respectful and Lawful Behavior</h2>
          <h3>1.1 Respect Others</h3>
          <ul>
            <li>Treat all users with dignity and courtesy.</li>
            <li>Do not harass, demean, insult, or bully other users in video calls, text chat, or profile content.</li>
          </ul>
          <h3>1.2 No Hate or Discrimination</h3>
          <p>
            Disallowed content includes any form of discrimination or hate speech based on caste, religion, gender,
            sexual orientation, disability, nationality, or any protected characteristic.
          </p>
          <h3>1.3 Compliance with Indian Law</h3>
          <p>By using this platform in India, you agree to obey laws including (but not limited to):</p>
          <ul>
            <li>The Information Technology Act, 2000 and related amendments</li>
            <li>
              Indian Penal Code provisions relating to obscenity, defamation, harassment, and child protection
            </li>
            <li>Any other applicable local laws and regulations</li>
          </ul>
          <p>You may not use this platform for any activity that is unlawful in your jurisdiction.</p>
        </section>

        <section className="legal-section">
          <h2>2. Age and Identity Requirements</h2>
          <h3>2.1 Minimum Age</h3>
          <p>You must be at least 18 years old to create an account and use the platform.</p>
          <h3>2.2 True Identity</h3>
          <ul>
            <li>Use your real identity and authentic information in your profile.</li>
            <li>Do not impersonate others or use deceptive information.</li>
          </ul>
          <h3>2.3 No Misrepresentation</h3>
          <p>Do not mislead other users about your intentions, identity, or affiliation.</p>
        </section>

        <section className="legal-section">
          <h2>3. Appropriate Profile Content</h2>
          <h3>3.1 Photos and Media</h3>
          <p>Allowed:</p>
          <ul>
            <li>Clear, non-sexual, non-violent images of yourself</li>
            <li>Images that represent you truthfully</li>
          </ul>
          <p>Prohibited:</p>
          <ul>
            <li>Nudity, sexually explicit content</li>
            <li>Violent or graphic imagery</li>
            <li>Hate symbols or offensive gestures</li>
          </ul>
          <h3>3.2 Prompts and Bio</h3>
          <p>Your bio, prompts, and interests must:</p>
          <ul>
            <li>Be respectful</li>
            <li>Avoid profanity or explicit language</li>
            <li>Reflect accurate information</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Video Encounters and Mutual Consent</h2>
          <h3>4.1 Consent is Mandatory</h3>
          <ul>
            <li>Video calls require mutual acceptance.</li>
            <li>Do not attempt to pressure or coerce someone into a call.</li>
          </ul>
          <h3>4.2 Appropriate Interaction</h3>
          <p>During video calls, all participants must:</p>
          <ul>
            <li>Avoid offensive language</li>
            <li>Avoid sexually explicit actions</li>
            <li>Refrain from discriminatory conduct</li>
          </ul>
          <p>Violations may be reported and will result in enforcement action.</p>
        </section>

        <section className="legal-section">
          <h2>5. Chat and Messaging Rules</h2>
          <h3>5.1 Mutual Chat Enable</h3>
          <p>Messaging is enabled only when both users have mutually opted in.</p>
          <p>
            Learn more about how chat permissions work in our{' '}
            <Link href="/block-privacy">Block &amp; Privacy Settings</Link> page.
          </p>
          <h3>5.2 Respectful Communication</h3>
          <ul>
            <li>Do not send harassing, threatening, abusive, or sexually explicit messages.</li>
            <li>Do not send spam, promotions, or unsolicited links.</li>
          </ul>
          <h3>5.3 Reporting and Blocking</h3>
          <ul>
            <li>Use the Report feature to flag inappropriate messages.</li>
            <li>Use the Block feature to stop communication with any user.</li>
          </ul>
          <p>
            If you receive messages that violate these guidelines, you can submit a report through our{' '}
            <Link href="/report-user">Report a User</Link> page.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Prohibited Conduct</h2>
          <p>You may not use Serendipity Stream to:</p>
          <ul>
            <li>
              Share content that is unlawful, defamatory, invasive of privacy, or infringing intellectual property
              rights
            </li>
            <li>Engage in stalking, threats of violence, or actual violence</li>
            <li>Publish content that promotes self-harm, suicide, or violence</li>
            <li>Exploit, groom, or engage minors (strict zero tolerance)</li>
          </ul>
          <h3>6.1 No Tolerance for Exploitation</h3>
          <p>
            Any content or conduct involving the exploitation of minors is strictly prohibited and will be reported to
            authorities.
          </p>
          <p>
            If you encounter any of the above violations, please submit a report through our{' '}
            <Link href="/report-user">Report a User</Link> page so our moderation team can review the issue.
          </p>
          <p>
            If you encounter harmful behavior, refer to our{' '}
            <Link href="/community-safety-resources">Community Safety Resources</Link> for support options.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Privacy and Safety</h2>
          <h3>7.1 Respect Privacy</h3>
          <p>
            Do not record, screenshot, or share private video calls or messages without explicit consent of all
            parties.
          </p>
          <h3>7.2 Safety Tools</h3>
          <ul>
            <li>Block/Unblock a User</li>
            <li>
              <Link href="/report-user">Report a User</Link>
            </li>
            <li>Support Request Form</li>
          </ul>
          <p>
            For detailed control over blocking, chat permissions, and profile visibility, visit{' '}
            <Link href="/block-privacy">Block &amp; Privacy Settings</Link>.
          </p>
          <p>
            Use the <Link href="/report-user">Report a User</Link> tool if you feel unsafe or if someone violates
            these guidelines.
          </p>
          <p>
            For additional guidance and emergency resources, visit our{' '}
            <Link href="/community-safety-resources">Community Safety Resources</Link> page.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Reporting and Enforcement</h2>
          <p>
            Reports can be submitted via our <Link href="/report-user">Report a User</Link> page.
          </p>
          <h3>8.1 How to Report</h3>
          <ul>
            <li>Use the Report button on a profile, chat, or video incident</li>
            <li>Provide details of the violation</li>
          </ul>
          <h3>8.2 Enforcement Actions</h3>
          <p>Depending on severity:</p>
          <ul>
            <li>Warning message</li>
            <li>Temporary restriction</li>
            <li>Permanent suspension</li>
            <li>Reporting to law enforcement (if legally required)</li>
          </ul>
          <h3>8.3 No Retaliation</h3>
          <p>Users may not harass or retaliate against someone who has filed a report in good faith.</p>
          <p>
            If you wish to stop interacting with someone without filing a report, use the Block feature described in{' '}
            <Link href="/block-privacy">Block &amp; Privacy Settings</Link>.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Content Moderation</h2>
          <p>Serendipity Stream may:</p>
          <ul>
            <li>Review flagged content</li>
            <li>Use automated tools to detect violations</li>
            <li>Remove content that violates these guidelines</li>
          </ul>
          <p>Moderation decisions are final.</p>
        </section>

        <section className="legal-section">
          <h2>10. Legal Cooperation</h2>
          <p>If required by law enforcement or court order, we may preserve and share your data, including:</p>
          <ul>
            <li>Profile information</li>
            <li>Logs of interactions</li>
            <li>Messages</li>
            <li>Video encounter records</li>
          </ul>
          <p>We comply with applicable Indian laws on data disclosure and cooperation.</p>
        </section>

        <section className="legal-section">
          <h2>11. Changes to Guidelines</h2>
          <p>
            We may update these guidelines from time to time. Users will be notified of major changes.
          </p>
        </section>

        <section className="legal-section">
          <h2>Reference Pages</h2>
          <ul>
            <li>
              <Link href="/report-user">Report a User</Link>
            </li>
            <li>
              <Link href="/block-privacy">Block &amp; Privacy Settings</Link>
            </li>
            <li>
              <Link href="/community-safety-resources">Community Safety Resources</Link>
            </li>
            <li>
              <Link href="/profile?support=1">Support Center</Link>
            </li>
            <li>Grievance Officer and Legal Contact</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
