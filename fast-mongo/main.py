from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel


from bson import ObjectId

import jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pwdlib import PasswordHash
from datetime import datetime, timedelta, timezone

# 1 = Employee
# 2 = HR Executive
# 3 = HR Manager
# 4 = Admin



app = FastAPI()


# =========================
# MongoDB
# =========================

import os
from pymongo import MongoClient

URL = os.getenv("mongodb+srv://j_ganesh_setty:Ganesh2008@cluster1.6dgt2ay.mongodb.net/?appName=Cluster1")

client = MongoClient(URL)

db = client["hr_service_db"]

request_collection = db["service_requests"]
user_collection = db["users"]


# =========================
# Security
# =========================

password_hash = PasswordHash.recommended()

SECRET_KEY = "HRServicePortalSecurityKey-ChangeThis"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINS = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


# =========================
# Pydantic Schemas
# =========================

# Service Request
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


# User
class UserCreate(BaseModel):
    username: str
    password: str
    role: int


# Token
class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# =========================
# Helpers
# =========================

def request_helper(request):
    return {
        "id": str(request["_id"]),
        "employee": request["employee"],
        "title": request["title"],
        "description": request["description"],
        "category": request["category"],
        "status": request["status"],
        "assigned_to": request.get("assigned_to")
    }


def user_helper(user):
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "role": user["role"]
    }


# =========================
# JWT
# =========================

def create_token(username: str, role: int):

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=TOKEN_EXPIRE_MINS
    )

    payload = {
        "sub": username,
        "role": role,
        "exp": expire
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    token: str = Depends(oauth2_scheme)
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")
        role = payload.get("role")

        if username is None or role is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

    except jwt.ExpiredSignatureError:

        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )

    except jwt.InvalidTokenError:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = user_collection.find_one(
        {"username": username}
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


# =========================
# Role Authorization
# =========================

def require_roles(*allowed_roles):

    def check_role(
        current_user=Depends(get_current_user)
    ):

        if current_user["role"] not in allowed_roles:

            raise HTTPException(
                status_code=403,
                detail="Permission denied"
            )

        return current_user

    return check_role


# =========================
# USERS
# =========================

@app.post("/users", status_code=201)
def create_user(user: UserCreate):

    existing_user = user_collection.find_one(
        {"username": user.username}
    )

    if existing_user:

        raise HTTPException(
            status_code=409,
            detail="Username already exists"
        )

    hashed_password = password_hash.hash(
        user.password
    )

    user_data = {
        "username": user.username,
        "password": hashed_password,
        "role": user.role
    }

    result = user_collection.insert_one(user_data)

    new_user = user_collection.find_one(
        {"_id": result.inserted_id}
    )

    return user_helper(new_user)


# =========================
# LOGIN
# =========================

@app.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends()
):

    user = user_collection.find_one(
        {"username": form_data.username}
    )

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not password_hash.verify(
        form_data.password,
        user["password"]
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_token(
        user["username"],
        user["role"]
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# =========================
# CREATE REQUEST
# =========================

@app.post(
    "/requests",
    status_code=201,
    response_model=ServiceRequestResponse
)
def request_create(
    payload: ServiceRequestCreate,
    current_user=Depends(
        require_roles(1, 2, 3, 4)
    )
):

    request_data = {
        "employee": current_user["username"],
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "status": "NEW",
        "assigned_to": None
    }

    result = request_collection.insert_one(
        request_data
    )

    new_request = request_collection.find_one(
        {"_id": result.inserted_id}
    )

    return request_helper(new_request)


# =========================
# READ ALL REQUESTS
# =========================

@app.get(
    "/requests",
    response_model=list[ServiceRequestResponse]
)
def request_read_all(
    current_user=Depends(
        require_roles(1, 2, 3, 4)
    )
):

    # Employee sees only own requests
    if current_user["role"] == 1:

        requests = request_collection.find(
            {"employee": current_user["username"]}
        )

    # HR Executive, Manager and Admin see all
    else:

        requests = request_collection.find()

    return [
        request_helper(request)
        for request in requests
    ]


# =========================
# READ REQUEST BY ID
# =========================

@app.get(
    "/requests/{id}",
    response_model=ServiceRequestResponse
)
def request_read_by_id(
    id: str,
    current_user=Depends(
        require_roles(1, 2, 3, 4)
    )
):

    if not ObjectId.is_valid(id):

        raise HTTPException(
            status_code=400,
            detail="Invalid Request ID"
        )

    request = request_collection.find_one(
        {"_id": ObjectId(id)}
    )

    if not request:

        raise HTTPException(
            status_code=404,
            detail="Service Request not found"
        )

    # Employee can see only own request
    if (
        current_user["role"] == 1
        and request["employee"]
        != current_user["username"]
    ):

        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    return request_helper(request)


# =========================
# UPDATE REQUEST
# HR Executive / Manager / Admin
# =========================

@app.put(
    "/requests/{id}",
    response_model=ServiceRequestResponse
)
def request_update(
    id: str,
    payload: ServiceRequestUpdate,
    current_user=Depends(
        require_roles(2, 3, 4)
    )
):

    if not ObjectId.is_valid(id):

        raise HTTPException(
            status_code=400,
            detail="Invalid Request ID"
        )

    request_data = payload.model_dump()

    result = request_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": request_data}
    )

    if result.matched_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Service Request not found"
        )

    updated_request = request_collection.find_one(
        {"_id": ObjectId(id)}
    )

    return request_helper(updated_request)


# =========================
# EMPLOYEE CONFIRMS RESOLUTION
# RESOLVED -> CLOSED
# =========================

@app.put(
    "/requests/{id}/confirm",
    response_model=ServiceRequestResponse
)
def confirm_request(
    id: str,
    current_user=Depends(
        require_roles(1)
    )
):

    if not ObjectId.is_valid(id):

        raise HTTPException(
            status_code=400,
            detail="Invalid Request ID"
        )

    request = request_collection.find_one(
        {"_id": ObjectId(id)}
    )

    if not request:

        raise HTTPException(
            status_code=404,
            detail="Service Request not found"
        )

    if request["employee"] != current_user["username"]:

        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    if request["status"] != "RESOLVED":

        raise HTTPException(
            status_code=400,
            detail="Request is not resolved yet"
        )

    request_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": "CLOSED"}}
    )

    updated_request = request_collection.find_one(
        {"_id": ObjectId(id)}
    )

    return request_helper(updated_request)


# =========================
# DELETE REQUEST
# Admin only
# =========================

@app.delete("/requests/{id}")
def request_delete(
    id: str,
    current_user=Depends(
        require_roles(4)
    )
):

    if not ObjectId.is_valid(id):

        raise HTTPException(
            status_code=400,
            detail="Invalid Request ID"
        )

    result = request_collection.delete_one(
        {"_id": ObjectId(id)}
    )

    if result.deleted_count == 0:

        raise HTTPException(
            status_code=404,
            detail="Service Request not found"
        )

    return {
        "message":
        "Service Request deleted successfully"
    }
    
#     | Role         | Create | View | Update | Confirm | Delete |
# | ------------ | ------ | ---- | ------ | ------- | ------ |
# | Employee     | Own    | Own  | ❌      | ✅       | ❌      |
# | HR Executive | ✅      | All  | ✅      | ❌       | ❌      |
# | HR Manager   | ✅      | All  | ✅      | ❌       | ❌      |
# | Admin        | ✅      | All  | ✅      | ❌       | ✅      |
