import os
import logging
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, Query
from fastapi.responses import JSONResponse

import pandas as pd

from app.core.database import get_db
from app.core.constants import ErrorCode
from app.core.utils import format_error_response, get_timestamp

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/import-master-data")
async def import_master_data(
    file: UploadFile = File(...),
    action: str = Query("replace", description="Action: 'replace' or 'append'")
):
    if action not in ["replace", "append"]:
        return JSONResponse(
            status_code=400,
            content=format_error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Action must be 'replace' or 'append'"
            )
        )
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        return JSONResponse(
            status_code=400,
            content=format_error_response(
                code=ErrorCode.INVALID_FILE,
                message="File must be CSV format"
            )
        )
    
    try:
        # Read CSV
        content = await file.read()
        
        # Try different encodings
        df = None
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                import io
                df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                break
            except:
                continue
        
        if df is None:
            return JSONResponse(
                status_code=400,
                content=format_error_response(
                    code=ErrorCode.INVALID_FILE,
                    message="Could not parse CSV file"
                )
            )
        
        # Validate required columns
        required_cols = ['kode']
        for col in required_cols:
            if col not in df.columns:
                return JSONResponse(
                    status_code=400,
                    content=format_error_response(
                        code=ErrorCode.VALIDATION_ERROR,
                        message=f"Missing required column: {col}"
                    )
                )
        
        # Clean data
        df = df.dropna(subset=['kode'])
        df['kode'] = df['kode'].astype(str).str.strip()
        
        added = 0
        updated = 0
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            if action == "replace":
                cursor.execute("DELETE FROM ref_klasifikasi")
            
            for _, row in df.iterrows():
                kode = str(row['kode']).strip()
                indeks = str(row.get('indeks', '')).strip() if pd.notna(row.get('indeks')) else ''
                keterangan = str(row.get('keterangan', '')).strip() if pd.notna(row.get('keterangan')) else ''
                
                # Check if exists
                cursor.execute("SELECT 1 FROM ref_klasifikasi WHERE kode = ?", (kode,))
                exists = cursor.fetchone()
                
                if exists:
                    if action == "append":
                        cursor.execute("""
                            UPDATE ref_klasifikasi 
                            SET indeks = ?, keterangan = ?
                            WHERE kode = ?
                        """, (indeks, keterangan, kode))
                        updated += 1
                else:
                    cursor.execute("""
                        INSERT INTO ref_klasifikasi (kode, indeks, keterangan)
                        VALUES (?, ?, ?)
                    """, (kode, indeks, keterangan))
                    added += 1
        
        logger.info(f"Master data import completed", extra={
            "added": added,
            "updated": updated,
            "action": action
        })
        
        return {
            "status": "success",
            "added": added,
            "updated": updated,
            "timestamp": get_timestamp()
        }
        
    except Exception as e:
        logger.error(f"Import master data error: {e}")
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.DATABASE_ERROR,
                message=str(e)
            )
        )


@router.get("/master-data/kode-klasifikasi")
async def list_kode_klasifikasi(
    search: str = Query(None, description="Search in kode or keterangan"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500)
):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            where_clause = ""
            params = []
            
            if search:
                where_clause = "WHERE kode LIKE ? OR keterangan LIKE ?"
                params = [f"%{search}%", f"%{search}%"]
            
            # Count total
            count_sql = f"SELECT COUNT(*) as total FROM ref_klasifikasi {where_clause}"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # Fetch data
            offset = (page - 1) * limit
            data_sql = f"""
                SELECT kode, indeks, keterangan
                FROM ref_klasifikasi
                {where_clause}
                ORDER BY kode
                LIMIT ? OFFSET ?
            """
            cursor.execute(data_sql, params + [limit, offset])
            rows = cursor.fetchall()
            
            data = [dict(row) for row in rows]
            total_pages = (total + limit - 1) // limit
            
            return {
                "status": "success",
                "data": data,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": total_pages
                }
            }
            
    except Exception as e:
        logger.error(f"List kode klasifikasi error: {e}")
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.DATABASE_ERROR,
                message=str(e)
            )
        )
