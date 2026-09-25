import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from './api';

// RequestDetails displays the full information of a specific service request.
function RequestDetails() {
    const { id } = useParams(); // Extracts the 'id' parameter from the URL path
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const role = localStorage.getItem('role');
    const canEdit = ['2', '3', '4'].includes(role);

    // Fetch the specific request details on load
    useEffect(() => {
        const getRequestDetails = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/requests/${id}`);
                setRequest(response.data);
            } catch (err) {
                setError('Failed to fetch request details.');
            } finally {
                setLoading(false);
            }
        };
        getRequestDetails();
    }, [id]);

    if (loading) return <div className="text-center mt-5"><h5>Loading details...</h5></div>;
    if (error) return <div className="alert alert-danger m-4">{error}</div>;
    if (!request) return <div className="alert alert-warning m-4">Request not found.</div>;

    return (
        <div className="container px-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0 mt-4">
                        {/* Header */}
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                            <h3 className="mb-0">Request Details</h3>
                            <Link to="/requests" className="btn btn-secondary btn-sm fw-bold">Back to List</Link>
                        </div>
                        
                        {/* Content Body */}
                        <div className="card-body p-4 bg-white">
                            {/* Grid showing metadata */}
                            <div className="row mb-4">
                                <div className="col-md-6 mb-3">
                                    <label className="text-muted small fw-bold">ID</label>
                                    <div className="fs-5">{request.id}</div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="text-muted small fw-bold">EMPLOYEE</label>
                                    <div className="fs-5">{request.employee}</div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="text-muted small fw-bold">CATEGORY</label>
                                    <div className="fs-5">
                                        {request.category ? request.category.replace(/_/g, ' ') : ''}
                                    </div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="text-muted small fw-bold">STATUS</label>
                                    <div>
                                        <span className="badge bg-primary fs-6">
                                            {request.status ? request.status.replace(/_/g, ' ') : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label className="text-muted small fw-bold">ASSIGNED TO</label>
                                    <div className="fs-5">{request.assigned_to || 'Unassigned'}</div>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="mb-4">
                                <label className="text-muted small fw-bold">TITLE</label>
                                <div className="p-3 bg-light rounded border">{request.title}</div>
                            </div>

                            <div className="mb-4">
                                <label className="text-muted small fw-bold">DESCRIPTION</label>
                                <div className="p-3 bg-light rounded border" style={{whiteSpace: 'pre-wrap'}}>
                                    {request.description}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                                {canEdit && (
                                    <Link to={`/requests/edit/${request.id}`} className="btn btn-primary fw-bold">
                                        Edit Request
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RequestDetails;
