from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import AuditLog

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("/")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return [{
        "id": l.id,
        "userId": l.user_id,
        "userName": l.user_name,
        "userRole": l.user_role,
        "action": l.action,
        "timestamp": l.timestamp.isoformat(),
        "details": l.details
    } for l in logs]
