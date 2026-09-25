import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

// RequestList displays all service requests in a table format.
function RequestList() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Get the active user's role from localStorage to handle UI permissions
    const role = localStorage.getItem('role');
    const canEdit = ['2', '3', '4'].includes(role); // Only HR and Admin can edit
    const canDelete = role === '4';                 // Only Admin can delete

    // Fetch requests when the component first loads
    useEffect(() => {
        fetchRequests();
    }, []);

    // API Call: Retrieves the list of requests from the backend
    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await api.get('/requests');
            setRequests(response.data);
        } catch (err) {
            setError('Failed to fetch requests.');
        } finally {
            setLoading(false);
        }
    };

    // API Call: Deletes a specific request by ID
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this request?')) return;
        
        try {
            await api.delete(`/requests/${id}`);
            fetchRequests(); // Refresh the list after successful deletion
        } catch (err) {
            alert('Failed to delete request.');
        }
    };

    // API Call: Confirms the resolution of a request (Employee only)
    const handleConfirmResolution = async (id) => {
        if (!window.confirm('Confirm resolution of this request?')) return;
        
        try {
            await api.put(`/requests/${id}/confirm`);
            fetchRequests(); // Refresh the list
        } catch (err) {
            alert('Failed to confirm resolution.');
        }
    };

    if (loading) return <div className="text-center mt-5"><h5>Loading requests...</h5></div>;
    if (error) return <div className="alert alert-danger m-4">{error}</div>;

    return (
        <div className="container-fluid px-4">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Service Requests</h2>
                <Link to="/requests/new" className="btn btn-primary fw-bold">New Request</Link>
            </div>

            {/* Empty State */}
            {requests.length === 0 ? (
                <div className="alert alert-info">No service requests found.</div>
            ) : (
                /* Data Table Section */
                <div className="table-responsive bg-white rounded shadow-sm">
                    <table className="table table-bordered mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="p-3">Title</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map(req => (
                                <tr key={req.id}>
                                    <td className="p-3 align-middle">{req.title}</td>
                                    <td className="p-3 align-middle">{req.description}</td>
                                    
                                    {/* Format the category by replacing underscores with spaces */}
                                    <td className="p-3 align-middle">
                                        {req.category ? req.category.replace(/_/g, ' ') : ''}
                                    </td>
                                    
                                    <td className="p-3 align-middle">
                                        {req.status ? req.status.replace(/_/g, ' ') : 'NEW'}
                                    </td>
                                    
                                    <td className="p-3 align-middle">
                                        <div className="d-flex gap-2">
                                            {/* Role-based action buttons */}
                                            {canEdit && (
                                                <Link to={`/requests/edit/${req.id}`} className="btn btn-warning btn-sm text-dark fw-bold border-0">Edit</Link>
                                            )}
                                            
                                            {/* Employees can only confirm resolution if it is currently 'RESOLVED' */}
                                            {req.status === 'RESOLVED' && role === '1' && (
                                                <button onClick={() => handleConfirmResolution(req.id)} className="btn btn-success btn-sm fw-bold border-0">
                                                    Confirm
                                                </button>
                                            )}

                                            {canDelete && (
                                                <button onClick={() => handleDelete(req.id)} className="btn btn-danger btn-sm text-white fw-bold border-0">
                                                    Delete
                                                </button>
                                            )}
                                            
                                            <Link to={`/requests/${req.id}`} className="btn btn-secondary btn-sm fw-bold border-0">View</Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default RequestList;
