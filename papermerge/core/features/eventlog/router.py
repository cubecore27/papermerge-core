from fastapi import APIRouter

router = APIRouter()

@router.get("/eventlog")
async def get_eventlog():
    """
    A simple endpoint for the eventlog feature.
    """
    return {"message": "Eventlog API is working!"}