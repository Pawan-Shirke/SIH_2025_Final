import csv
import io
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Field, SQLModel, create_engine, Session, select
import pandas as pd
from datetime import datetime
import json

# ====================================================================
# --- 1. CONFIGURATION (SWITCHED TO SQLITE) ---
# ====================================================================

# 🚨 DATABASE URL UPDATED: Using SQLite for file-based local storage.
# This will create a file named 'namaste.db' in your project directory.
DATABASE_URL = "sqlite:///./namaste.db"

# The engine now connects to the local database file.
engine = create_engine(DATABASE_URL, echo=False)

# FHIR System URI for the NAMASTE CodeSystem (Standard Compliant)
NAMASTE_SYSTEM_URI = "http://terminology.moh.gov.in/CodeSystem/NAMASTE"

# OAuth2 setup for ABHA token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ====================================================================
# --- 2. DATABASE MODELS (SQLModel) ---
# ====================================================================

class NAMASTE_Code(SQLModel, table=True):
    """Represents a single NAMASTE coded term."""
    # namaste_id serves as the primary key and the code value
    namaste_id: str = Field(primary_key=True)
    system: str  # e.g., 'Ayurveda', 'Siddha', 'Unani'
    term_english: str
    term_sanskrit: Optional[str] = None

class AuditLog(SQLModel, table=True):
    """Complies with India EHR Standards 2016: Audit Trail (ISO 27789)."""
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_abha_id: str
    action: str # e.g., 'NAMASTE_INGEST', 'PROBLEM_CREATE'
    resource_type: str
    resource_id: Optional[str] = None
    consent_reference: Optional[str] = None # Access Control link

# ====================================================================
# --- 3. DATABASE SETUP FUNCTIONS ---
# ====================================================================

def create_db_and_tables():
    """Initializes the database and tables."""
    print("Attempting to create/connect to SQLite database file...")
    SQLModel.metadata.create_all(engine)
    print("Database connection successful. Tables verified/created in namaste.db.")

def get_session():
    """Dependency for getting a database session."""
    with Session(engine) as session:
        yield session

# ====================================================================
# --- 4. FHIR & COMPLIANCE HELPERS ---
# ====================================================================

def create_fhir_codesystem(codes: List[NAMASTE_Code]) -> dict:
    """Generates a FHIR CodeSystem resource from the NAMASTE data."""
    concepts = []
    for code in codes:
        # Include designation for the traditional language/terminology
        concept = {
            "code": code.namaste_id,
            "display": f"[{code.system}] {code.term_english}",
            "designation": [
                {
                    "value": code.term_sanskrit,
                    "language": "hi-IN",
                    "use": {"code": "traditional-name"}
                }
            ]
        }
        concepts.append(concept)

    # Conceptual FHIR CodeSystem structure
    return {
        "resourceType": "CodeSystem",
        "id": "namaste-ayush",
        "url": NAMASTE_SYSTEM_URI,
        "version": "1.0.0",
        "name": "NAMASTE_Ayush_Codes",
        "status": "active",
        "content": "complete",
        "count": len(codes),
        "concept": concepts
    }

def log_audit_event(session: Session, user_abha_id: str, action: str, resource_type: str, resource_id: Optional[str] = None, consent_ref: Optional[str] = None):
    """Saves a compliance-required audit log entry."""
    audit_entry = AuditLog(
        user_abha_id=user_abha_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        consent_reference=consent_ref
    )
    session.add(audit_entry)
    session.commit()
    return audit_entry

# ====================================================================
# --- 5. FASTAPI APPLICATION ---
# ====================================================================

app = FastAPI(
    title="AyushTerm: NAMASTE FHIR Terminology Service (SQLite)",
    description="Microservice focused on NAMASTE terminology and India EHR compliance.",
    # This runs the function to create the SQLite file and tables on startup
    on_startup=[create_db_and_tables] 
)

# Mock ABHA Authentication Dependency
def mock_abha_auth(token: str = Depends(oauth2_scheme)) -> str:
    """Mocks ABHA token validation and returns the User ID (for compliance/logging)."""
    if not token or not token.startswith("ABHA-"):
        # For testing, you must pass a bearer token that starts with "ABHA-" (e.g., ABHA-12345678)
        raise HTTPException(status_code=401, detail="Invalid or missing ABHA Token (Expected format: ABHA-XXXXXXXX)")
    
    return token

# ====================================================================
# --- 6. CORE ENDPOINTS ---
# ====================================================================

@app.post("/ingest/namaste_csv", tags=["Terminology Management"])
async def ingest_namaste_csv(
    file: UploadFile = File(..., description="Upload the NAMASTE CSV export file"),
    abha_id: str = Depends(mock_abha_auth),
    session: Session = Depends(get_session)
):
    """
    Ingests the NAMASTE CSV export, updates the database, and logs the action.
    
    The CSV must contain the columns: NAMASTE_ID, System, Term_English, Term_Sanskrit.
    """
    
    # Read the file content
    content = await file.read()
    
    try:
        # Use pandas for robust CSV parsing
        data = io.StringIO(content.decode('utf-8'))
        df = pd.read_csv(data)
        
        # Clean column names (e.g., replace spaces with underscores)
        df.columns = [col.strip().replace(' ', '_') for col in df.columns]
        
        required_cols = ['NAMASTE_ID', 'System', 'Term_English']
        for col in required_cols:
            if col not in df.columns:
                 raise HTTPException(status_code=422, detail=f"CSV is missing required column: {col}")

        new_codes_count = 0
        
        # Clear existing data to support a full ingest/update
        session.execute(NAMASTE_Code.__table__.delete())
        
        # Map CSV rows to SQLModel objects and prepare for bulk insert
        for index, row in df.iterrows():
            new_code = NAMASTE_Code(
                namaste_id=str(row['NAMASTE_ID']).strip(),
                system=str(row['System']).strip(),
                term_english=str(row['Term_English']).strip(),
                # Use a default empty string if Term_Sanskrit is missing/NaN
                term_sanskrit=str(row.get('Term_Sanskrit', '')).strip(), 
            )
            session.add(new_code)
            new_codes_count += 1
            
        session.commit()
        
        # Audit Log for Compliance
        log_audit_event(
            session=session,
            user_abha_id=abha_id,
            action='NAMASTE_INGEST',
            resource_type='CodeSystem',
            resource_id='namaste-ayush'
        )
        
        return {
            "status": "success",
            "message": f"Successfully ingested {new_codes_count} NAMASTE codes.",
            "fhir_action": "CodeSystem resource updated.",
            "user": abha_id
        }
        
    except HTTPException:
        session.rollback()
        raise # Re-raise 422 errors
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"CSV processing or database error occurred: {e}")


@app.get("/fhir/CodeSystem/namaste-ayush", tags=["FHIR Terminology"])
async def get_namaste_codesystem(session: Session = Depends(get_session)):
    """
    Returns the NAMASTE codes in the FHIR CodeSystem resource format.
    """
    codes = session.exec(select(NAMASTE_Code)).all()
    if not codes:
        raise HTTPException(status_code=404, detail="NAMASTE CodeSystem not yet loaded. Please run /ingest/namaste_csv first.")
    
    return create_fhir_codesystem(codes)
