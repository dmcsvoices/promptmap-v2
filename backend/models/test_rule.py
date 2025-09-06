"""
Test Rule model for PromptMap V2
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


class TestRuleModel(Base):
    """Test rule model"""
    __tablename__ = "test_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    type = Column(String(100), nullable=False)  # prompt_stealing, distraction, etc.
    severity = Column(String(50), nullable=False)  # low, medium, high
    prompt = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    test_results = relationship("TestResultModel", back_populates="rule")
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'severity': self.severity,
            'prompt': self.prompt,
            'description': self.description,
            'enabled': self.enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }