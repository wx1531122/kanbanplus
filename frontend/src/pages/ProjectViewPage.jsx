import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api';
import StageColumn from '../components/StageColumn';
import TaskModal from '../components/TaskModal';
import ActivityLogList from '../components/ActivityLogList';
import './ProjectViewPage.css';

const ProjectViewPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentStageId, setCurrentStageId] = useState(null);
  const [currentView, setCurrentView] = useState('board'); // 'board' or 'activity'

  const fetchProjectData = useCallback(async () => {
    // setLoading(true); // Keep true if separate loading states are not used
    try {
      const response = await apiClient.get(
        `/projects/${projectId}?include_stages=true&include_tasks=true`,
      );
      setProject(response.data);
      setError(null); // Clear main error
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch project data.');
      console.error('Fetch Project Data Error:', err);
    } finally {
      // setLoading(false); // Only set to false if all initial data is loaded
    }
  }, [projectId]);

  const fetchProjectActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      const response = await apiClient.get(`/projects/${projectId}/activities`);
      setActivities(response.data);
      setActivitiesError(null);
    } catch (err) {
      setActivitiesError(err.response?.data?.message || 'Failed to fetch activities.');
      console.error('Fetch Project Activities Error:',err);
    } finally {
      setActivitiesLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true); // Set main loading true at the start of data fetching
    Promise.all([fetchProjectData(), fetchProjectActivities()])
      .catch((e) => {
        // Catch any error not handled by individual fetchers, though they should handle their own
        console.error("Error during initial data fetch:", e);
        setError("Failed to load initial project data or activities."); // Generic error
      })
      .finally(() => {
        setLoading(false); // Set main loading false after all fetches complete
      });
  }, [projectId, fetchProjectData, fetchProjectActivities]);

  const handleOpenModalForCreate = (stageId) => {
    setEditingTask(null);
    setCurrentStageId(stageId);
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = (task) => {
    setEditingTask(task);
    setCurrentStageId(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setCurrentStageId(null);
  };

  // This function will be passed to TaskModal for its onTaskUpdated prop
  const handleTaskUpdated = () => {
    fetchProjectActivities(); // Specifically refresh activities
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask && editingTask.id) {
        await apiClient.put(`/tasks/${editingTask.id}`, taskData);
      } else {
        await apiClient.post(`/stages/${currentStageId}/tasks`, taskData);
      }
      // Refresh both project data (which includes tasks/stages) and activities
      await fetchProjectData(); 
      await fetchProjectActivities();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save task:', err);
      // Consider setting an error state for the modal instead of alert
      alert(`Error: ${err.response?.data?.message || 'Could not save task.'}`);
    }
  };

  if (loading) return <p>Loading project...</p>; // Main loading for project structure
  if (error) return <p style={{ color: 'red' }}>{error}</p>; // Error for project structure
  if (!project) return <p>Project not found.</p>; // If project data is null after load attempt

  return (
    <div>
      <h2>{project.name}</h2>
      <p>{project.description}</p>

      <div className="view-tabs">
        <button
          onClick={() => setCurrentView('board')}
          className={currentView === 'board' ? 'active' : ''}
        >
          Board
        </button>
        <button
          onClick={() => setCurrentView('activity')}
          className={currentView === 'activity' ? 'active' : ''}
        >
          Project Activity
        </button>
      </div>

      {currentView === 'board' && (
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {(project?.stages || []).map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              onAddTask={handleOpenModalForCreate}
              onEditTask={handleOpenModalForEdit}
            />
          ))}
          {/* Potentially a button to add a new stage here */}
        </div>
      )}

      {currentView === 'activity' && (
        <div>
          <h3>Project Activity Log</h3>
          <ActivityLogList
            activities={activities}
            loading={activitiesLoading}
            error={activitiesError}
          />
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        task={editingTask}
        stageId={currentStageId}
        onTaskUpdated={handleTaskUpdated} // Pass the new handler here
      />
    </div>
  );
};

export default ProjectViewPage;
