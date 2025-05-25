import React from 'react';
import ActivityLogItem from './ActivityLogItem';
import './ActivityLogList.css'; // We will create this CSS file

const ActivityLogList = ({ activities, loading, error }) => {
  if (loading) {
    return <p className="activity-list-message">Loading activities...</p>;
  }

  if (error) {
    return (
      <p className="activity-list-message activity-list-error">
        Error loading activities: {error}
      </p>
    );
  }

  if (!activities || activities.length === 0) {
    return <p className="activity-list-message">No activities found.</p>;
  }

  return (
    <div className="activity-log-list">
      {activities.map((activity) => (
        <ActivityLogItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
};

export default ActivityLogList;
