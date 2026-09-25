import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from './api';

// RequestForm handles both Creating a new request and Editing an existing one.
function RequestForm() {
    const { id } = useParams();       // Get ID from URL if editing
    const navigate = useNavigate();   // Navigation hook to change pages
    
    // Derived state: If an 'id' exists in the URL, we are editing. Otherwise, creating new.
    const isEditing = Boolean(id);
    
    // Check user permissions
    const role = localStorage.getItem('role');
    const isHrOrAdmin = ['2', '3', '4'].includes(role); // 2=HR Exec, 3=HR Mgr, 4=Admin

    // --- FORM STATE ---
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'LEAVE_CLARIFICATION',
        status: 'NEW',
        assigned_to: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [fetching, setFetching] = useState(isEditing);

    // Fetch existing request data if we are in 'Edit' mode
    useEffect(() => {
        if (!isEditing) return;

        const fetchRequest = async () => {
            try {
                const response = await api.get(`/requests/${id}`);
                
                // Pre-fill the form with existing data
                setFormData({
                    title: response.data.title,
                    description: response.data.description,
                    category: response.data.category,
                    status: response.data.status,
                    assigned_to: response.data.assigned_to || ''
                });
            } catch (err) {
                setError('Failed to load request details.');
            } finally {
                setFetching(false);
            }
        };
        fetchRequest();
    }, [id, isEditing]);

    // Updates state whenever the user types in an input field
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Submits the form data to the backend API
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            if (isEditing) {
                // Update existing request
                await api.put(`/requests/${id}`, formData);
            } else {
                // Create new request
                await api.post('/requests', {
                    title: formData.title,
                    description: formData.description,
                    category: formData.category
                });
            }
            
            // Redirect back to the requests list on success
            navigate('/requests');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save request.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="text-center mt-5"><h5>Loading form...</h5></div>;

    return (
        <div className="container px-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0 mt-4">
                        <div className="card-body p-4 bg-white rounded">
                            <h3 className="mb-4">{isEditing ? 'Update Request' : 'New Service Request'}</h3>
                            
                            {error && <div className="alert alert-danger">{error}</div>}
                            
                            <form onSubmit={handleSubmit}>
                                {/* Basic Fields */}
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Title</label>
                                    <input 
                                        type="text" 
                                        name="title"
                                        className="form-control bg-light"
                                        value={formData.title} 
                                        onChange={handleChange} 
                                        required 
                                        disabled={isEditing && !isHrOrAdmin}
                                    />
                                </div>
                                
                                <div className="mb-3">
                                    <label className="form-label fw-bold">Description</label>
                                    <textarea 
                                        name="description"
                                        className="form-control bg-light"
                                        value={formData.description} 
                                        onChange={handleChange} 
                                        required 
                                        rows="4"
                                        disabled={isEditing && !isHrOrAdmin}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label fw-bold">Category</label>
                                    <select 
                                        name="category"
                                        className="form-select bg-light"
                                        value={formData.category} 
                                        onChange={handleChange}
                                        disabled={isEditing && !isHrOrAdmin}
                                    >
                                        <option value="LEAVE_CLARIFICATION">Leave Clarification</option>
                                        <option value="PAYROLL_QUERY">Payroll Query</option>
                                        <option value="EXPERIENCE_LETTER">Experience Letter</option>
                                        <option value="ASSET_REQUEST">Asset Request</option>
                                        <option value="ONBOARDING_REQUEST">Onboarding Request</option>
                                    </select>
                                </div>

                                {/* HR/Admin Only Fields (Status and Assignment) */}
                                {isEditing && isHrOrAdmin && (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label fw-bold">Status</label>
                                            <select 
                                                name="status"
                                                className="form-select bg-light"
                                                value={formData.status} 
                                                onChange={handleChange}
                                            >
                                                <option value="NEW">New</option>
                                                <option value="ASSIGNED">Assigned</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="RESOLVED">Resolved</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <label className="form-label fw-bold">Assigned To</label>
                                            <input 
                                                type="text" 
                                                name="assigned_to"
                                                className="form-control bg-light"
                                                value={formData.assigned_to} 
                                                onChange={handleChange} 
                                                placeholder="Enter username"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Action Buttons */}
                                <div className="d-flex justify-content-end gap-2 mt-4">
                                    <button type="button" className="btn btn-secondary fw-bold" onClick={() => navigate('/requests')}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary fw-bold" disabled={loading}>
                                        {loading ? 'Saving...' : (isEditing ? 'Update Request' : 'Create Service Request')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RequestForm;
