import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import AuthPage from './AuthPage';
import RequestList from './RequestList';
import RequestForm from './RequestForm';
import RequestDetails from './RequestDetails';
import ProtectedRoute from './ProtectedRoute';

// The main App component handles all the routing for the application.
// Data Flow: User visits a URL -> App checks the Route -> Renders the correct Component.
function App() {
  return (
    <BrowserRouter>
      {/* Navbar is rendered outside Routes so it appears on all pages */}
      <Navbar />
      <div className="container-fluid mt-4">
        <Routes>
          {/* Redirect the root URL to the requests page */}
          <Route path="/" element={<Navigate to="/requests" replace />} />
          
          {/* Public authentication page (Login / Register tabs) */}
          <Route path="/login" element={<AuthPage />} />
          
          {/* Protected Routes: Only accessible if the user is logged in (has a valid token) */}
          <Route path="/requests" element={<ProtectedRoute><RequestList /></ProtectedRoute>} />
          <Route path="/requests/new" element={<ProtectedRoute><RequestForm /></ProtectedRoute>} />
          <Route path="/requests/:id" element={<ProtectedRoute><RequestDetails /></ProtectedRoute>} />
          <Route path="/requests/edit/:id" element={<ProtectedRoute><RequestForm /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
