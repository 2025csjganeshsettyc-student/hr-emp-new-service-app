"""
HR Employee Service Portal - Backend API
This file contains the FastAPI backend, MongoDB connection, JWT authentication, and all API endpoints.
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
import jwt
from pwdlib import PasswordHash
from datetime import datetime, timedelta, timezone

# -------------------------------------------------------------------
# Configuration & Setup
# -------------------------------------------------------------------
app = FastAPI()

# Enable CORS so the React frontend can communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Database Connection (MongoDB)
# -------------------------------------------------------------------
# Connects to local MongoDB instance
client = MongoClient("mongodb://127.0.0.1:27017")
db = client["hr_service_db"]
request_collection = db["service_requests"]
user_collection = db["users"]

# -------------------------------------------------------------------
# Security Settings
# -------------------------------------------------------------------
password_hash = PasswordHash.recommended()
SECRET_KEY = "HRServicePortalSecurityKey-ChangeThis"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINS = 30
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Roles configuration:
# 1 = Employee, 2 = HR Executive, 3 = HR Manager, 4 = Admin

# -------------------------------------------------------------------
# Data Models (Pydantic)
# These define the structure of incoming requests and outgoing responses
# -------------------------------------------------------------------
class ServiceRequestCreate(BaseModel):
    title: str
    description: str
    category: str

class ServiceRequestUpdate(BaseModel):
    title: str
    description: str
    category: str
    status: str
    assigned_to: str | None = None

class ServiceRequestResponse(ServiceRequestUpdate):
    id: str
    employee: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: int

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

# -------------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------------
# Formats a raw MongoDB document into a clean Python dictionary for API responses
def format_request(request):
    return {
        "id": str(request["_id"]),
        "employee": request["employee"],
        "title": request["title"],
        "description": request["description"],
        "category": request["category"],
        "status": request["status"],
        "assigned_to": request.get("assigned_to")
    }

def format_user(user):
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "role": user["role"]
    }

# -------------------------------------------------------------------
# Authentication Logic
# -------------------------------------------------------------------
# Generates a signed JWT string containing user details and expiration
def create_token(username: str, role: int):
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINS)
    payload = {"sub": username, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# Decodes the JWT from the incoming request and retrieves the active user from the database
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username or payload.get("role") is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = user_collection.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Enforces role-based access control (RBAC). 
# Used as a dependency in protected routes (e.g., Depends(require_roles(1, 2)))
def require_roles(*allowed_roles):
    def check_role(current_user=Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Permission denied")
        return current_user
    return check_role

# -------------------------------------------------------------------
# API Routes
# -------------------------------------------------------------------

# 1. User Registration
@app.post("/users", status_code=201)
def create_user(user: UserCreate):
    if user_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=409, detail="Username already exists")
    
    hashed_password = password_hash.hash(user.password)
    user_data = {"username": user.username, "password": hashed_password, "role": user.role}
    
    result = user_collection.insert_one(user_data)
    new_user = user_collection.find_one({"_id": result.inserted_id})
    return format_user(new_user)

# 2. User Login
@app.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = user_collection.find_one({"username": form_data.username})
    if not user or not password_hash.verify(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_token(user["username"], user["role"])
    return {"access_token": token, "token_type": "bearer"}

# 3. Create Service Request
@app.post("/requests", status_code=201, response_model=ServiceRequestResponse)
def create_request(payload: ServiceRequestCreate, current_user=Depends(require_roles(1, 2, 3, 4))):
    request_data = {
        "employee": current_user["username"],
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "status": "NEW",
        "assigned_to": None
    }
    result = request_collection.insert_one(request_data)
    new_request = request_collection.find_one({"_id": result.inserted_id})
    return format_request(new_request)

# 4. Get All Requests (Role-based visibility)
@app.get("/requests", response_model=list[ServiceRequestResponse])
def get_all_requests(current_user=Depends(require_roles(1, 2, 3, 4))):
    # Employees (Role 1) only see their own requests. Others see all.
    query = {"employee": current_user["username"]} if current_user["role"] == 1 else {}
    requests = request_collection.find(query)
    return [format_request(req) for req in requests]

# 5. Get Request By ID
@app.get("/requests/{id}", response_model=ServiceRequestResponse)
def get_request_by_id(id: str, current_user=Depends(require_roles(1, 2, 3, 4))):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Request ID")
    
    request = request_collection.find_one({"_id": ObjectId(id)})
    if not request:
        raise HTTPException(status_code=404, detail="Service Request not found")
        
    # Employees cannot view requests belonging to others
    if current_user["role"] == 1 and request["employee"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    return format_request(request)

# 6. Update Request (HR/Admin only)
@app.put("/requests/{id}", response_model=ServiceRequestResponse)
def update_request(id: str, payload: ServiceRequestUpdate, current_user=Depends(require_roles(2, 3, 4))):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Request ID")
        
    result = request_collection.update_one({"_id": ObjectId(id)}, {"$set": payload.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service Request not found")
        
    return format_request(request_collection.find_one({"_id": ObjectId(id)}))

# 7. Confirm Request Resolution (Employee only)
@app.put("/requests/{id}/confirm", response_model=ServiceRequestResponse)
def confirm_request(id: str, current_user=Depends(require_roles(1))):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Request ID")
        
    request = request_collection.find_one({"_id": ObjectId(id)})
    if not request:
        raise HTTPException(status_code=404, detail="Service Request not found")
    if request["employee"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    if request["status"] != "RESOLVED":
        raise HTTPException(status_code=400, detail="Request is not resolved yet")
        
    request_collection.update_one({"_id": ObjectId(id)}, {"$set": {"status": "CLOSED"}})
    return format_request(request_collection.find_one({"_id": ObjectId(id)}))

# 8. Delete Request (Admin only)
@app.delete("/requests/{id}")
def delete_request(id: str, current_user=Depends(require_roles(4))):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Request ID")
        
    result = request_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service Request not found")
        
    return {"message": "Service Request deleted successfully"}
