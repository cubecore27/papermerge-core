import logging
import uuid
from datetime import datetime
from typing import Annotated

from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, HTTPException, Security, Depends, status

from papermerge.core import schema, utils, dbapi, orm
from papermerge.core.features.auth import get_current_user
from papermerge.core.features.auth import scopes
from papermerge.core.routers.common import OPEN_API_GENERIC_JSON_DETAIL
from papermerge.core.db import common as dbapi_common
from papermerge.core import exceptions as exc
from papermerge.core.db.engine import get_db
from papermerge.core.features.document.response import DocumentFileResponse
from papermerge.core.features.useractivity.db.orm import UserActivityStats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/document-versions", tags=["document-versions"])


@router.api_route(
    "/{document_version_id}/download",
    methods=["GET", "HEAD"],
    response_class=DocumentFileResponse,
    status_code=200,
    responses={
        200: {
            "description": "Binary file download",
            "content": {
                "application/octet-stream": {},
                "application/pdf": {},
                "image/png": {},
                "image/jpeg": {},
                "image/tiff": {}
            }
        },
        404: {
            "description": "Document version not found"
        }
    }
)
@utils.docstring_parameter(scope=scopes.DOCUMENT_DOWNLOAD)
async def download_document_version(
    document_version_id: uuid.UUID,
    user: Annotated[
        schema.User, Security(get_current_user, scopes=[scopes.DOCUMENT_DOWNLOAD])
    ],
    db_session: AsyncSession = Depends(get_db),
):
    """Downloads given document version

    Required scope: `{scope}`
    """
    try:
        # Fetch the file node ID from the document version
        doc_id = await dbapi.get_doc_id_from_doc_ver_id(
            db_session, doc_ver_id=document_version_id
        )

        if not await dbapi_common.has_node_perm(
                db_session,
                node_id=doc_id,
                codename=scopes.DOCUMENT_DOWNLOAD,
                user_id=user.id,
        ):
            raise exc.HTTP403Forbidden()

        doc_ver: orm.DocumentVersion = await dbapi.get_doc_ver(
            db_session,
            document_version_id=document_version_id,
        )
    except NoResultFound:
        error = schema.Error(messages=["Document version not found"])
        raise HTTPException(status_code=404, detail=error.model_dump())

    if not doc_ver.file_path.exists():
        error = schema.Error(messages=["Document version file not found"])
        raise HTTPException(status_code=404, detail=error.model_dump())

    # --- User activity logging for download ---
    try:
        new_activity = UserActivityStats(
            user_id=user.id,
            node_id=doc_id,  # <- use node ID
            action_type="document_download",
            timestamp=datetime.utcnow(),
        )
        db_session.add(new_activity)
        # await db_session.commit()
    except Exception as e:
        logger.warning(f"Failed to log download activity for user {user.id}: {e}")

    return DocumentFileResponse(
        doc_ver.file_path,
        filename=doc_ver.file_name,
        content_disposition_type="attachment"
    )


@router.get(
    "/{doc_ver_id}/download-url",
    responses={
        status.HTTP_403_FORBIDDEN: {
            "description": f"No `{scopes.DOCUMENT_DOWNLOAD}` permission on the node",
            "content": OPEN_API_GENERIC_JSON_DETAIL,
        }
    },
)
@utils.docstring_parameter(scope=scopes.DOCUMENT_DOWNLOAD)
async def get_doc_ver_download_url(
    doc_ver_id: uuid.UUID,
    user: Annotated[schema.User, Security(get_current_user, scopes=[scopes.DOCUMENT_DOWNLOAD])],
    db_session: AsyncSession = Depends(get_db),
) -> schema.DownloadURL:
    """
    Returns URL for downloading given document version

    Required scope: `{scope}`
    """
    try:
        doc_id = await dbapi.get_doc_id_from_doc_ver_id(
            db_session, doc_ver_id=doc_ver_id
        )

        if not await dbapi_common.has_node_perm(
            db_session,
            node_id=doc_id,
            codename=scopes.NODE_VIEW,
            user_id=user.id,
        ):
            raise exc.HTTP403Forbidden()

        result = await dbapi.get_doc_version_download_url(
            db_session,
            doc_ver_id=doc_ver_id,
        )

        # --- Log getting presigned download URL ---
        new_activity = UserActivityStats(
            user_id=user.id,
            node_id=doc_id,  # <- use node ID
            action_type="document_download_url",
            timestamp=datetime.utcnow(),
        )
        db_session.add(new_activity)
        await db_session.commit()

    except NoResultFound:
        raise exc.HTTP404NotFound()
    except Exception as e:
        logger.warning(f"Failed to log download-url activity for user {user.id}: {e}")

    return result


@router.get(
    "/{document_version_id}",
    response_model=schema.DocumentVersion
)
@utils.docstring_parameter(scope=scopes.NODE_VIEW)
async def document_version_details(
    document_version_id: uuid.UUID,
    user: Annotated[schema.User, Security(get_current_user, scopes=[scopes.NODE_VIEW])],
    db_session=Depends(get_db),
):
    """Get document version details

    Required scope: `{scope}`
    """
    try:
        doc_id = await dbapi.get_doc_id_from_doc_ver_id(
            db_session, doc_ver_id=document_version_id
        )

        if not await dbapi_common.has_node_perm(
                db_session,
                node_id=doc_id,
                codename=scopes.NODE_VIEW,
                user_id=user.id,
        ):
            raise exc.HTTP403Forbidden()

        doc_ver: orm.DocumentVersion = await dbapi.get_doc_ver(
            db_session, document_version_id=document_version_id
        )
    except NoResultFound:
        error = schema.Error(messages=["Page not found"])
        raise HTTPException(status_code=404, detail=error.model_dump())

    return schema.DocumentVersion.model_validate(doc_ver)


@router.get(
    "/{document_id}/total-size",
    response_model=schema.TotalDocumentSize,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "Document not found",
            "content": OPEN_API_GENERIC_JSON_DETAIL,
        }
    },
)
@utils.docstring_parameter(scope=scopes.NODE_VIEW)
async def calculate_total_document_size(
    document_id: uuid.UUID,
    user: Annotated[schema.User, Security(get_current_user, scopes=[scopes.NODE_VIEW])],
    db_session: AsyncSession = Depends(get_db),
) -> schema.TotalDocumentSize:
    """
    Calculate the total size of all versions of a document.

    Required scope: `{scope}`
    """
    try:
        # Check if the user has permission to view the document
        if not await dbapi_common.has_node_perm(
            db_session,
            node_id=document_id,
            codename=scopes.NODE_VIEW,
            user_id=user.id,
        ):
            raise exc.HTTP403Forbidden()

        # Query to calculate the total size
        result = await db_session.execute(
            dbapi_common.select_sum_document_versions_size(document_id)
        )
        total_size = result.scalar()

        if total_size is None:
            raise exc.HTTP404NotFound()

    except NoResultFound:
        raise exc.HTTP404NotFound()

    return schema.TotalDocumentSize(total_size=total_size)


@router.get(
    "/total-size",
    response_model=schema.TotalDocumentSize,
    responses={
        status.HTTP_404_NOT_FOUND: {
            "description": "No document versions found",
            "content": OPEN_API_GENERIC_JSON_DETAIL,
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
        # Query to calculate the total size of all document versions
        result = await db_session.execute(
            dbapi_common.select_sum_all_document_versions_size()
        )
        total_size = result.scalar()

        if total_size is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No document versions found",
            )

    except NoResultFound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No document versions found",
        )

    return schema.TotalDocumentSize(total_size=total_size)
