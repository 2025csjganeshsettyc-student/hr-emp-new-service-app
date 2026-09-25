import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';

// AuthPage handles both Login and User Registration using a tabbed interface.
function AuthPage() {
    // Determines which tab is currently active (Login vs Register)
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();

    // --- LOGIN STATE ---
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    // --- REGISTRATION STATE ---
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regRole, setRegRole] = useState('1'); // Default role: Employee (1)
    const [regError, setRegError] = useState('');
    const [regSuccess, setRegSuccess] = useState('');
    const [regLoading, setRegLoading] = useState(false);

    // Submits the login form to the backend API
    const handleLogin = async (e) => {
        e.preventDefault(); // Prevent page reload
        setLoginError('');
        setLoginLoading(true);
        
        try {
            // FastAPI OAuth2PasswordRequestForm expects URL-encoded form data
            const formData = new URLSearchParams();
            formData.append('username', loginUsername);
            formData.append('password', loginPassword);

            const response = await api.post('/login', formData);
            const token = response.data.access_token;
            
            // Store token and username securely in the browser's localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('username', loginUsername);
            
            // Extract the user's role by decoding the JWT token payload manually
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                localStorage.setItem('role', payload.role ? payload.role.toString() : '1');
            } catch {
                localStorage.setItem('role', '1'); // Fallback if decoding fails
            }

            // Redirect user to the main requests dashboard and reload to update the Navbar state
            navigate('/requests');
            window.location.reload();
        } catch (err) {
            setLoginError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoginLoading(false);
        }
    };

    // Submits the registration form to the backend API
    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError('');
        setRegSuccess('');
        setRegLoading(true);
        
        try {
            // Send new user details as JSON body
            await api.post('/users', {
                username: regUsername,
                password: regPassword,
                role: parseInt(regRole, 10)
            });
            
            // Clear form and switch to login tab automatically on success
            setRegSuccess('User created successfully. You can now login.');
            setRegUsername('');
            setRegPassword('');
            setRegRole('1');
            setIsLogin(true);
        } catch (err) {
            setRegError(err.response?.data?.detail || 'Registration failed.');
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div className="container mt-5 pt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <div className="card shadow-sm border-0">
                        
                        {/* --- TABS NAVIGATION --- */}
                        <div className="card-header bg-white pt-3 pb-0 border-bottom-0">
                            <ul className="nav nav-tabs border-bottom-0">
                                <li className="nav-item flex-fill text-center">
                                    <button 
                                        className={`nav-link w-100 fw-bold border-0 ${isLogin ? 'active border-bottom border-3 border-primary text-primary' : 'text-secondary'}`} 
                                        onClick={() => setIsLogin(true)}
                                        style={{ background: 'transparent' }}
                                    >
                                        Login
                                    </button>
                                </li>
                                <li className="nav-item flex-fill text-center">
                                    <button 
                                        className={`nav-link w-100 fw-bold border-0 ${!isLogin ? 'active border-bottom border-3 border-primary text-primary' : 'text-secondary'}`} 
                                        onClick={() => setIsLogin(false)}
                                        style={{ background: 'transparent' }}
                                    >
                                        Register
                                    </button>
                                </li>
                            </ul>
                        </div>
                        
                        {/* --- TAB CONTENT --- */}
                        <div className="card-body p-4 bg-white shadow-sm border rounded-bottom">
                            {isLogin ? (
                                // --- LOGIN FORM ---
                                <form onSubmit={handleLogin}>
                                    <h4 className="mb-4 text-center fw-bold">Welcome Back</h4>
                                    
                                    {loginError && <div className="alert alert-danger py-2">{loginError}</div>}
                                    {regSuccess && <div className="alert alert-success py-2">{regSuccess}</div>}
                                    
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold">USERNAME</label>
                                        <input 
                                            type="text" 
                                            className="form-control form-control-lg bg-light"
                                            value={loginUsername} 
                                            onChange={(e) => setLoginUsername(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label text-muted small fw-bold">PASSWORD</label>
                                        <input 
                                            type="password" 
                                            className="form-control form-control-lg bg-light"
                                            value={loginPassword} 
                                            onChange={(e) => setLoginPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary w-100 btn-lg fw-bold" disabled={loginLoading}>
                                        {loginLoading ? 'Logging in...' : 'Login'}
                                    </button>
                                </form>
                            ) : (
                                // --- REGISTRATION FORM ---
                                <form onSubmit={handleRegister}>
                                    <h4 className="mb-4 text-center fw-bold">Create Account</h4>
                                    
                                    {regError && <div className="alert alert-danger py-2">{regError}</div>}
                                    
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold">USERNAME</label>
                                        <input 
                                            type="text" 
                                            className="form-control form-control-lg bg-light"
                                            value={regUsername} 
                                            onChange={(e) => setRegUsername(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label text-muted small fw-bold">PASSWORD</label>
                                        <input 
                                            type="password" 
                                            className="form-control form-control-lg bg-light"
                                            value={regPassword} 
                                            onChange={(e) => setRegPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label text-muted small fw-bold">ROLE</label>
                                        <select className="form-select form-select-lg bg-light" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                                            <option value="1">Employee</option>
                                            <option value="2">HR Executive</option>
                                            <option value="3">HR Manager</option>
                                            <option value="4">Admin</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="btn btn-success w-100 btn-lg fw-bold" disabled={regLoading}>
                                        {regLoading ? 'Registering...' : 'Register'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthPage;
