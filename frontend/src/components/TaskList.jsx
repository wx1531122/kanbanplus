import React from 'react';
import TaskCard from './TaskCard';

const TaskList = ({ tasks, onEditTask }) => {
  if (!tasks || tasks.length === 0) {
    return <p style={{ padding: '10px', color: '#777' }}>No tasks in this stage yet.</p>;
  }

  return (
    <div>
      {tasks.map(task => (
        <TaskCard 
          key={task.id} 
          task={task} 
          onEditTask={onEditTask} 
        />
      ))}
    </div>
  );
};

export default TaskList;
