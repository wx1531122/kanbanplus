import React from 'react';
import TaskList from './TaskList';
import './StageColumn.css'; // We'll create this for basic styling

const StageColumn = ({ stage, onAddTask, onEditTask }) => {
  return (
    <div className="stage-column">
      <h3 className="stage-title">{stage.name}</h3>
      <TaskList 
        tasks={stage.tasks || []} 
        onEditTask={onEditTask} 
      />
      <button 
        className="add-task-button"
        onClick={() => onAddTask(stage.id)}
      >
        + Add Task
      </button>
    </div>
  );
};

export default StageColumn;
