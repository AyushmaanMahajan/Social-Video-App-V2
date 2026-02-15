'use client';
import React, { useState } from 'react';

const SUPPORT_TOPICS = [
  'Technical Issue',
  'Account Problem',
  'Report Abuse',
  'Feature Request',
  'Billing Question',
  'Other'
];

function SupportPage({ user, onBack }) {
  const [subject, setSubject] = useState(SUPPORT_TOPICS[0]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;

    setIsSending(true);

    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In real app: send to backend which uses nodemailer
    console.log('Support request:', { subject, message, user: user.email });

    setIsSending(false);
    setSent(true);

    setTimeout(() => {
      setSent(false);
      setMessage('');
      onBack();
    }, 2000);
  };

  return (
    <div className="support-page">
      <div className="support-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Support</h2>
      </div>

      {sent ? (
        <div className="success-message-card">
          <div className="success-icon">✓</div>
          <h3>Message Sent</h3>
          <p>We'll get back to you within 24 hours</p>
        </div>
      ) : (
        <div className="email-composer">
          <div className="email-header">
            <div className="email-field">
              <span className="email-label">To:</span>
              <span className="email-value">support@serendipity.stream</span>
            </div>
            <div className="email-field">
              <span className="email-label">From:</span>
              <span className="email-value">{user.email || 'your@email.com'}</span>
            </div>
            <div className="email-field">
              <span className="email-label">Subject:</span>
              <select
                className="subject-select"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUPPORT_TOPICS.map((topic, index) => (
                  <option key={index} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="email-divider"></div>

          <textarea
            className="email-body"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or question..."
            rows="12"
          />

          <div className="email-footer">
            <div className="footer-hint">
              Please include as much detail as possible
            </div>
            <button
              className="btn-send-email"
              onClick={handleSend}
              disabled={!message.trim() || isSending}
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      )}

      <div className="support-resources">
        <h3 className="resources-title">Quick Help</h3>
        <div className="resource-links">
          <a href="#" className="resource-link">Community Guidelines</a>
          <a href="#" className="resource-link">Safety Tips for Video Calls</a>
          <a href="#" className="resource-link">Privacy Policy</a>
          <a href="#" className="resource-link">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}

export default SupportPage;