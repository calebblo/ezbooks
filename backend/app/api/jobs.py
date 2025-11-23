# backend/app/api/jobs.py

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from uuid import uuid4

from app.core.aws import table_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])

DEMO_USER_ID = "demo-user"


class JobIn(BaseModel):
    name: str
    clientName: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = "ACTIVE"  # ACTIVE / COMPLETED / ARCHIVED


class JobOut(JobIn):
    jobId: str
    userId: str


@router.get("/", response_model=List[JobOut])
def list_jobs():
    """Return all jobs for the demo user."""
    resp = table_jobs.query(
        KeyConditionExpression="userId = :uid",
        ExpressionAttributeValues={":uid": DEMO_USER_ID},
    )
    return resp.get("Items", [])


@router.post("/", response_model=JobOut)
def create_job(job: JobIn):
    """Create a new job for the demo user."""
    job_id = str(uuid4())

    item = {
        "userId": DEMO_USER_ID,
        "jobId": job_id,
        "name": job.name,
        "clientName": job.clientName,
        "address": job.address,
        "status": job.status,
    }

    table_jobs.put_item(Item=item)
    return item
