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
      // Comments, Activity, Tags sections are not part of the create new task view as per TaskModal.jsx
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

      // As per TaskModal.jsx, Comments section (<h4>Comments</h4>) is directly visible in edit mode
      expect(
        screen.getByRole('heading', { name: 'Comments' }),
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

    // Removed tests for tab switching ('switches tabs and loads content (Comments)',
    // 'switches tabs and loads content (Activity)') and for TagManager
    // ('integrates TagManager correctly in Details tab') as TaskModal.jsx does not have tabs or TagManager.

    it('adding a comment calls API and refreshes comments', async () => {
      const onTaskUpdatedMock = vi.fn();
      let commentPostCalled = false;
      // activityFetchAfterComment is removed as ActivityLog is not part of this modal.

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
          // Use req to avoid unused var warning
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
        // No need to mock /api/tasks/1/activities if not fetched by this component
      );

      renderTaskModal({ task: mockTask, onTaskUpdated: onTaskUpdatedMock });
      // No need to click a "Comments" tab as it's directly visible.

      // Verify initial comments are loaded
      expect(await screen.findByText('Comment 1')).toBeInTheDocument();

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
      // No check for activityFetchAfterComment
    });
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const onCloseMock = vi.fn();
    renderTaskModal({ onClose: onCloseMock });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
