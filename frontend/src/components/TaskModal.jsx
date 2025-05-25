import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import TagManager from './TagManager'; // Import TagManager
import './TaskModal.css';

const TaskModal = ({
  task,
  stageId,
  isOpen,
  onClose,
  onSave,
  onTaskUpdated,
}) => {
  // Task state - this will hold the current version of the task, including its tags
  const [currentTask, setCurrentTask] = useState(task);

  // Form fields state (derived from currentTask or initial values)
  const [content, setContent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState(null);

  // Update internal state when the task prop changes (e.g., when opening modal for different tasks)
  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  const fetchComments = useCallback(async () => {
    if (currentTask && currentTask.id && isOpen) {
      setLoadingComments(true);
      setCommentError(null);
      try {
        const response = await apiClient.get(
          `/tasks/${currentTask.id}/comments`,
        );
        setComments(response.data || []);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
        setCommentError(
          err.response?.data?.message || 'Could not load comments.',
        );
      } finally {
        setLoadingComments(false);
      }
    } else {
      setComments([]);
    }
  }, [currentTask, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (currentTask) {
        setContent(currentTask.content || '');
        setDueDate(
          currentTask.due_date ? currentTask.due_date.split('T')[0] : '',
        );
        setPriority(currentTask.priority || 'Medium');
        fetchComments();
      } else {
        // New task
        setContent('');
        setDueDate('');
        setPriority('Medium');
        setComments([]);
        setCurrentTask(null); // Ensure currentTask is null for new tasks
      }
    }
  }, [isOpen, currentTask, fetchComments]);

  if (!isOpen) return null;

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Task content cannot be empty.');
      return;
    }

    const taskDataToSave = {
      content: content.trim(),
      due_date: dueDate || null,
      priority: priority,
      stage_id: task ? task.stage_id : stageId,
    };

    if (task && task.id) {
      taskDataToSave.id = task.id;
    }
    onSave(taskDataToSave); // This is the prop passed from ProjectViewPage for saving task
  };

  const handleAddComment = async (taskId, commentContent) => {
    // This function will be passed to CommentForm
    try {
      await apiClient.post(`/tasks/${taskId}/comments`, {
        content: commentContent,
      });
      fetchComments(); // Re-fetch comments to show the new one
      if (onTaskUpdated) {
        // If ProjectViewPage needs to know task was updated (e.g. activity log changes)
        onTaskUpdated();
      }
    } catch (err) {
      console.error('Failed to add comment via TaskModal:', err);
      // Let CommentForm handle displaying its own error, or re-throw
      throw err;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content task-modal-content">
        {' '}
        {/* Added specific class */}
        <h3>{task ? 'Edit Task' : 'Create New Task'}</h3>
        <form onSubmit={handleTaskSubmit}>
          {/* Task Form Fields */}
          <div className="form-group">
            <label htmlFor="task-content">Content:</label>
            <textarea
              id="task-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="3"
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-due-date">Due Date:</label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="task-priority">Priority:</label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="button-cancel">
              Cancel
            </button>
            <button type="submit" className="button-save">
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
        {/* Comments Section - Only for existing tasks */}
        {task && task.id && (
          <div className="comments-section">
            <h4>Comments</h4>
            {loadingComments && <p>Loading comments...</p>}
            {commentError && <p className="error-message">{commentError}</p>}
            {!loadingComments && !commentError && comments.length === 0 && (
              <p>No comments yet.</p>
            )}
            <div className="comments-list">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
            <CommentForm taskId={task.id} onCommentAdded={handleAddComment} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskModal;
