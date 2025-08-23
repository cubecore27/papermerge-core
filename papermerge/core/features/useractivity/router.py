from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from papermerge.core.db.engine import get_db
from papermerge.core.features.useractivity.db.orm import UserActivityStats

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
