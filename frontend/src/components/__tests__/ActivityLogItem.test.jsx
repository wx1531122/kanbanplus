import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ActivityLogItem from '../ActivityLogItem';

describe('ActivityLogItem', () => {
  const mockActivity = {
    id: 1,
    description: "User 'testuser' created task 'Finish report'",
    created_at: '2023-10-26T10:00:00.000Z',
    user_username: 'testuser', // Though description might already contain it
  };

  it('renders activity description correctly', () => {
    render(<ActivityLogItem activity={mockActivity} />);
    expect(screen.getByText(mockActivity.description)).toBeInTheDocument();
  });

  it('renders formatted timestamp correctly', () => {
    render(<ActivityLogItem activity={mockActivity} />);
    // Expected format: Oct 26, 2023, 10:00 AM (will vary by locale of test env)
    // A more robust way is to check for parts of the date or use a regex
    // For simplicity, we'll check for a part of it or a general pattern.
    // The toLocaleString output depends on the node's ICU data and system locale.
    // Let's check for the presence of the date and a time-like pattern.
    const expectedDate = new Date(mockActivity.created_at).toLocaleDateString(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it('handles missing timestamp gracefully', () => {
    const activityWithoutDate = { ...mockActivity, created_at: null };
    render(<ActivityLogItem activity={activityWithoutDate} />);
    expect(screen.getByText('Date not available')).toBeInTheDocument();
  });

  it('handles invalid timestamp gracefully', () => {
    const activityWithInvalidDate = {
      ...mockActivity,
      created_at: 'invalid-date-string',
    };
    render(<ActivityLogItem activity={activityWithInvalidDate} />);
    expect(screen.getByText('Invalid Date')).toBeInTheDocument();
  });
});
