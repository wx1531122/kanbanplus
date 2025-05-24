import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
        password,
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
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '2rem', border: '1px solid #eee', borderRadius: '8px' }}>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      <form onSubmit={handleSubmit}>
        <Input
          label="Username"
          type="text"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
        />
        <Input
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Choose a password"
          required
        />
        <Button type="submit" style={{ width: '100%', marginTop: '1rem' }}>
          Register
        </Button>
      </form>
    </div>
  );
};

export default RegisterPage;
