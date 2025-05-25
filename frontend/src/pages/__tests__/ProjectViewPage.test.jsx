import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import ProjectViewPage from '../ProjectViewPage';
import { AuthProvider } from '../../contexts/AuthContext'; // Assuming ProtectedRoute needs this

// Mock child components to focus on ProjectViewPage logic
vi.mock('../../components/StageColumn', () => ({ 
    default: ({ stage, onAddTask, onEditTask }) => (
        <div data-testid={`stage-column-${stage.id}`}>
            <h3>{stage.name}</h3>
            <button onClick={() => onAddTask(stage.id)}>Add Task to {stage.name}</button>
            {stage.tasks && stage.tasks.map(task => (
                <div key={task.id} data-testid={`task-${task.id}`} onClick={() => onEditTask(task)}>
                    {task.content}
                </div>
            ))}
        </div>
    )
}));
vi.mock('../../components/TaskModal', () => ({
    // eslint-disable-next-line no-unused-vars
    default: ({ isOpen, onClose, onSave, task, stageId, onTaskUpdated }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="task-modal">
                <h4>{task ? `Edit ${task.content}` : `New task for stage ${stageId}`}</h4>
                <button onClick={onClose}>CloseModal</button>
                <button onClick={() => onSave({ content: 'saved' })}>SaveModalTask</button>
            </div>
        );
    }
}));
vi.mock('../../components/ActivityLogList', () => ({
    default: ({ activities, loading, error }) => (
        <div data-testid="activity-log-list">
            {loading && <p>Loading activities...</p>}
            {error && <p>Error: {error}</p>}
            {activities && activities.map(act => <div key={act.id}>{act.description}</div>)}
        </div>
    )
}));


const mockProjectData = {
  id: 1,
  name: 'Test Project Detailed',
  description: 'Detailed description here',
  stages: [
    { 
      id: 1, name: 'To Do', project_id: 1, order: 0, 
      tasks: [{ id: 1, content: 'Task 1 in ToDo', stage_id: 1 }]
    },
    { 
      id: 2, name: 'In Progress', project_id: 1, order: 1, 
      tasks: [{ id: 2, content: 'Task 2 in Progress', stage_id: 2 }]
    },
  ],
};

const mockProjectActivities = [
  { id: 1, description: 'Project activity 1', created_at: new Date().toISOString() },
  { id: 2, description: 'Project activity 2', created_at: new Date().toISOString() },
];

