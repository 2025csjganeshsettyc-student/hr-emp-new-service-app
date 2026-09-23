from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from pymongo import MongoClient
from bson import ObjectId

# app
app = FastAPI()

# db config
URL = "mongodb://127.0.0.1:27017"
client = MongoClient(URL)
db = client["hr_service_db"]
request_collection = db["service_requests"]


# schema
class ServiceRequestCreate(BaseModel):
    employee: str
    title: str
    description: str
    category: str
    status: str = "NEW"
    assigned_to: str | None = None


class ServiceRequestResponse(ServiceRequestCreate):
    id: str


# helper
def request_helper(doc):
    return {
        "id": str(doc["_id"]),
        "employee": doc["employee"],
        "title": doc["title"],
        "description": doc["description"],
        "category": doc["category"],
        "status": doc["status"],
        "assigned_to": doc["assigned_to"]
    }


# CREATE
@app.post("/requests", status_code=201, response_model=ServiceRequestResponse)
def request_create(payload: ServiceRequestCreate):
    request_dict = payload.model_dump()
    result = request_collection.insert_one(request_dict)

    new_request = request_collection.find_one(
        {"_id": result.inserted_id}
    )

    return request_helper(new_request)


# READ ALL
@app.get("/requests", response_model=list[ServiceRequestResponse])
def request_read_all():
    docs = request_collection.find()
    return [request_helper(doc) for doc in docs]


# READ BY ID
@app.get("/requests/{id}", response_model=ServiceRequestResponse)
def request_read_by_id(id: str):

    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=400,
            detail="Invalid Request ID"
        )

    doc = request_collection.find_one(
        {"_id": ObjectId(id)}
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Service Request Not Found"
        )

    return request_helper(doc)


# UPDATE
@app.put("/requests/{id}", response_model=ServiceRequestResponse)
def request_update(id: str, payload: ServiceRequestCreate):

    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=400,
            detail="Invalid Request ID"
        )

    request_dict = payload.model_dump()

    result = request_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": request_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Service Request Not Found"
        )

    new_request = request_collection.find_one(
        {"_id": ObjectId(id)}
    )

    return request_helper(new_request)


# DELETE
@app.delete("/requests/{id}")
def request_delete(id: str):

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
            detail="Service Request Not Found"
        )

    return {"message": "Service Request Deleted Successfully"}