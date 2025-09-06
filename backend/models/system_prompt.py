"""
System Prompt model for PromptMap V2
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from database.connection import Base


class SystemPromptModel(Base):
    """System prompt model"""
    __tablename__ = "system_prompts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=True)  # OpenAI embedding size
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    word_count = Column(Integer, nullable=True)
    char_count = Column(Integer, nullable=True)
    
    # Relationships
    session = relationship("SessionModel", back_populates="system_prompts")
    test_results = relationship("TestResultModel", back_populates="prompt")
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'word_count': self.word_count,
            'char_count': self.char_count
        }