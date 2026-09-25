import { Link, useNavigate } from 'react-router-dom';

// The Navbar component displays the top navigation bar.
// It shows different options depending on whether the user is logged in.
function Navbar() {
    const navigate = useNavigate();
    
    // Retrieve authentication details to customize the UI
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    // Clears the session data and redirects to the login screen
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        navigate('/login');
    };

    // If the user is not logged in, don't show the navbar
    if (!token) return null;

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3">
            <div className="container-fluid px-4">
                <Link className="navbar-brand text-white fw-bold" to="/requests">
                    HR Employee Service Portal
                </Link>
                
                <div className="d-flex align-items-center ms-auto gap-2">
                    <Link to="/requests" className="btn bg-white text-dark fw-bold">Service Requests</Link>
                    <Link to="/requests/new" className="btn bg-white text-dark fw-bold">New Request</Link>
                    
                    <span className="text-white mx-2">{username}</span>
                    <button onClick={handleLogout} className="btn btn-danger fw-bold">Logout</button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
