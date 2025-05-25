import { useContext } from 'react';
import { AuthContext } from './AuthContext'; // Assuming AuthContext.jsx is in the same directory

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
