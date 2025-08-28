from fastapi import APIRouter, Depends, Security, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, join
from sqlalchemy.sql import text
from sqlalchemy.sql import func

from papermerge.core.db.engine import get_db
from papermerge.core.orm import Activity, User, UserActivityStats  # Correct import for Activity and User
from papermerge.core.features.auth import get_current_user
from papermerge.core import schema

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

@router.get("/all-activities")
async def get_all_activities(
    db_session: AsyncSession = Depends(get_db),
):
    """
    Get all activity records with usernames and user IDs.

    Returns:
      - List of activity records with user ID, username, action, and timestamps.
    """
    stmt = (
        select(
            Activity.id,
            User.id.label("user_id"),  # Include user_id
            User.username.label("username"),
            Activity.node_id,
            Activity.version_id,
            Activity.action,
            Activity.created_at,
        )
        .select_from(join(Activity, User, Activity.user_id == User.id))
    )

    result = await db_session.execute(stmt)
    activities = result.fetchall()

    # Convert rows to dictionaries
    return [dict(row._mapping) for row in activities]

@router.get("/stats/tags-by-group")
async def tags_by_group(
    db_session: AsyncSession = Depends(get_db),
):
    """
    Get aggregate data for tags grouped by group name using raw SQL.

    Returns:
      - Nested data structure with group_name as keys and tag counts as values.
    """
    raw_sql = """
    SELECT
        g.name AS group_name,
        t.id AS tag_id,
        t.name AS tag_name,
        COUNT(nt.node_id) AS doc_count
    FROM tags t
    LEFT JOIN nodes_tags nt ON nt.tag_id = t.id
    LEFT JOIN groups g ON g.id = t.group_id
    WHERE t.group_id IS NOT NULL
    GROUP BY g.name, t.id, t.name
    ORDER BY g.name, doc_count DESC;
    """

    result = await db_session.execute(text(raw_sql))
    rows = result.fetchall()

    # Nest data by group_name
    grouped_data = {}
    for row in rows:
        group_name = row.group_name
        if group_name not in grouped_data:
            grouped_data[group_name] = []
        grouped_data[group_name].append(
            {"tag": row.tag_name, "count": row.doc_count}
        )

    return grouped_data

@router.get("/stats/summary")
async def get_stats_summary(
    db_session: AsyncSession = Depends(get_db),
):
    """
    Get a summary of active users, shared documents, and roles.

    Returns:
      - active_users: List of users with their document counts.
      - shared_documents: List of shared documents with sharing details.
      - roles_summary: List of roles with user and document access counts.
    """
    raw_sql = """
    SELECT au.active_users,
           sd.shared_documents,
           rs.roles_summary
    FROM
        -- Active users
        (SELECT json_agg(au) AS active_users
         FROM (
             SELECT n.user_id,
                    u.username,
                    COUNT(d.node_id) AS document_count
             FROM nodes n
             JOIN documents d ON d.node_id = n.id
             JOIN users u ON u.id = n.user_id
             WHERE n.created_at >= '2025-08-01 00:00:00'
               AND n.created_at <= '2025-08-29 23:59:59'
             GROUP BY n.user_id, u.username
         ) au) au
    CROSS JOIN
        -- Shared documents
        (SELECT json_agg(sd) AS shared_documents
         FROM (
             SELECT sn.node_id,
                    sn.user_id AS shared_with_user,
                    g.name AS shared_with_group,
                    COUNT(*) OVER (PARTITION BY sn.node_id) AS share_count
             FROM shared_nodes sn
             LEFT JOIN groups g ON sn.group_id = g.id
         ) sd) sd
    CROSS JOIN
        -- Roles summary
        (SELECT json_agg(rs) AS roles_summary
         FROM (
             SELECT r.id AS role_id,
                    r.name AS role_name,
                    COUNT(DISTINCT ur.user_id) AS total_users,
                    COUNT(DISTINCT n.id) AS total_docs_accessed
             FROM roles r
             LEFT JOIN users_roles ur ON ur.role_id = r.id
             LEFT JOIN nodes n ON n.user_id = ur.user_id
             GROUP BY r.id, r.name
         ) rs) rs;
    """

    try:
        result = await db_session.execute(text(raw_sql))
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No data found for the requested summary.",
            )

        # Extract the JSON fields from the result
        return {
            "active_users": row.active_users,
            "shared_documents": row.shared_documents,
            "roles_summary": row.roles_summary,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching stats summary: {str(e)}",
        )

