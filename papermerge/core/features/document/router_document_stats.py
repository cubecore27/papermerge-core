# filepath: \\wsl.localhost\Ubuntu\home\core\PM_final\papermerge-core\papermerge\core\features\document\router_document_stats.py

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from papermerge.core import schema
from papermerge.core.db.engine import get_db
from uuid import UUID  # Import UUID for type hinting

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

@router.get(
    "/user-total-size/{user_id}",
    response_model=schema.TotalDocumentSize,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "No document versions found for the specified user",
        }
    },
)
async def calculate_user_total_table_size(
    user_id: UUID,
    db_session: AsyncSession = Depends(get_db),
) -> schema.TotalDocumentSize:
    """
    Calculate the total size of all document versions for a specific user.
    """
    try:
        # Updated SQL query to join with the nodes and documents tables
        query = text(
            """
            SELECT SUM(dv.size)
            FROM document_versions dv
            JOIN documents d ON dv.document_id = d.node_id
            JOIN nodes n ON d.node_id = n.id
            WHERE n.user_id = :user_id
            """
        )
        result = await db_session.execute(query, {"user_id": str(user_id)})
        total_size = result.scalar()

        if total_size is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No document versions found for user ID {user_id}",
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating total size for user ID {user_id}: {str(e)}",
        )

    return schema.TotalDocumentSize(total_size=total_size)