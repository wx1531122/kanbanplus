import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // Needed because HomePage uses <Link>
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import HomePage from '../HomePage';
import { AuthProvider } from '../../contexts/AuthContext'; // HomePage might be under ProtectedRoute

const mockProjects = [
  { id: 1, name: 'Project X', description: 'First project', created_at: new Date().toISOString() },
  { id: 2, name: 'Project Y', description: 'Second project', created_at: new Date().toISOString() },
];

const renderHomePage = () => {
  return render(
    <AuthProvider> {/* Assuming AuthProvider might be used by HomePage or its children */}
      <MemoryRouter> {/* <Link> components need a Router context */}
        <HomePage />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    server.resetHandlers();
    // Default handler for projects
    server.use(
      http.get('/api/projects', () => HttpResponse.json(mockProjects))
    );
  });

  it('displays loading state initially', () => {
    server.use(http.get('/api/projects', () => new Promise(() => {}), { once: true }));
    renderHomePage();
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('fetches and renders a list of projects', async () => {
    renderHomePage();
    expect(await screen.findByText('Project X')).toBeInTheDocument();
    expect(screen.getByText('First project')).toBeInTheDocument();
    expect(screen.getByText('Project Y')).toBeInTheDocument();
    expect(screen.getByText('Second project')).toBeInTheDocument();
    
    const projectLinks = screen.getAllByRole('link');
    expect(projectLinks[0]).toHaveAttribute('href', '/project/1');
    expect(projectLinks[1]).toHaveAttribute('href', '/project/2');
  });

  it('displays an error message if fetching projects fails', async () => {
    server.use(http.get('/api/projects', () => HttpResponse.json({ message: 'Failed to load projects' }, { status: 500 })));
    renderHomePage();
    expect(await screen.findByText('Failed to load projects')).toBeInTheDocument();
  });

  it('displays "No projects found" message if no projects are available', async () => {
    server.use(http.get('/api/projects', () => HttpResponse.json([])));
    renderHomePage();
    expect(await screen.findByText('No projects found. Get started by creating one!')).toBeInTheDocument();
  });

  it('opens the "Create New Project" modal when the button is clicked', async () => {
    renderHomePage();
    await screen.findByText('Your Projects'); // Wait for initial load

    const createButton = screen.getByRole('button', { name: '+ Create New Project' });
    await userEvent.click(createButton);

    expect(await screen.findByRole('heading', { name: 'Create New Project' })).toBeInTheDocument();
    expect(screen.getByLabelText('Project Name:')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (Optional):')).toBeInTheDocument();
  });

  it('allows creating a new project via the modal', async () => {
    let postCalled = false;
    let newProjectData = {};
    server.use(
      http.post('/api/projects', async ({ request }) => {
        postCalled = true;
        newProjectData = await request.json();
        return HttpResponse.json({ id: 3, ...newProjectData, created_at: new Date().toISOString() }, { status: 201 });
      })
    );
    // Mock GET /projects again for the refetch after creation
    server.use(
        http.get('/api/projects', ({request}) => {
            if(postCalled) { // after project creation
                 return HttpResponse.json([...mockProjects, {id:3, ...newProjectData, created_at: new Date().toISOString()} ]);
            }
            return HttpResponse.json(mockProjects);
        }, {once: false}) // Ensure this can be called multiple times
    );


    renderHomePage();
    await screen.findByText('Your Projects');

    // Open modal
    await userEvent.click(screen.getByRole('button', { name: '+ Create New Project' }));
    await screen.findByRole('heading', { name: 'Create New Project' });

    // Fill form
    await userEvent.type(screen.getByLabelText('Project Name:'), 'New Awesome Project');
    await userEvent.type(screen.getByLabelText('Description (Optional):'), 'Its description.');
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => expect(postCalled).toBe(true));
    expect(newProjectData.name).toBe('New Awesome Project');
    expect(newProjectData.description).toBe('Its description.');

    // Modal should close, and new project should be listed
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Create New Project' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('New Awesome Project')).toBeInTheDocument();
  });

  it('handles error during project creation in modal', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    server.use(
      http.post('/api/projects', () => HttpResponse.json({ message: 'Creation Failed Error' }, { status: 500 }))
    );

    renderHomePage();
    await screen.findByText('Your Projects');
    await userEvent.click(screen.getByRole('button', { name: '+ Create New Project' }));
    await screen.findByRole('heading', { name: 'Create New Project' });

    await userEvent.type(screen.getByLabelText('Project Name:'), 'Fail Project');
    await userEvent.click(screen.getByRole('button', { name: 'Create Project' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error: Creation Failed Error');
    });
    // Modal should still be open
    expect(screen.getByRole('heading', { name: 'Create New Project' })).toBeInTheDocument();
    alertSpy.mockRestore();
  });

  it('closes create project modal on cancel button click', async () => {
    renderHomePage();
    await screen.findByText('Your Projects');

    await userEvent.click(screen.getByRole('button', { name: '+ Create New Project' }));
    expect(await screen.findByRole('heading', { name: 'Create New Project' })).toBeInTheDocument();
    
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Create New Project' })).not.toBeInTheDocument();
    });
  });
});