@router.get("/stats/advanced-summary")
async def get_advanced_stats_summary(
    db_session: AsyncSession = Depends(get_db),
):
    """
    Get an advanced summary of document statistics.

    Returns:
      - per_user: Aggregated stats per user.
      - per_group: Aggregated stats per group.
      - per_document_type: Aggregated stats per document type.
      - largest_documents: Top 10 largest documents.
      - file_size_distribution: Distribution of file sizes.
    """
    raw_sql = """
    WITH per_user_agg AS (
        SELECT 
            u.id AS user_id,
            u.username,
            SUM(dv.size) AS total_bytes,
            COUNT(DISTINCT d.node_id) AS total_documents
        FROM users u
        JOIN nodes n ON n.user_id = u.id
        JOIN documents d ON d.node_id = n.id
        JOIN document_versions dv ON dv.document_id = d.node_id
        GROUP BY u.id, u.username
    ),
    per_group_agg AS (
        SELECT 
            g.id AS group_id,
            g.name AS group_name,
            SUM(dv.size) AS total_bytes,
            COUNT(DISTINCT d.node_id) AS total_documents
        FROM groups g
        JOIN nodes n ON n.group_id = g.id
        JOIN documents d ON d.node_id = n.id
        JOIN document_versions dv ON dv.document_id = d.node_id
        GROUP BY g.id, g.name
    ),
    per_doc_type_agg AS (
        SELECT 
            dt.id AS document_type_id,
            dt.name AS document_type_name,
            SUM(dv.size) AS total_bytes,
            COUNT(DISTINCT d.node_id) AS total_documents
        FROM document_types dt
        JOIN documents d ON d.document_type_id = dt.id
        JOIN document_versions dv ON dv.document_id = d.node_id
        GROUP BY dt.id, dt.name
    ),
    largest_docs AS (
        SELECT d.node_id, n.title, SUM(dv.size) AS total_size_bytes, COUNT(dv.id) AS version_count
        FROM documents d
        JOIN nodes n ON n.id = d.node_id
        JOIN document_versions dv ON dv.document_id = d.node_id
        GROUP BY d.node_id, n.title
        ORDER BY SUM(dv.size) DESC
        LIMIT 10
    ),
    file_size_distribution AS (
        SELECT
            CASE
                WHEN dv.size < 1000000 THEN 'small (<1MB)'
                WHEN dv.size BETWEEN 1000000 AND 10000000 THEN 'medium (1-10MB)'
                ELSE 'large (>10MB)'
            END AS size_category,
            COUNT(*) AS file_count,
            SUM(dv.size) AS total_bytes
        FROM document_versions dv
        GROUP BY size_category
    )
    SELECT 
        (SELECT json_agg(pu) FROM per_user_agg pu) AS per_user,
        (SELECT json_agg(pg) FROM per_group_agg pg) AS per_group,
        (SELECT json_agg(pd) FROM per_doc_type_agg pd) AS per_document_type,
        (SELECT json_agg(ld) FROM largest_docs ld) AS largest_documents,
        (SELECT json_agg(fsd) FROM file_size_distribution fsd) AS file_size_distribution;
    """

    try:
        result = await db_session.execute(text(raw_sql))
        row = result.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No data found for the requested summary.",
            )

        # Extract the JSON fields from the result
        return {
            "per_user": row.per_user,
            "per_group": row.per_group,
            "per_document_type": row.per_document_type,
            "largest_documents": row.largest_documents,
            "file_size_distribution": row.file_size_distribution,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching advanced stats summary: {str(e)}",
        )
