import React from 'react';
import './ActivityLogItem.css'; // We will create this CSS file

const ActivityLogItem = ({ activity }) => {
  const formatDate = (isoString) => {
    if (!isoString) return 'Date not available';
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Backend ActivityLog.to_dict() includes:
  // 'id', 'action_type', 'description', 'user_id',
  // 'user_username', 'project_id', 'task_id', 'created_at'

  return (
    <div className="activity-log-item">
      <p className="activity-description">{activity.description}</p>
      <div className="activity-meta">
        {/* user_username is part of the description as per backend, 
            but also available directly if needed for different styling */}
        {/* <span className="activity-user">{activity.user_username}</span> */}
        <span className="activity-timestamp">
          {formatDate(activity.created_at)}
        </span>
      </div>
    </div>
  );
};

export default ActivityLogItem;
