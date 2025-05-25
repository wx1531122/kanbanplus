import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../mocks/server'; // MSW server
import { http, HttpResponse } from 'msw';
import LoginPage from '../LoginPage';
import { AuthProvider, AuthContext } from '../../contexts/AuthContext'; // To provide context

// Mock useNavigate from react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLoginPage = () => {
  return render(
    <MemoryRouter>
      <AuthProvider> {/* LoginPage uses AuthContext.login */}
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers(); // Reset MSW handlers
    // Default successful login handler
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        const { email } = await request.json();
        if (email === 'test@example.com') {
          return HttpResponse.json({ access_token: 'mock_token' });
        }
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      })
    );
  });

  it('renders login form with email, password fields and a submit button', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email:')).toBeInTheDocument();
    expect(screen.getByLabelText('Password:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('allows user to type into email and password fields', async () => {
    renderLoginPage();
    await userEvent.type(screen.getByLabelText('Email:'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password:'), 'password123');

    expect(screen.getByLabelText('Email:')).toHaveValue('test@example.com');
    expect(screen.getByLabelText('Password:')).toHaveValue('password123');
  });

  it('submits form data and calls login on successful submission, then navigates to home', async () => {
    // AuthContext.login is called internally by LoginPage's handleSubmit
    // We can spy on localStorage.setItem to confirm token storage
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    
    renderLoginPage();
    
    await userEvent.type(screen.getByLabelText('Email:'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password:'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith('accessToken', 'mock_token');
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
    setItemSpy.mockRestore();
  });

  it('displays error message on failed login (e.g. invalid credentials)', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 });
      })
    );
    renderLoginPage();

    await userEvent.type(screen.getByLabelText('Email:'), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText('Password:'), 'wrongpassword');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Login failed: Invalid email or password')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('displays error message if API returns non-JSON error or network error', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return new HttpResponse("Server Error", { status: 500 });
      })
    );
    renderLoginPage();

    await userEvent.type(screen.getByLabelText('Email:'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password:'), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // The error message might be generic if it's not JSON from API
    expect(await screen.findByText(/Login failed:/)).toBeInTheDocument(); 
  });
  
  it('shows a link to the registration page', () => {
    renderLoginPage();
    const registerLink = screen.getByRole('link', { name: "Don't have an account? Register" });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
