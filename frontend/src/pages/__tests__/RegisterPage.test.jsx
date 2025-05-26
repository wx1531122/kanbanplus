import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    renderRegisterPage();
    await userEvent.type(screen.getByLabelText('Username'), 'newuser');
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'securepassword');

    expect(screen.getByLabelText('Username')).toHaveValue('newuser');
    expect(screen.getByLabelText('Email')).toHaveValue('new@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('securepassword');
  });

  it('submits form data and navigates to login on successful registration', async () => {
    renderRegisterPage();

    await userEvent.type(screen.getByLabelText('Username'), 'newuser');
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'securepassword');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

    // Wait for the navigation to be called, accounting for the 2-second delay
    // Also, assert only with the arguments actually used by the component.
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    }, { timeout: 3000 }); // Increased timeout for setTimeout
  });

  it('displays error message on failed registration (e.g., email exists)', async () => {
    server.use(
      http.post('/api/auth/register', () => {
        return HttpResponse.json(
          { message: 'Email already exists' },
          { status: 409 },
        );
      }),
    );
    renderRegisterPage();

    await userEvent.type(
      screen.getByLabelText('Email'),
      'existing@example.com',
    );
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(
      await screen.findByText('Registration failed: Email already exists'),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays error message if API returns non-JSON error or network error', async () => {
    server.use(
      http.post('/api/auth/register', () => {
        return new HttpResponse('Server Error', { status: 500 });
      }),
    );
    renderRegisterPage();

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Register' }));

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
