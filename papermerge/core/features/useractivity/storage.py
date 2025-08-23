# storage.py
import sqlalchemy as sa
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession


from papermerge.core.db.engine import async_sessionmaker
from papermerge.core.features.document.db.orm import DocumentVersion

router = APIRouter(prefix="/storage", tags=["storage"])


async def get_async_session() -> AsyncSession:
    session = async_sessionmaker()  # Create a session instance
    try:
        yield session  # Yield the session for use
    finally:
        await session.close()  # Ensure the session is closed


@router.get("/usage")
async def get_storage_usage(session: AsyncSession = Depends(get_async_session)):
    # ORM-style query: SUM over DocumentVersion.size
    total_bytes = await session.scalar(
        sa.select(sa.func.coalesce(sa.func.sum(DocumentVersion.size), 0))
    )

    return {
        "total_system_size": total_bytes
    }