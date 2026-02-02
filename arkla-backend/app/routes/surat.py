import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Path
from fastapi.responses import JSONResponse

from app.core.database import get_db
from app.core.constants import KategoriSurat, CATEGORY_SCHEMAS, ErrorCode
from app.core.utils import format_error_response, get_timestamp
from app.models.schemas import VerifyRequest, VerifyResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/verify")
async def verify_surat(request: VerifyRequest):
    surat_id = request.surat_id
    extracted_data = request.extracted_data
    kode_arsip = request.kode_arsip
    
    logger.info(f"Verifying surat", extra={
        "surat_id": surat_id,
        "extracted_data_keys": list(extracted_data.keys()) if extracted_data else [],
        "isi_ringkas_value": extracted_data.get('isi_ringkas') if extracted_data else None
    })
    
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Check if surat exists
            cursor.execute("SELECT kategori FROM surat WHERE id = ?", (surat_id,))
            row = cursor.fetchone()
            
            if not row:
                return JSONResponse(
                    status_code=404,
                    content=format_error_response(
                        code=ErrorCode.NOT_FOUND,
                        message=f"Surat not found: {surat_id}",
                        surat_id=surat_id
                    )
                )
            
            kategori = row['kategori']
            
            # Generate nomor_urut_display
            cursor.execute("""
                SELECT COUNT(*) as count FROM surat 
                WHERE kategori = ? AND verified_at IS NOT NULL
            """, (kategori,))
            count_row = cursor.fetchone()
            nomor_urut = (count_row['count'] or 0) + 1
            
            year = datetime.now().year
            nomor_urut_display = f"{nomor_urut:04d}/{kategori.upper()}/{year}"
            
            # Update main surat table
            cursor.execute("""
                UPDATE surat SET
                    nomor_urut_display = ?,
                    kode_arsip = ?,
                    isi_ringkas = ?,
                    verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                nomor_urut_display,
                kode_arsip,
                extracted_data.get('isi_ringkas'),
                surat_id
            ))
            
            # Insert into category-specific table
            table_name = f"surat_{kategori}"
            fields = CATEGORY_SCHEMAS.get(kategori, [])
            
            if fields:
                # Build dynamic insert
                field_names = ['surat_id'] + [f for f in fields if f != 'isi_ringkas']
                placeholders = ','.join(['?'] * len(field_names))
                field_list = ','.join(field_names)
                
                values = [surat_id]
                for field in fields:
                    if field != 'isi_ringkas':
                        values.append(extracted_data.get(field))
                
                # Check if record exists
                cursor.execute(f"SELECT 1 FROM {table_name} WHERE surat_id = ?", (surat_id,))
                exists = cursor.fetchone()
                
                if exists:
                    # Update
                    set_clause = ','.join([f"{f}=?" for f in fields if f != 'isi_ringkas'])
                    update_values = [extracted_data.get(f) for f in fields if f != 'isi_ringkas']
                    update_values.append(surat_id)
                    cursor.execute(f"UPDATE {table_name} SET {set_clause} WHERE surat_id = ?", update_values)
                else:
                    # Insert
                    cursor.execute(f"INSERT INTO {table_name} ({field_list}) VALUES ({placeholders})", values)
            
            # Add audit log for rahasia
            if kategori == 'rahasia':
                cursor.execute("""
                    INSERT INTO audit_log (surat_id, action, details)
                    VALUES (?, 'VERIFY', 'Surat verified and saved')
                """, (surat_id,))
            
            logger.info(f"Surat verified", extra={
                "surat_id": surat_id,
                "nomor_urut_display": nomor_urut_display
            })
            
            return VerifyResponse(
                surat_id=surat_id,
                nomor_urut_display=nomor_urut_display,
                message="Surat berhasil disimpan"
            )
            
    except Exception as e:
        logger.error(f"Verify error: {e}", extra={"surat_id": surat_id})
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.DATABASE_ERROR,
                message=str(e),
                surat_id=surat_id
            )
        )


@router.get("/surat")
async def list_surat(
    kategori: Optional[str] = Query(None, description="Filter by kategori"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    kode: Optional[str] = Query(None, description="Filter by kode arsip"),
    search: Optional[str] = Query(None, description="Search in isi_ringkas"),
    include_unverified: bool = Query(False, description="Include unverified surat"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page")
):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Build query
            where_clauses = []
            params = []
            
            # Only filter by verified_at if include_unverified is False
            if not include_unverified:
                where_clauses.append("s.verified_at IS NOT NULL")
            
            if kategori:
                where_clauses.append("s.kategori = ?")
                params.append(kategori)
            
            if date_from:
                where_clauses.append("DATE(s.created_at) >= ?")
                params.append(date_from)
            
            if date_to:
                where_clauses.append("DATE(s.created_at) <= ?")
                params.append(date_to)
            
            if kode:
                where_clauses.append("s.kode_arsip = ?")
                params.append(kode)
            
            if search:
                where_clauses.append("s.isi_ringkas LIKE ?")
                params.append(f"%{search}%")
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            
            # Count total
            count_sql = f"SELECT COUNT(*) as total FROM surat s WHERE {where_sql}"
            cursor.execute(count_sql, params)
            total = cursor.fetchone()['total']
            
            # Fetch data with LEFT JOIN to get asal_surat from category tables
            # Note: surat_keluar and surat_keluar_sekwan don't have asal_surat column
            offset = (page - 1) * limit
            data_sql = f"""
                SELECT s.id, s.kategori, s.nomor_urut_display, s.kode_arsip, 
                       s.isi_ringkas, s.overall_confidence, s.requires_manual_review,
                       s.verified_at, s.created_at,
                       COALESCE(su.asal_surat, sp.asal_surat, sr.asal_surat, smb.asal_surat) as asal_surat
                FROM surat s
                LEFT JOIN surat_undangan su ON s.id = su.surat_id AND s.kategori = 'undangan'
                LEFT JOIN surat_masuk_penting sp ON s.id = sp.surat_id AND s.kategori = 'masuk_penting'
                LEFT JOIN surat_rahasia sr ON s.id = sr.surat_id AND s.kategori = 'rahasia'
                LEFT JOIN surat_masuk_biasa smb ON s.id = smb.surat_id AND s.kategori = 'masuk_biasa'
                WHERE {where_sql}
                ORDER BY s.created_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(data_sql, params + [limit, offset])
            rows = cursor.fetchall()
            
            data = []
            for row in rows:
                item = dict(row)
                item['created_at'] = str(item['created_at']) if item['created_at'] else None
                item['verified_at'] = str(item['verified_at']) if item['verified_at'] else None
                data.append(item)
            
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
        logger.error(f"List surat error: {e}")
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.DATABASE_ERROR,
                message=str(e)
            )
        )


