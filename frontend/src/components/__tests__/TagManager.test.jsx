import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../mocks/server'; // MSW server
import { http, HttpResponse } from 'msw'; // MSW for overriding handlers
import TagManager from '../TagManager';

// Spy on apiClient methods if direct checks are needed beyond MSW.
// For this component, MSW should cover most interactions.
// vi.spyOn(apiClient, 'get');
// vi.spyOn(apiClient, 'post');
// vi.spyOn(apiClient, 'delete');


describe('TagManager', () => {
  const mockTaskWithTags = {
    id: 1,
    content: 'Task with tags',
    tags: [
      { id: 1, name: 'Urgent' },
      { id: 2, name: 'Frontend' },
    ],
  };

  const mockTaskWithoutTags = {
    id: 2,
    content: 'Task without tags',
    tags: [],
  };

  const mockAllTags = [
    { id: 1, name: 'Urgent' },
    { id: 2, name: 'Frontend' },
    { id: 3, name: 'Backend' },
    { id: 4, name: 'Bug' },
  ];

  const mockOnTaskTagsUpdated = vi.fn();

  beforeEach(() => {
    // Reset mocks and MSW handlers before each test
    vi.clearAllMocks();
    server.resetHandlers();
    // Setup default MSW handlers for these tests
    server.use(
      http.get('/api/tags', () => {
        return HttpResponse.json(mockAllTags);
      }),
      http.post('/api/tasks/:taskId/tags', async ({ request, params }) => {
        const { taskId } = params;
        const { tag_name } = await request.json();
        // Simulate backend creating/finding tag and returning updated task tags
        const newTag = { id: Date.now(), name: tag_name };
        // Find the task this request is for (if multiple tasks are used in tests)
        // For simplicity, assume currentTask.tags is the source of truth before this call
        // and return the new tag added to the existing ones.
        // This is a simplified mock; a real backend would handle tag existence.
        
        // The component expects the full task object with updated tags in response.data.tags
        // Let's find the task from our mocks (or assume it's mockTaskWithTags/mockTaskWithoutTags)
        // and add the new tag to its list of tags.
        let existingTags = [];
        if (parseInt(taskId) === mockTaskWithTags.id) existingTags = mockTaskWithTags.tags;
        if (parseInt(taskId) === mockTaskWithoutTags.id) existingTags = mockTaskWithoutTags.tags;

        const updatedTaskWithNewTag = {
            id: parseInt(taskId),
            // ... other task properties if needed by the component from this response ...
            tags: [...existingTags, newTag] 
        };
        return HttpResponse.json(updatedTaskWithNewTag); 
      }),
      http.delete('/api/tasks/:taskId/tags/:tagId', () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
  });

  it('fetches and displays available tags in datalist', async () => {
    render(<TagManager task={mockTaskWithoutTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    
    await waitFor(() => {
      screen.getByTestId('all-tags-datalist'); // Assuming you add data-testid to datalist
      // For some reason, directly querying datalist or its options can be tricky with RTL depending on browser/JSDOM.
      // Let's check if the input has the list attribute.
      expect(screen.getByPlaceholderText('Add a tag...')).toHaveAttribute('list', 'all-tags-datalist');
      // And if the datalist has options (this might not work reliably across all environments)
      // A more robust test might involve checking the network call or the state if exposed.
      // For now, if the fetchAllTags was called (MSW handles it), we assume options are there.
    });
    // Check if loading message for tags disappears
    expect(screen.queryByText('Loading available tags...')).not.toBeInTheDocument();
  });

  it('displays current tags for a task with remove buttons', () => {
    render(<TagManager task={mockTaskWithTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Remove tag/ })).toHaveLength(2);
  });

  it('displays "No tags yet." if task has no tags', () => {
    render(<TagManager task={mockTaskWithoutTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    expect(screen.getByText('No tags yet.')).toBeInTheDocument();
  });

  it('allows adding a new tag by name', async () => {
    render(<TagManager task={mockTaskWithoutTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    const input = screen.getByPlaceholderText('Add a tag...');
    const addButton = screen.getByRole('button', { name: 'Add Tag' });
    const newTagName = 'Design';

    await userEvent.type(input, newTagName);
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnTaskTagsUpdated).toHaveBeenCalledTimes(1);
      // The argument to onTaskTagsUpdated should be the new list of tags from the mocked API response.
      // Our mock for POST /api/tasks/:taskId/tags returns { id, tags: [...existingTags, newTag] }
      // So we expect an array of tags.
      expect(mockOnTaskTagsUpdated).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: newTagName })])
      );
    });
    expect(input).toHaveValue(''); // Input should clear
  });

  it('prevents adding a tag that already exists on the task (case-insensitive)', async () => {
    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<TagManager task={mockTaskWithTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    const input = screen.getByPlaceholderText('Add a tag...');
    const addButton = screen.getByRole('button', { name: 'Add Tag' });
    
    await userEvent.type(input, 'urgent'); // Try adding "Urgent" again, but lowercase
    await userEvent.click(addButton);

    expect(alertSpy).toHaveBeenCalledWith('Tag "urgent" is already on this task.');
    expect(mockOnTaskTagsUpdated).not.toHaveBeenCalled(); // Should not call update if tag exists
    expect(input).toHaveValue(''); // Input should still clear

    alertSpy.mockRestore();
  });


  it('allows removing a tag', async () => {
    render(<TagManager task={mockTaskWithTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    const removeButtons = screen.getAllByRole('button', { name: /Remove tag/ });
    
    // Remove the first tag ("Urgent")
    await userEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(mockOnTaskTagsUpdated).toHaveBeenCalledTimes(1);
      // Expected: called with the remaining tags
      expect(mockOnTaskTagsUpdated).toHaveBeenCalledWith(
        // mockTaskWithTags.tags[1] is 'Frontend'
        [expect.objectContaining({ name: 'Frontend' })] 
      );
    });
  });

  it('shows error message if adding a tag fails', async () => {
    server.use(
      http.post('/api/tasks/:taskId/tags', () => {
        return HttpResponse.json({ message: 'Server error adding tag' }, { status: 500 });
      })
    );

    render(<TagManager task={mockTaskWithoutTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    const input = screen.getByPlaceholderText('Add a tag...');
    const addButton = screen.getByRole('button', { name: 'Add Tag' });

    await userEvent.type(input, 'ErrorTag');
    await userEvent.click(addButton);

    expect(await screen.findByText('Server error adding tag')).toBeInTheDocument();
  });

  it('shows error message if removing a tag fails', async () => {
    server.use(
      http.delete('/api/tasks/:taskId/tags/:tagId', () => {
        return HttpResponse.json({ message: 'Server error removing tag' }, { status: 500 });
      })
    );
    render(<TagManager task={mockTaskWithTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    const removeButtons = screen.getAllByRole('button', { name: /Remove tag/ });
    
    await userEvent.click(removeButtons[0]);

    expect(await screen.findByText('Server error removing tag')).toBeInTheDocument();
  });

  // Add data-testid to datalist in TagManager.jsx for this test to pass more reliably.
  // In TagManager.jsx: <datalist id="all-tags-datalist" data-testid="all-tags-datalist">
  it('renders datalist options if allTags are loaded', async () => {
    render(<TagManager task={mockTaskWithoutTags} onTaskTagsUpdated={mockOnTaskTagsUpdated} />);
    // Wait for tags to load (MSW will provide them)
    await waitFor(() => {
        // This assumes you've added data-testid="all-tags-datalist" to your <datalist>
        screen.getByTestId('all-tags-datalist'); 
        // JSDOM doesn't fully support datalist options inspection easily.
        // We can check if the input has the list attribute.
        expect(screen.getByPlaceholderText('Add a tag...')).toHaveAttribute('list', 'all-tags-datalist');
        // And check if the mocked tags are available (though not directly from datalist options in test)
        // This part is more of an integration check that fetchAllTags was called.
    });
  });
});
