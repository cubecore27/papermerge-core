import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from papermerge.core.db.base import Base

class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    node_id = Column(PG_UUID(as_uuid=True), ForeignKey("nodes.id"), nullable=False)
    event_type = Column(String, nullable=False)  # "upload", "download", "delete"
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(String, nullable=True)