import React from 'react';
import './CommentItem.css'; // We will create this CSS file

const CommentItem = ({ comment }) => {
  const formatDate = (isoString) => {
    if (!isoString) return 'Date not available';
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Assuming comment object has: id, content, created_at
  // And user information like: user: { id: ..., username: ... } OR commenter_username directly
  // For now, let's try to access comment.user.username, and fallback to user_id or a default.
  // This depends on how the backend Comment.to_dict() is structured.
  // The subtask for backend comments should have included this. If not, this is a point of backend enhancement.
  // Based on ActivityLog.to_dict(), it's likely comment.user.username or comment.commenter.username is available.
  // Let's assume `comment.commenter.username` for now as per `ActivityLog.user_username` which implies `user.username`.
  // The backend model for Comment has `commenter = db.relationship('User')`. So `comment.commenter.username` is plausible.
  // Or, if the backend `to_dict` for Comment was simpler and only included `user_id`, then that's what we'd have.
  // Let's check the `Comment.to_dict()` from backend models.py.
  // It was:
  // def to_dict(self):
  // return {
  // 'id': self.id,
  // 'content': self.content,
  // 'task_id': self.task_id,
  // 'user_id': self.user_id, // This is available
  // 'created_at': self.created_at.isoformat(),
  // 'updated_at': self.updated_at.isoformat()
  // }
  // So, `commenter_username` is NOT directly available. This is a limitation.
  // Backend Comment.to_dict() now includes `commenter_username`.
  const commenterName = comment.commenter_username || `User ID: ${comment.user_id}`; // Fallback if still missing for some reason

  return (
    <div className="comment-item">
      <div className="comment-header">
        <span className="commenter-name">{commenterName}</span>
        <span className="comment-timestamp">{formatDate(comment.created_at)}</span>
      </div>
      <p className="comment-content">{comment.content}</p>
    </div>
  );
};

export default CommentItem;
