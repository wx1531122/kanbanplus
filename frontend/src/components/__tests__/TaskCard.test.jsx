import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskCard from '../TaskCard';

describe('TaskCard', () => {
  const mockTaskBase = {
    id: 1,
    content: 'Test Task Content',
    assignee: 'testuser@example.com',
    due_date: '2023-12-31T00:00:00.000Z',
    priority: 'High',
    tags: [
      { id: 1, name: 'Urgent' },
      { id: 2, name: 'Frontend' },
    ],
  };

  const mockOnEditTask = vi.fn();

  it('renders task content', () => {
    render(<TaskCard task={mockTaskBase} onEditTask={mockOnEditTask} />);
    expect(screen.getByText(mockTaskBase.content)).toBeInTheDocument();
  });

  it('renders assignee if present', () => {
    render(<TaskCard task={mockTaskBase} onEditTask={mockOnEditTask} />);
    expect(
      screen.getByText(`Assignee: ${mockTaskBase.assignee}`),
    ).toBeInTheDocument();
  });

  it('does not render assignee if not present', () => {
    const taskWithoutAssignee = { ...mockTaskBase, assignee: null };
    render(<TaskCard task={taskWithoutAssignee} onEditTask={mockOnEditTask} />);
    expect(screen.queryByText(/Assignee:/)).not.toBeInTheDocument();
  });

  it('renders formatted due date if present', () => {
    render(<TaskCard task={mockTaskBase} onEditTask={mockOnEditTask} />);
    // Default toLocaleDateString format might vary. Check for parts.
    // e.g., "Dec 31, 2023" or "31 Dec 2023"
    const expectedDate = new Date(mockTaskBase.due_date).toLocaleDateString(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      },
    );
    expect(screen.getByText(`Due: ${expectedDate}`)).toBeInTheDocument();
  });

  it('renders "Due: Not set" if due date is not present', () => {
    const taskWithoutDueDate = { ...mockTaskBase, due_date: null };
    render(<TaskCard task={taskWithoutDueDate} onEditTask={mockOnEditTask} />);
    expect(screen.getByText('Due: Not set')).toBeInTheDocument();
  });

  it('renders "Due: Invalid date" if due date is invalid', () => {
    const taskWithInvalidDueDate = {
      ...mockTaskBase,
      due_date: 'invalid-date',
    };
    render(
      <TaskCard task={taskWithInvalidDueDate} onEditTask={mockOnEditTask} />,
    );
    expect(screen.getByText('Due: Invalid Date')).toBeInTheDocument();
  });

  it('renders priority with specific style', () => {
    render(<TaskCard task={mockTaskBase} onEditTask={mockOnEditTask} />);
    const priorityElement = screen.getByText(
      `Priority: ${mockTaskBase.priority}`,
    );
    expect(priorityElement).toBeInTheDocument();
    // Check for style - this is a bit implementation-dependent.
    // The component uses inline styles: color: priorityColors[task.priority]
    expect(priorityElement).toHaveStyle('color: rgb(255, 0, 0)'); // For 'High'
  });

  it('renders default priority "Medium" if priority is not set', () => {
    const taskWithoutPriority = { ...mockTaskBase, priority: null };
    render(<TaskCard task={taskWithoutPriority} onEditTask={mockOnEditTask} />);
    const priorityElement = screen.getByText('Priority: Medium');
    expect(priorityElement).toBeInTheDocument();
    expect(priorityElement).toHaveStyle('color: orange'); // For 'Medium' (default)
  });

  it('renders tags if present', () => {
    render(<TaskCard task={mockTaskBase} onEditTask={mockOnEditTask} />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('does not render tags section if no tags are present', () => {
    const taskWithoutTags = { ...mockTaskBase, tags: [] };
    render(<TaskCard task={taskWithoutTags} onEditTask={mockOnEditTask} />);
    // Check that the div that wraps tags is not rendered.
    // This relies on the specific implementation detail of wrapping tags in a div.
    // A more robust way might be to check for absence of any tag-like elements.
    const tagsContainer = screen.queryByText('Urgent')?.closest('div'); // find an element and go up
    if (tagsContainer && tagsContainer.innerHTML.includes('Urgent')) {
      // This means the tag was found, which is not what we want.
      // However, the queryByText('Urgent') itself would return null.
    }
    expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
  });

  it('calls onEditTask when Edit button is clicked', () => {
    render(<TaskCard task={mockTaskBase} onEditTask={mockOnEditTask} />);
    const editButton = screen.getByRole('button', { name: 'Edit' });
    fireEvent.click(editButton);
    expect(mockOnEditTask).toHaveBeenCalledTimes(1);
    expect(mockOnEditTask).toHaveBeenCalledWith(mockTaskBase);
  });
});
