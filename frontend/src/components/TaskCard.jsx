import React from 'react';

const TaskCard = ({ task, onEditTask }) => {
  const cardStyle = {
    border: '1px solid #eee',
    padding: '10px',
    margin: '8px 0',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const headerStyle = {
    fontSize: '1.1em',
    fontWeight: 'bold',
    marginBottom: '8px',
  };

  const detailStyle = {
    fontSize: '0.9em',
    color: '#555',
    marginBottom: '4px',
  };
  
  const priorityColors = {
    High: 'red',
    Medium: 'orange',
    Low: 'green',
    Default: '#777', // Default or if priority is not set
  };

  const priorityStyle = {
    ...detailStyle,
    color: priorityColors[task.priority] || priorityColors.Default,
    fontWeight: 'bold',
  };


  const formatDate = (isoString) => {
    if (!isoString) return 'Not set';
    // Basic formatting, consider a library like date-fns for more complex needs
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>{task.content}</div>
      {task.assignee && <p style={detailStyle}>Assignee: {task.assignee}</p>}
      <p style={detailStyle}>Due: {formatDate(task.due_date)}</p>
      <p style={priorityStyle}>Priority: {task.priority || 'Medium'}</p>
      {/* Display other task details like subtasks count, comments count if available */}
      {/* task.tags should be an array of tag objects */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ marginTop: '5px' }}>
          {task.tags.map(tag => (
            <span key={tag.id} style={{ 
              backgroundColor: '#e0e0e0', 
              color: '#333',
              padding: '2px 6px', 
              borderRadius: '3px', 
              fontSize: '0.8em',
              marginRight: '4px'
            }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <button 
        onClick={() => onEditTask(task)} 
        style={{ marginTop: '10px', padding: '6px 10px', cursor: 'pointer' }}
      >
        Edit
      </button>
    </div>
  );
};

export default TaskCard;
