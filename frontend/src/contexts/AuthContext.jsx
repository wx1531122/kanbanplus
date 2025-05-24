import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api'; // For setting default headers

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('accessToken'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  // const [user, setUser] = useState(null); // Placeholder for user data

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      // Optionally decode token or fetch user data here
      // e.g., const decoded = jwtDecode(storedToken); setUser(decoded);
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, []); // Runs once on mount

  const login = (newToken) => {
    localStorage.setItem('accessToken', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    // Optionally decode token or fetch user data here
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setToken(null);
    setIsAuthenticated(false);
    // setUser(null);
    delete apiClient.defaults.headers.common['Authorization'];
    // Could also call a /logout endpoint on the backend if it exists for session invalidation
  };

  // The register function here is more of a placeholder if needed for context logic
  // Typically, registration leads to login or just displays a success message.
  // The actual API call is in RegisterPage.jsx
  const register = async (username, email, password) => {
    // This function might not be strictly necessary in AuthContext
    // if RegisterPage handles the API call and redirects.
    // However, it could be here if context needs to manage some part of registration flow.
    // For now, let it be a conceptual placeholder.
    console.log("Register function in AuthContext called (conceptual)");
    // Example: return apiClient.post('/auth/register', { username, email, password });
  };


  return (
    <AuthContext.Provider value={{ isAuthenticated, token, login, logout, register /*, user */ }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
