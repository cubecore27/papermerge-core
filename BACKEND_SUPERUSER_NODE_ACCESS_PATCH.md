# Backend Superuser Node Access Patch

## Summary
This patch allows superusers to access any node (folder/document) via the `/nodes/{parent_id}` endpoint, regardless of ownership or sharing. This is required for admin/reporting features in the frontend.

## Files Changed
- `papermerge/core/features/nodes/router.py`
- `papermerge/core/db/common.py`

## Details

### 1. `router.py` (get_node)
**Before:**
```python
if not await dbapi_common.has_node_perm(
    db_session,
    node_id=parent_id,
    codename=scopes.NODE_VIEW,
    user_id=user.id,
):
    raise exc.HTTP403Forbidden()
```

**After:**
```python
# --- PATCH: Allow superusers to access any node ---
if not user.is_superuser:
    if not await dbapi_common.has_node_perm(
        db_session,
        node_id=parent_id,
        codename=scopes.NODE_VIEW,
        user_id=user.id,
    ):
        raise exc.HTTP403Forbidden()
# --- END PATCH ---
```

### 2. `common.py` (has_node_perm)
**Comment added:**
```python
# --- PATCH NOTE: To allow superuser bypass, add is_superuser param and return True if set. ---
```

## How to Undo
- In `router.py`, remove the `if not user.is_superuser:` block and restore the original permission check.
- The comment in `common.py` is informational and can be removed safely.

## Why
This change is necessary to allow admin users to view all users' documents/folders for reporting and management purposes, matching typical admin expectations.

---
