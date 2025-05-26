import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';
import './TagManager.css'; // We will create this CSS file

const TagManager = ({ task, onTaskTagsUpdated }) => {
  const [allTags, setAllTags] = useState([]);
  const [newTagName, setNewTagName] = useState('');
  const [loadingAllTags, setLoadingAllTags] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllTags = useCallback(async () => {
    setLoadingAllTags(true);
    try {
      const response = await apiClient.get('/tags');
      setAllTags(response.data || []);
    } catch (err) {
      console.error('Failed to fetch all tags:', err);
      // Non-critical, user can still type tags. Maybe a small error message.
      setError('Could not load suggested tags.');
    } finally {
      setLoadingAllTags(false);
    }
  }, []);

  useEffect(() => {
    fetchAllTags();
  }, [fetchAllTags]);

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    // Prevent adding a tag if it's already on the task (case-insensitive check)
    if (
      task.tags &&
      task.tags.some(
        (tag) => tag.name.toLowerCase() === newTagName.trim().toLowerCase(),
      )
    ) {
      setNewTagName(''); // Clear input
      alert(`Tag "${newTagName.trim()}" is already on this task.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // The backend POST /api/tasks/<task_id>/tags endpoint handles tag creation if it doesn't exist
      // and then associates it. It expects {'tag_name': 'name'} or {'tag_id': id}
      const response = await apiClient.post(`/tasks/${task.id}/tags`, {
        tag_name: newTagName.trim(),
      });
      setNewTagName(''); // Clear input
      if (onTaskTagsUpdated) {
        onTaskTagsUpdated(response.data.tags); // Pass the updated list of tags for the task
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
      setError(err.response?.data?.message || 'Could not add tag.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTag = async (tagIdToRemove) => {
    setError(null);
    // Optimistic UI update can be tricky if backend fails, but good for UX.
    // For now, simple remove and then update from server response.
    try {
      await apiClient.delete(`/tasks/${task.id}/tags/${tagIdToRemove}`);
      // The response from DELETE is 204 No Content. We need to manually update the local task's tags.
      const updatedTags = task.tags.filter((tag) => tag.id !== tagIdToRemove);
      if (onTaskTagsUpdated) {
        onTaskTagsUpdated(updatedTags);
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
      setError(err.response?.data?.message || 'Could not remove tag.');
    }
  };

  if (!task) return null; // Should not happen if used correctly within TaskModal

  return (
    <div className="tag-manager-container">
      <div className="current-tags-list">
        {task.tags && task.tags.length > 0 ? (
          task.tags.map((tag) => (
            <span key={tag.id} className="tag-item">
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="remove-tag-button"
                title={`Remove tag "${tag.name}"`}
              >
                &times; {/* Simple 'x' character */}
              </button>
            </span>
          ))
        ) : (
          <p className="no-tags-message">No tags yet.</p>
        )}
      </div>

      <form onSubmit={handleAddTag} className="add-tag-form">
        <input
          type="text"
          list="all-tags-datalist" // Use datalist for suggestions
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Add a tag..."
          className="tag-input"
          disabled={isSubmitting}
        />
        <datalist id="all-tags-datalist" data-testid="all-tags-datalist">
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
        </datalist>
        <button
          type="submit"
          className="add-tag-button"
          disabled={isSubmitting || !newTagName.trim()}
        >
          {isSubmitting ? 'Adding...' : 'Add Tag'}
        </button>
      </form>
      {error && <p className="tag-manager-error">{error}</p>}
      {loadingAllTags && (
        <p className="tag-manager-loading-tags">Loading available tags...</p>
      )}
    </div>
  );
};

export default TagManager;
