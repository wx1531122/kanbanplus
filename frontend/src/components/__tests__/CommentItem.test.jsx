import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CommentItem from '../CommentItem';

describe('CommentItem', () => {
  const mockComment = {
    id: 1,
    content: 'This is a great task!',
    created_at: '2023-10-27T14:30:00.000Z',
    user_id: 101,
    commenter_username: 'janedoe', // Assuming backend now provides this
  };

  const mockCommentNoUsername = {
    id: 2,
    content: 'Another comment here.',
    created_at: '2023-10-28T10:00:00.000Z',
    user_id: 102,
    // commenter_username is missing
  };

  it('renders comment content correctly', () => {
    render(<CommentItem comment={mockComment} />);
    expect(screen.getByText(mockComment.content)).toBeInTheDocument();
  });

  it('renders commenter username when available', () => {
    render(<CommentItem comment={mockComment} />);
    expect(screen.getByText(mockComment.commenter_username)).toBeInTheDocument();
  });

  it('renders User ID when commenter_username is not available', () => {
    render(<CommentItem comment={mockCommentNoUsername} />);
    expect(screen.getByText(`User ID: ${mockCommentNoUsername.user_id}`)).toBeInTheDocument();
  });

  it('renders formatted timestamp correctly', () => {
    render(<CommentItem comment={mockComment} />);
    const expectedDate = new Date(mockComment.created_at).toLocaleString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('handles missing timestamp gracefully', () => {
    const commentWithoutDate = { ...mockComment, created_at: null };
    render(<CommentItem comment={commentWithoutDate} />);
    expect(screen.getByText('Date not available')).toBeInTheDocument();
  });

  it('handles invalid timestamp gracefully', () => {
    const commentWithInvalidDate = { ...mockComment, created_at: 'not-a-date' };
    render(<CommentItem comment={commentWithInvalidDate} />);
    expect(screen.getByText('Invalid date')).toBeInTheDocument();
  });
});
