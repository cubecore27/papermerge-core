from fastapi import APIRouter, Depends, Security
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.sql import text  # Add this import
from papermerge.core.db.engine import get_db
from papermerge.core.features.useractivity.db.orm import UserActivityStats
from papermerge.core.features.auth import get_current_user
from papermerge.core import schema
from papermerge.core.features.auth.scopes import SCOPES

router = APIRouter(prefix="/stats", tags=["user-activity"])

@router.get("/summary")
async def user_activity_summary(
    db_session: AsyncSession = Depends(get_db),
):
    """
    Returns:
      - total_uploads (all document_upload rows)
      - total_deletions (document_upload rows with node_id IS NULL)
      - total_downloads (all document_download_url rows)
    """

    # total uploads
    uploads_stmt = select(func.count()).where(
        UserActivityStats.action_type == "document_upload"
    )

    # inferred deletions
    deletions_stmt = select(func.count()).where(
        (UserActivityStats.action_type == "document_upload")
        & (UserActivityStats.node_id.is_(None))
    )

    # downloads (using document_download_url)
    downloads_stmt = select(func.count()).where(
        UserActivityStats.action_type == "document_download_url"
    )

    uploads_count = (await db_session.execute(uploads_stmt)).scalar() or 0
    deletions_count = (await db_session.execute(deletions_stmt)).scalar() or 0
    downloads_count = (await db_session.execute(downloads_stmt)).scalar() or 0

    return {
        "total_uploads": uploads_count,
        "total_deletions": deletions_count,
        "total_downloads": downloads_count,
    }

@router.get("/user-documents")
async def get_user_documents(
    user: schema.User = Security(get_current_user),  # Removed `scopes` parameter
    db_session: AsyncSession = Depends(get_db),
):
    """
    Get all documents associated with the current user.

    Returns:
      - List of documents owned by the user.
    """
    stmt = text("""
    SELECT *
    FROM nodes
    WHERE user_id = :user_id
    """)  # Wrap the raw SQL in text()

    result = await db_session.execute(stmt, {"user_id": str(user.id)})
    documents = result.fetchall()

    # Convert rows to dictionaries
    return [dict(row._mapping) for row in documents]
