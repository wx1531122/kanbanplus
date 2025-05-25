import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import './HomePage.css'; // Create this for styling

const HomePage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/projects');
      setProjects(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('Project name cannot be empty.');
      return;
    }
    try {
      await apiClient.post('/projects', {
        name: newProjectName,
        description: newProjectDescription,
      });
      // Add new project to the list locally or re-fetch
      // setProjects(prevProjects => [...prevProjects, response.data]);
      fetchProjects(); // Re-fetch to get the latest list including the new one
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (err) {
      console.error('Failed to create project:', err);
      alert(
        `Error: ${err.response?.data?.message || 'Could not create project.'}`,
      );
    }
  };

  if (loading) return <p className="loading-message">Loading projects...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="home-page-container">
      <div className="home-page-header">
        <h2>Your Projects</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="create-project-button"
        >
          + Create New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <p>No projects found. Get started by creating one!</p>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.id} className="project-list-item">
              <Link to={`/project/${project.id}`} className="project-link">
                <h3 className="project-name">{project.name}</h3>
                <p className="project-description">
                  {project.description || 'No description'}
                </p>
                <span className="project-created-at">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isCreateModalOpen && (
        <div className="modal-overlay">
          {' '}
          {/* Reusing modal styles concept from TaskModal */}
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3>Create New Project</h3>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label htmlFor="project-name">Project Name:</label>
                <input
                  id="project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="project-description">
                  Description (Optional):
                </label>
                <textarea
                  id="project-description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="button-cancel"
                >
                  Cancel
                </button>
                <button type="submit" className="button-save">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
