import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute'; 
import ProjectViewPage from './pages/ProjectViewPage'; // Import ProjectViewPage
// Import other necessary CSS or global styles
import './App.css'; // Assuming some global styles

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { 
        path: 'project/:projectId', // Route for viewing a single project
        element: (
          <ProtectedRoute>
            <ProjectViewPage />
          </ProtectedRoute>
        ) 
      },
      // More routes will be added here for projects, tasks etc.
      // These will also likely be wrapped in <ProtectedRoute>
    ],
  },
  {
    path: '*', // Catch-all for 404
    element: <NotFoundPage />,
  }
]);

function App() {
  return <RouterProvider router={router} />;
}
export default App;
