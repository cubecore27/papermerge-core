# filepath: \\wsl.localhost\Ubuntu\home\core\PM_final\papermerge-core\papermerge\core\features\document\router_document_stats.py

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from papermerge.core import schema
from papermerge.core.db.engine import get_db

router = APIRouter(prefix="/document-stats", tags=["document-stats"])

@router.get(
    "/total-size",
    response_model=schema.TotalDocumentSize,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "No document versions found",
        }
    },
)
async def calculate_total_table_size(
    db_session: AsyncSession = Depends(get_db),
) -> schema.TotalDocumentSize:
    """
    Calculate the total size of all document versions in the table.
    """
    try:
        # Raw SQL query to calculate the total size of all document versions
        query = text("SELECT SUM(size) FROM document_versions")
        result = await db_session.execute(query)
        total_size = result.scalar()

        if total_size is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No document versions found",
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating total size: {str(e)}",
        )

    return schema.TotalDocumentSize(total_size=total_size)