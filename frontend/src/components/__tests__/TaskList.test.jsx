import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskList from '../TaskList';
import TaskCard from '../TaskCard';

// Mock TaskCard to simplify testing of TaskList
vi.mock('../TaskCard', () => ({
  default: ({ task, onEditTask }) => (
    <div data-testid="task-card" onClick={() => onEditTask(task)}>
      {task.content}
    </div>
  ),
}));

describe('TaskList', () => {
  const mockTasks = [
    { id: 1, content: 'Task One', due_date: null, priority: 'Low', tags: [] },
    {
      id: 2,
      content: 'Task Two',
      due_date: '2023-01-01T00:00:00Z',
      priority: 'High',
      tags: [{ id: 1, name: 'Test' }],
    },
  ];
  const mockOnEditTask = vi.fn();

  it('renders "No tasks in this stage yet." when no tasks are provided', () => {
    render(<TaskList tasks={[]} onEditTask={mockOnEditTask} />);
    expect(screen.getByText('No tasks in this stage yet.')).toBeInTheDocument();
  });

  it('renders a list of TaskCard components when tasks are provided', () => {
    render(<TaskList tasks={mockTasks} onEditTask={mockOnEditTask} />);

    const taskCards = screen.getAllByTestId('task-card');
    expect(taskCards).toHaveLength(mockTasks.length);
    expect(taskCards[0]).toHaveTextContent('Task One');
    expect(taskCards[1]).toHaveTextContent('Task Two');
  });

  it('passes correct props to TaskCard components', () => {
    render(<TaskList tasks={mockTasks} onEditTask={mockOnEditTask} />);

    const taskCards = screen.getAllByTestId('task-card');
    // Simulate a click on the first mocked TaskCard to check if onEditTask is called correctly
    // This relies on the mock implementation detail of TaskCard having an onClick.
    taskCards[0].click();
    expect(mockOnEditTask).toHaveBeenCalledWith(mockTasks[0]);

    taskCards[1].click();
    expect(mockOnEditTask).toHaveBeenCalledWith(mockTasks[1]);
  });
});
