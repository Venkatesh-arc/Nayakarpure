import { useState } from 'react';
import './CancellationFeedback.css';

export default function CancellationFeedback({ orderId, orderNumber, onSubmit, onCancel, loading }) {
  const [rating, setRating] = useState(0);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);

  const reasons = [
    'Changed my mind',
    'Product too expensive',
    'Found better price elsewhere',
    'Delivery time too long',
    'Quality concerns',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    if (!reason) {
      alert('Please select a reason');
      return;
    }

    try {
      await onSubmit({
        orderId,
        rating,
        reason,
        feedback
      });
      setShowThankYou(true);
      setTimeout(() => {
        onCancel();
      }, 3000);
    } catch (err) {
      alert('Error submitting feedback. Please try again.');
    }
  };

  if (showThankYou) {
    return (
      <div className="feedback-overlay" onClick={onCancel}>
        <div className="feedback-modal card" onClick={(e) => e.stopPropagation()}>
          <div className="thank-you-message">
            <div className="thank-you-icon">✓</div>
            <h2>Thank You!</h2>
            <p>Thank you for your feedback.</p>
            <p className="thank-you-subtitle">We will get back to you soon.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-overlay" onClick={onCancel}>
      <div className="feedback-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-header">
          <h2>Order Cancellation Feedback</h2>
          <button type="button" className="feedback-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="feedback-section">
            <label>How would you rate your experience?</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${rating >= star ? 'active' : ''}`}
                  onClick={() => setRating(star)}
                  title={star}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="feedback-section">
            <label htmlFor="reason">Why are you cancelling? *</label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            >
              <option value="">Select a reason</option>
              {reasons.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="feedback-section">
            <label htmlFor="feedback">Additional feedback (optional)</label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Help us improve..."
              rows="4"
            />
          </div>

          <div className="feedback-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit & Cancel Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
