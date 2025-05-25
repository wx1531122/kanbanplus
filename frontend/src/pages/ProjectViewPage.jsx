import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api';
import StageColumn from '../components/StageColumn'; 
import TaskModal from '../components/TaskModal';
import ActivityLogList from '../components/ActivityLogList'; // Import ActivityLogList
import './ProjectViewPage.css';

const ProjectViewPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [currentStageId, setCurrentStageId] = useState(null);

  const [projectActivities, setProjectActivities] = useState([]);
  const [loadingProjectActivities, setLoadingProjectActivities] = useState(false);
  const [projectActivityError, setProjectActivityError] = useState(null);
  
  // Tab state for ProjectViewPage content (e.g., 'board' or 'activity')
  const [activeProjectViewTab, setActiveProjectViewTab] = useState('board');


  const fetchProjectData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/projects/${projectId}?include_stages=true&include_tasks=true`);
      setProject(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch project data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchProjectActivities = useCallback(async () => {
    setLoadingProjectActivities(true);
    setProjectActivityError(null);
    try {
      const response = await apiClient.get(`/projects/${projectId}/activities`);
      setProjectActivities(response.data || []);
    } catch (err) {
      console.error("Failed to fetch project activities:", err);
      setProjectActivityError(err.response?.data?.message || 'Could not load project activities.');
    } finally {
      setLoadingProjectActivities(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
    fetchProjectActivities(); // Fetch activities when project ID changes
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

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask && editingTask.id) { // Editing existing task
        // If stage_id is part of taskData and different, backend handles move
        await apiClient.put(`/tasks/${editingTask.id}`, taskData);
      } else { // Creating new task
        await apiClient.post(`/stages/${currentStageId}/tasks`, taskData);
      }
      fetchProjectData(); // Re-fetch all data to reflect changes
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save task:", err);
      alert(`Error: ${err.response?.data?.message || 'Could not save task.'}`);
      // Keep modal open for correction if preferred
    }
  };


  if (loading) return <p>Loading project...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!project) return <p>Project not found.</p>;

  return (
    <div>
      <h2>{project.name}</h2>
      <p>{project.description}</p>
      <div style={{ display: 'flex', overflowX: 'auto' }}>
        {stages.map(stage => (
          <StageColumn 
            key={stage.id} 
            stage={stage}
            onAddTask={handleOpenModalForCreate}
            onEditTask={handleOpenModalForEdit}
          />
        ))}
        {/* Potentially a button to add a new stage here */}
      </div>
      
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        task={editingTask}
        stageId={currentStageId} 
      />
    </div>
  );
};

export default ProjectViewPage;
