from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# Home
@app.get("/")
def home():
    return {"message": "HR Employee Service Portal"}


# Simple in-memory database
db = {
    1: {
        "id": 1,
        "employee": "Rahul",
        "title": "Leave clarification",
        "description": "I want to know my remaining casual leave",
        "category": "LEAVE_CLARIFICATION",
        "status": "NEW",
        "assigned_to": None
    },

    2: {
        "id": 2,
        "employee": "Priya",
        "title": "Payroll query",
        "description": "My salary credited is less than expected",
        "category": "PAYROLL_QUERY",
        "status": "ASSIGNED",
        "assigned_to": "HR Executive"
    },

    3: {
        "id": 3,
        "employee": "Arun",
        "title": "Experience letter",
        "description": "I need my experience letter",
        "category": "EXPERIENCE_LETTER",
        "status": "IN_PROGRESS",
        "assigned_to": "HR Executive"
    },

    4: {
        "id": 4,
        "employee": "Sneha",
        "title": "Laptop request",
        "description": "I need a laptop for my work",
        "category": "ASSET_REQUEST",
        "status": "NEW",
        "assigned_to": None
    },

    5: {
        "id": 5,
        "employee": "Amit",
        "title": "Onboarding request",
        "description": "Complete my employee onboarding process",
        "category": "ONBOARDING_REQUEST",
        "status": "RESOLVED",
        "assigned_to": "HR Executive"
    }
}


# Request schema
class ServiceRequestCreate(BaseModel):
    employee: str
    title: str
    description: str
    category: str
    status: str = "NEW"
    assigned_to: str | None = None


# Response schema
class ServiceRequestResponse(ServiceRequestCreate):
    id: int


# Get all requests
@app.get("/requests")
def get_all_requests():
    return list(db.values())


# Get request by ID
@app.get("/requests/{id}")
def get_request(id: int):
    if id not in db:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    return db[id]


# Create new request
@app.post(
    "/requests",
    status_code=201,
    response_model=ServiceRequestResponse
)
def create_request(request: ServiceRequestCreate):

    new_id = max(db.keys(), default=0) + 1

    db[new_id] = {
        "id": new_id,
        **request.model_dump()
    }

    return db[new_id]


# Update request
@app.put(
    "/requests/{id}",
    response_model=ServiceRequestResponse
)
def update_request(id: int, request: ServiceRequestCreate):

    if id not in db:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    db[id] = {
        "id": id,
        **request.model_dump()
    }

    return db[id]


# Delete request
@app.delete("/requests/{id}")
def delete_request(id: int):

    if id not in db:
        raise HTTPException(
            status_code=404,
            detail="Service request not found"
        )

    del db[id]

    return {
        "message": "HR service request deleted successfully"
    }