import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import TaskModal from '../TaskModal';
import { AuthProvider } from '../../contexts/AuthContext'; // If needed for user context in sub-components

// Mock sub-components to focus on TaskModal logic, unless deep integration is tested.
// For this test, let's allow CommentForm and TagManager to render somewhat normally
// but mock their API interactions via MSW.
// ActivityLogList is simple enough to not require a specific mock here.

const mockTask = {
  id: 1,
  content: 'Initial Task Content',
  stage_id: 100,
  due_date: '2024-01-15T00:00:00.000Z',
  priority: 'High',
  tags: [{ id: 1, name: 'ExistingTag' }],
  // comments and activities will be fetched via MSW
};

const mockNewTaskStageId = 101;

const renderTaskModal = (props) => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onTaskUpdated: vi.fn(),
    task: null, // Default to create mode
    stageId: mockNewTaskStageId,
    ...props,
  };
  // Wrap with AuthProvider if any child component relies on AuthContext,
  // though for unit tests, direct prop passing or simpler mocks are often preferred.
  return render(
    <AuthProvider>
      <TaskModal {...defaultProps} />
    </AuthProvider>,
  );
};

describe('TaskModal', () => {
  beforeEach(() => {
    server.resetHandlers(); // Reset MSW handlers
    // Setup default handlers. Specific tests can override these.
    server.use(
      http.get('/api/tasks/1/comments', () =>
        HttpResponse.json([
          {
            id: 1,
            content: 'Comment 1',
            commenter_username: 'UserA',
            created_at: new Date().toISOString(),
          },
        ]),
      ),
      http.get('/api/tasks/1/activities', () =>
        HttpResponse.json([
          {
            id: 1,
            description: 'Activity 1',
            created_at: new Date().toISOString(),
          },
        ]),
      ),
      http.get('/api/tags', () =>
        HttpResponse.json([
          { id: 1, name: 'ExistingTag' },
          { id: 2, name: 'GeneralTag' },
        ]),
      ),
    );
  });

  describe('Create Mode', () => {
    it('renders create form with default values', () => {
      renderTaskModal();
      expect(
        screen.getByRole('heading', { name: 'Create New Task' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Content:')).toHaveValue('');
      expect(screen.getByLabelText('Due Date:')).toHaveValue('');
      expect(screen.getByLabelText('Priority:')).toHaveValue('Medium');
      // Comments, Activity, Tags sections should not be visible or be minimal for new task
      expect(
        screen.queryByRole('tab', { name: 'Comments' }),
      ).not.toBeInTheDocument(); // Tabs only for existing tasks
      expect(
        screen.queryByRole('heading', { name: 'Tags' }),
      ).not.toBeInTheDocument(); // TagManager not for new tasks
    });

    it('allows typing and calls onSave with correct data for new task', async () => {
      const onSaveMock = vi.fn();
      renderTaskModal({ onSave: onSaveMock });

      await userEvent.type(
        screen.getByLabelText('Content:'),
        'New Task Content',
      );
      await userEvent.type(screen.getByLabelText('Due Date:'), '2024-02-01');
      await userEvent.selectOptions(screen.getByLabelText('Priority:'), 'Low');

      await userEvent.click(
        screen.getByRole('button', { name: 'Create Task' }),
      );

      expect(onSaveMock).toHaveBeenCalledWith({
        content: 'New Task Content',
        due_date: '2024-02-01',
        priority: 'Low',
        stage_id: mockNewTaskStageId,
      });
    });
  });

  describe('Edit Mode', () => {
    it('renders edit form populated with task data', async () => {
      renderTaskModal({ task: mockTask });
      expect(
        screen.getByRole('heading', { name: 'Edit Task' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Content:')).toHaveValue(mockTask.content);
      expect(screen.getByLabelText('Due Date:')).toHaveValue('2024-01-15');
      expect(screen.getByLabelText('Priority:')).toHaveValue(mockTask.priority);

      // Tabs should be visible
      expect(
        screen.getByRole('button', { name: 'Details' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Comments' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Activity' }),
      ).toBeInTheDocument();
    });

    it('calls onSave with updated data for existing task', async () => {
      const onSaveMock = vi.fn();
      renderTaskModal({ task: mockTask, onSave: onSaveMock });

      await userEvent.clear(screen.getByLabelText('Content:'));
      await userEvent.type(
        screen.getByLabelText('Content:'),
        'Updated Content',
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Save Changes' }),
      );

      expect(onSaveMock).toHaveBeenCalledWith({
        id: mockTask.id,
        content: 'Updated Content',
        due_date: '2024-01-15', // Original, not changed in this interaction
        priority: 'High', // Original
        stage_id: mockTask.stage_id,
      });
    });

    it('switches tabs and loads content (Comments)', async () => {
      renderTaskModal({ task: mockTask });
      await userEvent.click(screen.getByRole('button', { name: 'Comments' }));

      expect(await screen.findByText('Comments')).toBeInTheDocument(); // Section heading
      expect(await screen.findByText('Comment 1')).toBeInTheDocument(); // From MSW mock
      expect(
        screen.getByPlaceholderText('Write a comment...'),
      ).toBeInTheDocument();
    });

    it('switches tabs and loads content (Activity)', async () => {
      renderTaskModal({ task: mockTask });
      await userEvent.click(screen.getByRole('button', { name: 'Activity' }));

      expect(await screen.findByText('Task Activity')).toBeInTheDocument(); // Section heading
      expect(await screen.findByText('Activity 1')).toBeInTheDocument(); // From MSW mock
    });

    it('integrates TagManager correctly in Details tab', async () => {
      renderTaskModal({ task: mockTask });
      // Details tab is active by default
      expect(await screen.findByText('Tags')).toBeInTheDocument(); // TagManager section heading
      expect(screen.getByText('ExistingTag')).toBeInTheDocument(); // Tag from mockTask
      expect(screen.getByPlaceholderText('Add a tag...')).toBeInTheDocument();
    });

    it('adding a comment calls API and refreshes comments & activities', async () => {
      const onTaskUpdatedMock = vi.fn();
      let commentPostCalled = false;
      let activityFetchAfterComment = false;

      server.use(
        http.post('/api/tasks/1/comments', async ({ request }) => {
          commentPostCalled = true;
          const { content } = await request.json();
          return HttpResponse.json(
            {
              id: 3,
              content,
              commenter_username: 'TestUser',
              created_at: new Date().toISOString(),
            },
            { status: 201 },
          );
        }),
        // Override GET comments to check for refresh
        http.get('/api/tasks/1/comments', () => {
          if (commentPostCalled) {
            // After POST, return new list
            return HttpResponse.json([
              {
                id: 1,
                content: 'Comment 1',
                commenter_username: 'UserA',
                created_at: new Date().toISOString(),
              },
              {
                id: 3,
                content: 'Newly added comment',
                commenter_username: 'TestUser',
                created_at: new Date().toISOString(),
              },
            ]);
          }
          return HttpResponse.json([
            {
              id: 1,
              content: 'Comment 1',
              commenter_username: 'UserA',
              created_at: new Date().toISOString(),
            },
          ]);
        }),
        // Override GET activities to check for refresh
        http.get('/api/tasks/1/activities', () => {
          if (commentPostCalled) activityFetchAfterComment = true;
          return HttpResponse.json([
            {
              id: 1,
              description: 'Activity 1',
              created_at: new Date().toISOString(),
            },
          ]);
        }),
      );

      renderTaskModal({ task: mockTask, onTaskUpdated: onTaskUpdatedMock });
      await userEvent.click(screen.getByRole('button', { name: 'Comments' }));

      const commentTextarea = screen.getByPlaceholderText('Write a comment...');
      await userEvent.type(commentTextarea, 'Newly added comment');
      await userEvent.click(
        screen.getByRole('button', { name: 'Add Comment' }),
      );

      await waitFor(() => expect(commentPostCalled).toBe(true));
      expect(
        await screen.findByText('Newly added comment'),
      ).toBeInTheDocument();
      expect(onTaskUpdatedMock).toHaveBeenCalled();
      await waitFor(() => expect(activityFetchAfterComment).toBe(true));
    });
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const onCloseMock = vi.fn();
    renderTaskModal({ onClose: onCloseMock });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