@router.get("/surat/{surat_id}")
async def get_surat(surat_id: str = Path(..., description="Surat ID")):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Get main surat data
            cursor.execute("""
                SELECT * FROM surat WHERE id = ?
            """, (surat_id,))
            row = cursor.fetchone()
            
            if not row:
                return JSONResponse(
                    status_code=404,
                    content=format_error_response(
                        code=ErrorCode.NOT_FOUND,
                        message=f"Surat not found: {surat_id}",
                        surat_id=surat_id
                    )
                )
            
            surat = dict(row)
            kategori = surat['kategori']
            
            # Get category-specific data
            table_name = f"surat_{kategori}"
            try:
                cursor.execute(f"SELECT * FROM {table_name} WHERE surat_id = ?", (surat_id,))
                detail_row = cursor.fetchone()
                if detail_row:
                    surat['details'] = dict(detail_row)
            except:
                pass
            
            # Convert datetime fields to string
            for key in ['created_at', 'updated_at', 'verified_at']:
                if surat.get(key):
                    surat[key] = str(surat[key])
            
            return {
                "status": "success",
                "data": surat
            }
            
    except Exception as e:
        logger.error(f"Get surat error: {e}", extra={"surat_id": surat_id})
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.DATABASE_ERROR,
                message=str(e),
                surat_id=surat_id
            )
        )


