import React, { useState } from 'react';
import './CommentForm.css'; // We will create this CSS file

const CommentForm = ({ taskId, onCommentAdded }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Comment content cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // onCommentAdded is expected to be an async function that handles the API call
      await onCommentAdded(taskId, content); 
      setContent(''); // Clear input after successful submission
    } catch (err) {
      setError(err.message || 'Failed to add comment. Please try again.');
      console.error("Failed to add comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      {error && <p className="comment-form-error">{error}</p>}
      <textarea
        className="comment-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        rows="3"
        disabled={isSubmitting}
      />
      <button 
        type="submit" 
        className="comment-submit-button"
        disabled={isSubmitting || !content.trim()}
      >
        {isSubmitting ? 'Submitting...' : 'Add Comment'}
      </button>
    </form>
  );
};

export default CommentForm;