const renderWithRouter = (ui, { route = '/project/1', path = '/project/:projectId' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(
    <AuthProvider> {/* Assuming AuthProvider is needed by underlying components or context */}
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};


describe('ProjectViewPage', () => {
  beforeEach(() => {
    server.resetHandlers();
    server.use(
      http.get('/api/projects/1', () => HttpResponse.json(mockProjectData)),
      http.get('/api/projects/1/activities', () => HttpResponse.json(mockProjectActivities)),
      http.get('/api/projects/error', () => HttpResponse.json({ message: 'Server Error Fetching Project' }, { status: 500 })),
      http.get('/api/projects/notfound', () => HttpResponse.json({ message: 'Project Not Found' }, { status: 404 }))
    );
  });

  it('fetches and renders project details, stages, and tasks', async () => {
    renderWithRouter(<ProjectViewPage />);
    
    expect(await screen.findByRole('heading', { name: 'Test Project Detailed' })).toBeInTheDocument();
    expect(screen.getByText('Detailed description here')).toBeInTheDocument();
    
    // Check for stages (mocked StageColumn)
    expect(screen.getByTestId('stage-column-1')).toHaveTextContent('To Do');
    expect(screen.getByTestId('stage-column-2')).toHaveTextContent('In Progress');
    
    // Check for tasks (mocked StageColumn rendering task content)
    expect(screen.getByTestId('task-1')).toHaveTextContent('Task 1 in ToDo');
    expect(screen.getByTestId('task-2')).toHaveTextContent('Task 2 in Progress');
  });

  it('displays loading state initially', () => {
    // Prevent MSW from responding immediately to see loading state
    server.use(http.get('/api/projects/1', () => new Promise(() => {}), { once: true }));
    renderWithRouter(<ProjectViewPage />);
    expect(screen.getByText('Loading project...')).toBeInTheDocument();
  });

  it('displays error state if project data fetching fails', async () => {
    renderWithRouter(<ProjectViewPage />, { route: '/project/error' });
    expect(await screen.findByText('Server Error Fetching Project')).toBeInTheDocument();
  });
  
  it('displays "Project not found" if project is not found (404)', async () => {
    renderWithRouter(<ProjectViewPage />, { route: '/project/notfound' });
    // The component itself renders "Project not found." if !project after loading.
    // If API returns 404, error state might also be "Project Not Found" from API.
    expect(await screen.findByText('Project Not Found')).toBeInTheDocument();
  });


  it('opens TaskModal for creating a new task', async () => {
    renderWithRouter(<ProjectViewPage />);
    await screen.findByRole('heading', { name: 'Test Project Detailed' }); // Wait for page to load

    // Click "Add Task" in the first stage (mocked StageColumn)
    const addTaskButton = screen.getByRole('button', { name: 'Add Task to To Do' });
    await userEvent.click(addTaskButton);

    const taskModal = await screen.findByTestId('task-modal');
    expect(taskModal).toBeInTheDocument();
    expect(taskModal).toHaveTextContent('New task for stage 1'); // Stage ID 1
  });

  it('opens TaskModal for editing an existing task', async () => {
    renderWithRouter(<ProjectViewPage />);
    await screen.findByRole('heading', { name: 'Test Project Detailed' });

    // Click on the first task (mocked StageColumn task rendering)
    const taskElement = screen.getByTestId('task-1');
    await userEvent.click(taskElement);

    const taskModal = await screen.findByTestId('task-modal');
    expect(taskModal).toBeInTheDocument();
    expect(taskModal).toHaveTextContent('Edit Task 1 in ToDo');
  });

  it('switches to Project Activity tab and displays activities', async () => {
    renderWithRouter(<ProjectViewPage />);
    await screen.findByRole('heading', { name: 'Test Project Detailed' }); // Ensure page loaded

    const activityTabButton = screen.getByRole('button', { name: 'Project Activity' });
    await userEvent.click(activityTabButton);

    expect(await screen.findByText('Project Activity Log')).toBeInTheDocument();
    expect(screen.getByTestId('activity-log-list')).toBeInTheDocument();
    expect(screen.getByText('Project activity 1')).toBeInTheDocument(); // From mocked ActivityLogList
    expect(screen.getByText('Project activity 2')).toBeInTheDocument();
  });

  it('TaskModal onSave triggers data refresh (project data and activities)', async () => {
    let projectFetchCount = 0;
    let activityFetchCount = 0;
    server.use(
      http.get('/api/projects/1', () => {
        projectFetchCount++;
        return HttpResponse.json(mockProjectData);
      }),
      http.get('/api/projects/1/activities', () => {
        activityFetchCount++;
        return HttpResponse.json(mockProjectActivities);
      }),
      http.post('/api/stages/1/tasks', async () => HttpResponse.json({ id: 99, content: 'saved' }, {status: 201}))
    );

    renderWithRouter(<ProjectViewPage />);
    await screen.findByRole('heading', { name: 'Test Project Detailed' });
    expect(projectFetchCount).toBe(1);
    expect(activityFetchCount).toBe(1);

    // Open and "save" modal for new task
    const addTaskButton = screen.getByRole('button', { name: 'Add Task to To Do' });
    await userEvent.click(addTaskButton);
    
    await screen.findByTestId('task-modal'); // Ensure modal is present
    const saveButtonInModal = screen.getByRole('button', { name: 'SaveModalTask' }); // From mock
    await userEvent.click(saveButtonInModal);
    
    // Modal closes (mock doesn't auto-close, but onSave is called)
    // ProjectViewPage's handleSaveTask should call fetchProjectData and fetchProjectActivities
    await waitFor(() => expect(projectFetchCount).toBe(2));
    await waitFor(() => expect(activityFetchCount).toBe(2));
  });
  
  it('TaskModal onTaskUpdated (e.g. after comment) refreshes project activities', async () => {
    let activityFetchCount = 0;
    server.use(
      http.get('/api/projects/1', () => HttpResponse.json(mockProjectData)), // Initial load
      http.get('/api/projects/1/activities', () => { // Initial and refresh
        activityFetchCount++;
        return HttpResponse.json(mockProjectActivities);
      })
    );
    // Mock TaskModal to be able to call onTaskUpdated
    vi.mock('../../components/TaskModal', () => ({ 
      default: ({ isOpen, onClose, onSave, task, stageId, onTaskUpdated }) => {
          if (!isOpen) return null;
          return (
              <div data-testid="task-modal">
                  <h4>{task ? `Edit ${task.content}` : `New task for stage ${stageId}`}</h4>
                  <button onClick={onClose}>CloseModal</button>
                  <button onClick={() => onSave({ content: 'saved' })}>SaveModalTask</button>
                  {task && <button onClick={onTaskUpdated}>TriggerTaskUpdateInModal</button>}
              </div>
          );
      }
    }));


    renderWithRouter(<ProjectViewPage />);
    await screen.findByRole('heading', { name: 'Test Project Detailed' });
    expect(activityFetchCount).toBe(1); // Initial fetch

    // Open modal for editing
    const taskElement = screen.getByTestId('task-1');
    await userEvent.click(taskElement);
    
    await screen.findByTestId('task-modal'); // Ensure modal is present
    const triggerUpdateInModalButton = screen.getByRole('button', { name: 'TriggerTaskUpdateInModal' });
    await userEvent.click(triggerUpdateInModalButton);

    await waitFor(() => expect(activityFetchCount).toBe(2)); // Should re-fetch activities
  });

});
