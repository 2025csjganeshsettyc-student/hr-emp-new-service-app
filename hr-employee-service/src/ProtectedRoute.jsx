import { Navigate } from 'react-router-dom';

// ProtectedRoute is a wrapper component for routes that require authentication.
// It checks if a JWT token exists in localStorage.
// If it exists, it renders the wrapped component (children).
// If not, it automatically redirects the user to the /login page.
function ProtectedRoute({ children }) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
}

export default ProtectedRoute;
