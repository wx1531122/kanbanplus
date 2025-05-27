import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // Import fireEvent
import userEventLib from '@testing-library/user-event'; // Rename to avoid conflict
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../mocks/server'; // MSW server
import { http, HttpResponse } from 'msw';
import RegisterPage from '../RegisterPage';
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
  beforeEach(() => {
    vi.useFakeTimers(); // Use fake timers
    vi.clearAllMocks();
    server.resetHandlers();
    // Default successful registration handler
    server.use(
      http.post('/api/auth/register', () => {
        return HttpResponse.json(
          { message: 'User registered successfully' },
          { status: 201 },
        );
      }),
    );
  });

  // Optional: Add afterEach to restore real timers if other tests in the same file need them,
  // or rely on beforeEach to reset them for each test.
  // afterEach(() => {
  //  vi.useRealTimers();
  // });

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
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime });
    renderRegisterPage();
    await user.type(screen.getByLabelText('Username'), 'newuser');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'securepassword');

    expect(screen.getByLabelText('Username')).toHaveValue('newuser');
    expect(screen.getByLabelText('Email')).toHaveValue('new@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('securepassword');
  });

  it('submits form data and navigates to login on successful registration', async () => {
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime });
    server.use(
      http.post('/api/auth/register', async () => { // Keep this async as per previous step
        return HttpResponse.json(
          { message: 'Email already exists' },
          { status: 409 },
        );
      }),
    );
    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'testuser'); // Add username as it's required by component logic
    await user.type(
      screen.getByLabelText('Email'),
      'existing@example.com',
    );
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Register' }));

    expect(
      await screen.findByText('Registration failed: Email already exists'),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays error message if API returns non-JSON error or network error', async () => {
    const user = userEventLib.setup({ advanceTimers: vi.advanceTimersByTime });
    server.use(
      http.post('/api/auth/register', async () => {
        return new HttpResponse('Server Error', { status: 500 }); // Revert to HttpResponse
      }),
    );
    renderRegisterPage();

    await user.type(screen.getByLabelText('Username'), 'testuser');
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.type(screen.getByLabelText('Password'), 'password');
    // await user.click(screen.getByRole('button', { name: 'Register' })); // Replaced by fireEvent.submit
    // fireEvent.submit(screen.getByTestId('registration-form')); // Reverting to user.click
    await user.click(screen.getByRole('button', { name: 'Register' }));


    // Use waitFor to ensure all state updates have a chance to apply
    // await waitFor(() => {
    //   expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument();
    // });
    // Reverting to findByText
    expect(await screen.findByText('Registration failed. Please try again.')).toBeInTheDocument();
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
