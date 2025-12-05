from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from .database import Base
import uuid

class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    meta_info = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    chapters = relationship("Chapter", back_populates="project", cascade="all, delete-orphan")
    entity_versions = relationship("EntityVersion", back_populates="project", cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    detailed_outline = Column(Text, nullable=True) # Added for chapter-level outline
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    project = relationship("Project", back_populates="chapters")

class EntityVersion(Base):
    __tablename__ = "entity_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    entity_type = Column(String, nullable=False) # character, location, item, etc.
    entity_id = Column(String, nullable=False) # Logical ID, e.g., "char_elin"
    version = Column(Integer, nullable=False)
    
    # Time Travel Fields
    valid_from_chapter = Column(Integer, nullable=False)
    valid_to_chapter = Column(Integer, nullable=True) # NULL means valid until the end (or current)
    is_current = Column(Boolean, default=False, nullable=False)

    # Data & Vector
    payload_json = Column(JSONB, nullable=False)
    embedding = mapped_column(Vector(1536)) # pgvector type

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="entity_versions")

    def __repr__(self):
        return f"<EntityVersion(entity_id={self.entity_id}, version={self.version}, valid={self.valid_from_chapter}-{self.valid_to_chapter})>"