@router.get("/preview-disposisi/{surat_id}")
async def preview_disposisi(surat_id: str = Path(..., description="Surat ID")):
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT s.*, k.keterangan as kode_keterangan
                FROM surat s
                LEFT JOIN ref_klasifikasi k ON s.kode_arsip = k.kode
                WHERE s.id = ?
            """, (surat_id,))
            row = cursor.fetchone()
            
            if not row:
                return JSONResponse(
                    status_code=404,
                    content=format_error_response(
                        code=ErrorCode.NOT_FOUND,
                        message=f"Surat not found: {surat_id}",
                        surat_id=surat_id
                    )
                )
            
            surat = dict(row)
            kategori = surat['kategori']
            
            # Get category-specific data
            table_name = f"surat_{kategori}"
            details = {}
            try:
                cursor.execute(f"SELECT * FROM {table_name} WHERE surat_id = ?", (surat_id,))
                detail_row = cursor.fetchone()
                if detail_row:
                    details = dict(detail_row)
            except:
                pass
            
            # Generate HTML
            html = generate_disposisi_html(surat, details)
            
            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "html": html
                }
            )
            
    except Exception as e:
        logger.error(f"Preview disposisi error: {e}", extra={"surat_id": surat_id})
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.DATABASE_ERROR,
                message=str(e),
                surat_id=surat_id
            )
        )


def generate_disposisi_html(surat: dict, details: dict) -> str:
    nomor_surat = details.get('nomor_surat', '-')
    asal_surat = details.get('asal_surat', '-')
    tgl_surat = details.get('tgl_surat', '-')
    isi_ringkas = surat.get('isi_ringkas', '-')
    kode_arsip = surat.get('kode_arsip', '-')
    
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Lembar Disposisi</title>
    <style>
        @page {{
            size: 15.7cm 10.2cm;
            margin-top: 1.25cm;
            margin-right: 1.1cm;
            margin-bottom: 0.3cm;
            margin-left: 0.65cm;
        }}
        
        body {{
            font-family: Arial, sans-serif;
            font-size: 10pt;
            margin: 0;
            padding: 0;
        }}
        
        .container {{
            width: 100%;
            border: 1.5pt solid black;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        td, th {{
            border: 1pt solid black;
            padding: 2mm;
            vertical-align: top;
        }}
        
        .header {{
            text-align: center;
            font-weight: bold;
            font-size: 11pt;
            background-color: #f0f0f0;
        }}
        
        .label {{
            font-weight: bold;
            width: 30%;
        }}
        
        .value {{
            width: 70%;
        }}
        
        @media print {{
            body {{
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <table>
            <tr>
                <td colspan="2" class="header">LEMBAR DISPOSISI</td>
            </tr>
            <tr>
                <td class="label">Nomor Surat</td>
                <td class="value">{nomor_surat}</td>
            </tr>
            <tr>
                <td class="label">Asal Surat</td>
                <td class="value">{asal_surat}</td>
            </tr>
            <tr>
                <td class="label">Tanggal Surat</td>
                <td class="value">{tgl_surat}</td>
            </tr>
            <tr>
                <td class="label">Isi Ringkas</td>
                <td class="value">{isi_ringkas}</td>
            </tr>
            <tr>
                <td class="label">Kode Arsip</td>
                <td class="value">{kode_arsip}</td>
            </tr>
            <tr>
                <td class="label">Disposisi</td>
                <td class="value" style="height: 3cm;"></td>
            </tr>
        </table>
    </div>
</body>
</html>
"""
    return html


@router.delete("/surat/{surat_id}")
async def delete_surat(surat_id: str = Path(..., description="ID surat yang akan dihapus")):
    """Delete a surat and its related data from category tables"""
    logger.info(f"Deleting surat", extra={"surat_id": surat_id})
    
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Check if surat exists and get kategori
            cursor.execute("SELECT kategori FROM surat WHERE id = ?", (surat_id,))
            row = cursor.fetchone()
            
            if not row:
                return JSONResponse(
                    status_code=404,
                    content=format_error_response(
                        code=ErrorCode.NOT_FOUND,
                        message=f"Surat not found: {surat_id}",
                        surat_id=surat_id
                    )
                )
            
            kategori = row['kategori']
            
            # Delete from category-specific table first (foreign key)
            table_name = f"surat_{kategori}"
            try:
                cursor.execute(f"DELETE FROM {table_name} WHERE surat_id = ?", (surat_id,))
            except Exception as e:
                logger.warning(f"Could not delete from {table_name}: {e}")
            
            # Delete from main surat table
            cursor.execute("DELETE FROM surat WHERE id = ?", (surat_id,))
            
            conn.commit()
            
            logger.info(f"Surat deleted successfully", extra={"surat_id": surat_id})
            
            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "message": "Surat berhasil dihapus",
                    "data": {"id": surat_id}
                }
            )
            
    except Exception as e:
        logger.error(f"Error deleting surat: {e}", extra={"surat_id": surat_id})
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.INTERNAL_ERROR,
                message=f"Failed to delete surat: {str(e)}",
                surat_id=surat_id
            )
        )
