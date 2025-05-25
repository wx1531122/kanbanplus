import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CommentForm from '../CommentForm';

describe('CommentForm', () => {
  const mockTaskId = 123;
  
  it('renders textarea and submit button', () => {
    render(<CommentForm taskId={mockTaskId} onCommentAdded={vi.fn()} />);
    expect(screen.getByPlaceholderText('Write a comment...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Comment' })).toBeInTheDocument();
  });

  it('allows typing in the textarea', async () => {
    render(<CommentForm taskId={mockTaskId} onCommentAdded={vi.fn()} />);
    const textarea = screen.getByPlaceholderText('Write a comment...');
    await userEvent.type(textarea, 'This is a test comment');
    expect(textarea).toHaveValue('This is a test comment');
  });

  it('submit button is disabled when textarea is empty or only whitespace', async () => {
    render(<CommentForm taskId={mockTaskId} onCommentAdded={vi.fn()} />);
    const submitButton = screen.getByRole('button', { name: 'Add Comment' });
    const textarea = screen.getByPlaceholderText('Write a comment...');

    expect(submitButton).toBeDisabled();

    await userEvent.type(textarea, '   ');
    expect(submitButton).toBeDisabled();

    await userEvent.type(textarea, 'Valid comment');
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onCommentAdded with task ID and content on submit and clears textarea', async () => {
    const mockOnCommentAdded = vi.fn(() => Promise.resolve()); // Mock returns a resolved promise
    render(<CommentForm taskId={mockTaskId} onCommentAdded={mockOnCommentAdded} />);
    
    const textarea = screen.getByPlaceholderText('Write a comment...');
    const submitButton = screen.getByRole('button', { name: 'Add Comment' });
    const commentText = 'A new insightful comment';

    await userEvent.type(textarea, commentText);
    await userEvent.click(submitButton);

    expect(mockOnCommentAdded).toHaveBeenCalledTimes(1);
    expect(mockOnCommentAdded).toHaveBeenCalledWith(mockTaskId, commentText);

    // Wait for textarea to be cleared (due to async nature of submit and state update)
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('displays error message if content is empty on submit attempt', async () => {
    render(<CommentForm taskId={mockTaskId} onCommentAdded={vi.fn()} />);
    const submitButton = screen.getByRole('button', { name: 'Add Comment' });
    // Intentionally not typing anything or typing whitespace
    await userEvent.click(submitButton); // Should not submit due to disabled state, but let's ensure error if forced
    
    // To test the internal validation message when content is empty
    const textarea = screen.getByPlaceholderText('Write a comment...');
    fireEvent.submit(screen.getByRole('form')); // Directly trigger form submit for this check
    
    expect(screen.getByText('Comment content cannot be empty.')).toBeInTheDocument();
  });

  it('displays error message if onCommentAdded throws error', async () => {
    const errorMessage = 'Network Error';
    const mockOnCommentAdded = vi.fn(() => Promise.reject(new Error(errorMessage)));
    render(<CommentForm taskId={mockTaskId} onCommentAdded={mockOnCommentAdded} />);

    const textarea = screen.getByPlaceholderText('Write a comment...');
    const submitButton = screen.getByRole('button', { name: 'Add Comment' });
    const commentText = 'Test comment that will fail';

    await userEvent.type(textarea, commentText);
    await userEvent.click(submitButton);

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(textarea).toHaveValue(commentText); // Textarea should not clear on error
  });

  it('shows submitting state on button when submitting', async () => {
    // A promise that doesn't resolve immediately to check "Submitting..." state
    let resolveSubmission;
    const longSubmissionPromise = new Promise(resolve => { resolveSubmission = resolve; });
    const mockOnCommentAdded = vi.fn(() => longSubmissionPromise);

    render(<CommentForm taskId={mockTaskId} onCommentAdded={mockOnCommentAdded} />);
    
    const textarea = screen.getByPlaceholderText('Write a comment...');
    const submitButton = screen.getByRole('button', { name: 'Add Comment' });

    await userEvent.type(textarea, 'Submitting test');
    await userEvent.click(submitButton);

    expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument();
    expect(submitButton).toBeDisabled(); // Also check disabled state
    expect(textarea).toBeDisabled();

    // Resolve the promise to finish the test
    resolveSubmission(); 
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Comment' })).toBeInTheDocument();
    });
  });
});
