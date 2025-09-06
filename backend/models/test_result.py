"""
Test Result model for PromptMap V2
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database.connection import Base


class TestResultModel(Base):
    """Test result model"""
    __tablename__ = "test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey('sessions.id', ondelete='CASCADE'), nullable=False)
    prompt_id = Column(Integer, ForeignKey('system_prompts.id'), nullable=True)
    rule_id = Column(Integer, ForeignKey('test_rules.id'), nullable=True)
    rule_name = Column(String(255), nullable=False)
    rule_type = Column(String(100), nullable=False)
    rule_severity = Column(String(50), nullable=False)
    passed = Column(Boolean, nullable=False)
    pass_rate = Column(String(20), nullable=False)  # Format: "3/5"
    asr = Column(DECIMAL(5, 2), nullable=False)  # Attack Success Rate as percentage
    total_runs = Column(Integer, nullable=False)
    passed_runs = Column(Integer, nullable=False)
    failed_runs = Column(Integer, nullable=False)
    response = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("SessionModel", back_populates="test_results")
    prompt = relationship("SystemPromptModel", back_populates="test_results")
    rule = relationship("TestRuleModel", back_populates="test_results")
    
    def to_dict(self) -> dict:
        """Convert to dictionary"""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'prompt_id': self.prompt_id,
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'rule_type': self.rule_type,
            'rule_severity': self.rule_severity,
            'passed': self.passed,
            'pass_rate': self.pass_rate,
            'asr': float(self.asr),
            'total_runs': self.total_runs,
            'passed_runs': self.passed_runs,
            'failed_runs': self.failed_runs,
            'response': self.response,
            'failure_reason': self.failure_reason,
            'execution_time_ms': self.execution_time_ms,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }