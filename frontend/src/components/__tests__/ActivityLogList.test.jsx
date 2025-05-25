import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ActivityLogList from '../ActivityLogList';
import ActivityLogItem from '../ActivityLogItem';

// Mock ActivityLogItem to simplify testing of ActivityLogList
vi.mock('../ActivityLogItem', () => ({
  default: ({ activity }) => <div data-testid="activity-item">{activity.description}</div>,
}));

describe('ActivityLogList', () => {
  const mockActivities = [
    { id: 1, description: 'Activity 1', created_at: '2023-01-01T12:00:00Z' },
    { id: 2, description: 'Activity 2', created_at: '2023-01-02T12:00:00Z' },
  ];

  it('renders loading message when loading', () => {
    render(<ActivityLogList activities={[]} loading={true} error={null} />);
    expect(screen.getByText('Loading activities...')).toBeInTheDocument();
  });

  it('renders error message when error is present', () => {
    render(<ActivityLogList activities={[]} loading={false} error="Failed to load" />);
    expect(screen.getByText('Error loading activities: Failed to load')).toBeInTheDocument();
  });

  it('renders "No activities found" when no activities and not loading/error', () => {
    render(<ActivityLogList activities={[]} loading={false} error={null} />);
    expect(screen.getByText('No activities found.')).toBeInTheDocument();
  });

  it('renders a list of ActivityLogItem components when activities are provided', () => {
    render(<ActivityLogList activities={mockActivities} loading={false} error={null} />);
    
    const items = screen.getAllByTestId('activity-item');
    expect(items).toHaveLength(mockActivities.length);
    expect(items[0]).toHaveTextContent('Activity 1');
    expect(items[1]).toHaveTextContent('Activity 2');
  });

  it('passes correct props to ActivityLogItem (verified by mock)', () => {
    // This test relies on the mock implementation detail, 
    // but ensures ActivityLogList correctly maps and passes activity prop.
    render(<ActivityLogList activities={mockActivities} loading={false} error={null} />);
    
    // Check content rendered by the mock
    expect(screen.getByText(mockActivities[0].description)).toBeInTheDocument();
    expect(screen.getByText(mockActivities[1].description)).toBeInTheDocument();
  });
});
