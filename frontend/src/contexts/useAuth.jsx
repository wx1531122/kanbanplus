import { useContext } from 'react';
import { AuthContext } from './authContextDefinition'; // Changed import path

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
