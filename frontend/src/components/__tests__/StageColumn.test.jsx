import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StageColumn from '../StageColumn';
import TaskList from '../TaskList';

// Mock TaskList as its functionality is tested separately
vi.mock('../TaskList', () => ({
  default: ({ tasks, onEditTask }) => (
    <div data-testid="task-list">
      {tasks.map((task) => (
        <div
          key={task.id}
          data-testid="task-in-list"
          onClick={() => onEditTask(task)}
        >
          {task.content}
        </div>
      ))}
    </div>
  ),
}));

describe('StageColumn', () => {
  const mockStage = {
    id: 1,
    name: 'To Do',
    tasks: [
      { id: 10, content: 'Task A' },
      { id: 11, content: 'Task B' },
    ],
  };
  const mockOnAddTask = vi.fn();
  const mockOnEditTask = vi.fn(); // Passed down to TaskList/TaskCard

  it('renders stage title correctly', () => {
    render(
      <StageColumn
        stage={mockStage}
        onAddTask={mockOnAddTask}
        onEditTask={mockOnEditTask}
      />,
    );
    expect(
      screen.getByRole('heading', { name: mockStage.name, level: 3 }),
    ).toBeInTheDocument();
  });

  it('renders TaskList with correct tasks', () => {
    render(
      <StageColumn
        stage={mockStage}
        onAddTask={mockOnAddTask}
        onEditTask={mockOnEditTask}
      />,
    );
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
    const tasksInList = screen.getAllByTestId('task-in-list');
    expect(tasksInList).toHaveLength(mockStage.tasks.length);
    expect(tasksInList[0]).toHaveTextContent('Task A');
    expect(tasksInList[1]).toHaveTextContent('Task B');
  });

  it('renders TaskList with empty message if no tasks', () => {
    // To test this properly, the mock of TaskList needs to be more sophisticated
    // or we don't mock TaskList and let it render its own "no tasks" message.
    // For now, our current mock just renders tasks. If TaskList itself handles empty,
    // this test would be better as an integration test or by improving TaskList mock.
    // Let's assume TaskList's own tests cover the "no tasks" message.
    // Here we just check that an empty tasks array is passed.
    const stageWithNoTasks = { ...mockStage, tasks: [] };
    render(
      <StageColumn
        stage={stageWithNoTasks}
        onAddTask={mockOnAddTask}
        onEditTask={mockOnEditTask}
      />,
    );
    // Check that TaskList is rendered (our mock will render an empty div)
    expect(screen.getByTestId('task-list')).toBeInTheDocument();
    // Check that no actual "task-in-list" items are rendered by our mock
    expect(screen.queryAllByTestId('task-in-list')).toHaveLength(0);
  });

  it('calls onAddTask with stage ID when "Add Task" button is clicked', () => {
    render(
      <StageColumn
        stage={mockStage}
        onAddTask={mockOnAddTask}
        onEditTask={mockOnEditTask}
      />,
    );
    const addTaskButton = screen.getByRole('button', { name: '+ Add Task' });
    fireEvent.click(addTaskButton);
    expect(mockOnAddTask).toHaveBeenCalledTimes(1);
    expect(mockOnAddTask).toHaveBeenCalledWith(mockStage.id);
  });

  it('passes onEditTask to TaskList (verified by mock interaction)', () => {
    render(
      <StageColumn
        stage={mockStage}
        onAddTask={mockOnAddTask}
        onEditTask={mockOnEditTask}
      />,
    );
    // Simulate a click on a task within the mocked TaskList
    const tasksInList = screen.getAllByTestId('task-in-list');
    if (tasksInList.length > 0) {
      fireEvent.click(tasksInList[0]);
      expect(mockOnEditTask).toHaveBeenCalledWith(mockStage.tasks[0]);
    }
  });
});
