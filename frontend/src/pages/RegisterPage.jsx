import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/api'; // Ensure this path is correct
import Input from '../components/forms/Input'; // Ensure this path is correct
import Button from '../components/forms/Button'; // Ensure this path is correct

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!username || !email || !password) {
      setError('All fields are required.');
      return;
    }

    try {
      const response = await apiClient.post('/auth/register', {
        username,
        email,
        password, // Trailing comma
      });
      setSuccessMessage(response.data.message + ' Redirecting to login...');
      // Clear form
      setUsername('');
      setEmail('');
      setPassword('');

      setTimeout(() => {
        navigate('/login');
      }, 2000); // Redirect after 2 seconds
    } catch (err) {
      // Handles specific JSON error messages from the server that have a `message` property
      if (
        err.response &&
        err.response.data &&
        typeof err.response.data.message === 'string'
      ) {
        setError('Registration failed: ' + err.response.data.message);
      } else {
        // Handles network errors, non-JSON text errors (where err.response.data is a string),
        // or other unexpected error structures by setting a generic message.
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '2rem auto',
        padding: '2rem',
        border: '1px solid #eee',
        borderRadius: '8px', // Trailing comma
      }}
    >
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      <form onSubmit={handleSubmit} data-testid="registration-form">
        <Input
          label="Username"
          type="text"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required // Trailing comma
        />
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required // Trailing comma
        />
        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Choose a password"
          required // Trailing comma
        />
        <Button type="submit" style={{ width: '100%', marginTop: '1rem' }}> 
          Register
        </Button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center' }}> {/* Trailing comma inside style if multi-lined, but this one is simple enough. Kept as is. */}
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
