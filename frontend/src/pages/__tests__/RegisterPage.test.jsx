import React from 'react';
import { render, screen, waitFor } from '@testing-library/react'; // Removed fireEvent
import userEventLib from '@testing-library/user-event'; // Rename to avoid conflict
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'; // Import afterEach
import { server } from '../../mocks/server'; // MSW server
import { http, HttpResponse } from 'msw';
import RegisterPage from '../RegisterPage';
import apiClient from '../../services/api'; // Import apiClient for spying
import { AuthProvider } from '../../contexts/AuthContext'; // To provide context if needed

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderRegisterPage = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        {' '}
        {/* AuthProvider might not be strictly necessary if RegisterPage doesn't use context directly, but good for consistency */}
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>,
  );
};

describe('RegisterPage', () => {
  let postSpy;

  beforeEach(() => {
    vi.useFakeTimers(); // Re-enable fake timers
    vi.clearAllMocks();
    server.resetHandlers(); // Keep MSW reset for other tests or default handlers

    // Default MSW handler for successful registration (can be overridden by spies)
    server.use(
      http.post('/api/auth/register', () => {
        return HttpResponse.json(
          { message: 'User registered successfully' },
          { status: 201 },
        );
      }),
    );
  });

  afterEach(() => {
    // Restore any spies after each test
    if (postSpy) {
      postSpy.mockRestore();
    }
  });

  it('renders registration form with username, email, password fields and a submit button', () => {
    renderRegisterPage();
    expect(
      screen.getByRole('heading', { name: 'Register' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Register' }),
    ).toBeInTheDocument();
  });

  it('allows user to type into form fields', async () => {
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime }); // Use with fake timers
    renderRegisterPage();
    await user.type(screen.getByLabelText('Username'), 'newuser');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepassword');

    expect(screen.getByLabelText('Username')).toHaveValue('newuser');
    expect(screen.getByLabelText('Email')).toHaveValue('new@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('securepassword');
  });

  it('submits form data and navigates to login on successful registration', async () => {
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime }); // Use with fake timers
    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'newuser');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepassword');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    // Wait for the navigation to be called, accounting for the 2-second delay
    // Also, assert only with the arguments actually used by the component.
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      },
      { timeout: 3000 },
    ); // Increased timeout for setTimeout
  });

  it('displays error message on failed registration (e.g., email exists)', async () => {
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime }); // Use with fake timers
    // Spy on apiClient.post and mock its rejection for this test
    postSpy = vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: { message: 'Email already exists' },
        status: 409,
      },
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'existing@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Register' }));
    vi.runAllTimers(); // Try flushing all timers

    expect(
      await screen.findByText('Registration failed: Email already exists'),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays error message if API returns non-JSON error or network error', async () => {
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime }); // Use with fake timers
    // Spy on apiClient.post and mock its rejection for this test
    postSpy = vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        // This mock will hit the component's 'else' branch in the catch block
        data: 'Server Error Details', // or simply make it an error that doesn't have err.response.data.message
        status: 500,
      },
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    // Diagnostic waitFor:
    let diagnosticFlag = false;
    try {
      await waitFor(
        () => {
          // This condition is designed to not be met, to test waitFor's own timeout
          if (screen.queryByText('THIS_TEXT_SHOULD_NOT_EXIST_ANYWHERE')) {
            diagnosticFlag = true; // Should not happen
          }
          expect(diagnosticFlag).toBe(true);
        },
        { timeout: 150 },
      ); // Very short timeout for testing waitFor itself
      // eslint-disable-next-line no-unused-vars
    } catch (_e) {
      // This catch block is expected to be hit if waitFor times out.
      // This is a "pass" for this part of the diagnostic.
      // If the test still times out at 400s, the problem is before this waitFor.
    }

    // Actual assertion for the test case
    expect(
      await screen.findByText('Registration failed. Please try again.'),
    ).toBeInTheDocument();
  });

  it('shows a link to the login page', () => {
    renderRegisterPage();
    const loginLink = screen.getByRole('link', {
      name: /Login/i, // Find by the actual link text "Login"
    });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
