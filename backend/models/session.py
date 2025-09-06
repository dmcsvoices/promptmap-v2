"""
Session model for PromptMap V2
"""

from sqlalchemy import Column, Integer, String, DateTime, ARRAY, DECIMAL, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from typing import List, Optional
from datetime import datetime

from database.connection import Base


class SessionModel(Base):
    """Test session model"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    model = Column(String(100), nullable=False)
    model_type = Column(String(50), nullable=False)  # openai, anthropic, ollama
    iterations = Column(Integer, default=5)
    severities = Column(ARRAY(String), default=['low', 'medium', 'high'])
    status = Column(String(50), default='pending')  # pending, running, completed, failed
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    overall_asr = Column(DECIMAL(5, 2), default=0.00)
    notes = Column(Text, nullable=True)
    
    # Relationships
    system_prompts = relationship("SystemPromptModel", back_populates="session", cascade="all, delete-orphan")
    test_results = relationship("TestResultModel", back_populates="session", cascade="all, delete-orphan")
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'model': self.model,
            'model_type': self.model_type,
            'iterations': self.iterations,
            'severities': self.severities,
            'status': self.status,
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'failed_tests': self.failed_tests,
            'overall_asr': float(self.overall_asr) if self.overall_asr else 0.0,
            'notes': self.notes
        }