import { useState } from 'react';
import { api } from '../api.js';

export default function FeedbackModal({ onClose, user, showToast }) {
  const [category, setCategory] = useState('market-fit');
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [marketFitNotes, setMarketFitNotes] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const ratingLabels = {
    1: 'Needs Work / Confusing',
    2: 'Fair / Missing Key Features',
    3: 'Good / Useful Potential',
    4: 'Very Useful / High Value',
    5: 'Must-Have / Essential for our Team!',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!feedbackText.trim() && !marketFitNotes.trim()) {
      setError('Please provide your thoughts or feedback before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.submitFeedback({
        category,
        rating,
        feedbackText: feedbackText.trim(),
        marketFitNotes: marketFitNotes.trim(),
        email: email.trim(),
      });
      setSubmitted(true);
      showToast?.('🎉 Thank you! Your feedback has been received and directly informs our product roadmap.');
    } catch (err) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '94vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 0,
          background: '#F7F5F0',
          borderRadius: '6px',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#14213D',
            color: '#FFFFFF',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>💡</span>
              <h3 style={{ color: '#FFFFFF', fontSize: '17px', margin: 0 }}>
                Share Your Feedback & Ideas
              </h3>
            </div>
            <div style={{ fontSize: '11.5px', color: '#8C9AB5', marginTop: '3px' }}>
              Help us tailor Scopeline to your exact workflow and agency needs.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8C9AB5',
              fontSize: '24px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🙏</div>
            <h3 style={{ fontSize: '18px', color: '#14213D', marginBottom: '8px' }}>
              Thank You for Helping Shape Scopeline!
            </h3>
            <p style={{ fontSize: '13px', color: '#5C6B73', lineHeight: 1.5, maxWidth: '420px', margin: '0 auto 24px' }}>
              We review every piece of feedback to improve product market fit, email ingestion accuracy, and change order workflows.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{ fontSize: '12px', padding: '8px 22px' }}
            >
              Back to App
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
            {error && (
              <div
                style={{
                  background: '#FEE2E2',
                  borderLeft: '4px solid #EF4444',
                  color: '#991B1B',
                  padding: '8px 12px',
                  fontSize: '12px',
                  marginBottom: '14px',
                  borderRadius: '2px',
                }}
              >
                {error}
              </div>
            )}

            {/* Category Selector */}
            <div className="field">
              <label className="field-label">Feedback Focus Area</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'market-fit', label: 'Market Fit & Value' },
                  { id: 'feature', label: 'Feature Request' },
                  { id: 'usability', label: 'Workflow Usability' },
                  { id: 'pricing', label: 'Pricing & ROI' },
                  { id: 'bug', label: 'Bug / Issue' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '8px 10px',
                      border: category === cat.id ? '2px solid #E85D2E' : '1px solid #D8D2C2',
                      background: category === cat.id ? '#FFF5F0' : '#FFFFFF',
                      color: category === cat.id ? '#E85D2E' : '#14213D',
                      fontWeight: category === cat.id ? 700 : 500,
                      fontSize: '11px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Star / NPS Rating */}
            <div className="field" style={{ marginTop: '16px' }}>
              <label className="field-label">Overall Experience & Value</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '26px',
                        cursor: 'pointer',
                        padding: '0 2px',
                        color: star <= rating ? '#E85D2E' : '#D8D2C2',
                        transition: 'transform 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 600,
                    color: '#5C6B73',
                  }}
                >
                  {ratingLabels[rating]}
                </span>
              </div>
            </div>

            {/* Feedback Main Field */}
            <div className="field" style={{ marginTop: '14px' }}>
              <label className="field-label">
                What problem does Scopeline solve best, and what is missing?
              </label>
              <textarea
                rows={3}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. Email ingestion is super convenient. I would love to see direct Jira webhook sync and multi-currency exchange rate adjustments..."
                style={{ fontSize: '13px', lineHeight: 1.4 }}
              />
            </div>

            {/* Market Fit & Indispensability Field */}
            <div className="field">
              <label className="field-label">
                What would make Scopeline an indispensable daily tool for your team?
              </label>
              <textarea
                rows={2}
                value={marketFitNotes}
                onChange={(e) => setMarketFitNotes(e.target.value)}
                placeholder="e.g. Weekly automated digest of unbilled scope sent to PMs, integrations with QuickBooks / Xero..."
                style={{ fontSize: '13px', lineHeight: 1.4 }}
              />
            </div>

            {/* Email Field */}
            <div className="field">
              <label className="field-label">Your Email (for optional follow-up)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>

            {/* Submit Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
                borderTop: '1px solid #D8D2C2',
                paddingTop: '16px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
                style={{ fontSize: '12px', padding: '7px 16px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ fontSize: '12px', padding: '7px 20px', fontWeight: 700 }}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'} &rarr;
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
