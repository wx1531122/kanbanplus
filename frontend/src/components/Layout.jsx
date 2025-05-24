import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed
import Button from './forms/Button'; // Assuming you have this

const Layout = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <>
      <header style={{ background: '#f0f0f0', padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <nav>
          <Link to="/" style={{ marginRight: '1rem', fontWeight: 'bold', color: '#333' }}>Kanban App</Link>
          {isAuthenticated && (
            <>
              {/* Add links to protected areas like Projects, Dashboard etc. here */}
              {/* Example: <Link to="/projects" style={{ marginRight: '1rem' }}>Projects</Link> */}
            </>
          )}
        </nav>
        <nav>
          {isAuthenticated ? (
            <Button onClick={handleLogout} variant="secondary">
              Logout
            </Button>
          ) : (
            <>
              <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <main style={{ padding: '1rem', flexGrow: 1 }}> {/* Added flexGrow to push footer down */}
        <Outlet /> {/* Child routes will render here */}
      </main>
      <footer style={{ background: '#f0f0f0', padding: '1rem', marginTop: 'auto', textAlign: 'center' }}> {/* Changed marginTop to auto */}
        <p>&copy; 2024 Kanban App</p>
      </footer>
    </>
  );
};
export default Layout;
