import os
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, FileResponse

import pandas as pd

from app.core.database import get_db
from app.core.constants import KategoriSurat, ErrorCode
from app.core.utils import format_error_response

router = APIRouter()
logger = logging.getLogger(__name__)

# Column mapping per kategori - matching the original document format
# Maps (db_column_name, display_column_name)
EXPORT_COLUMNS = {
    "undangan": {
        "columns": [
            ("nomor_urut", "NOMOR"),
            ("index_surat", "INDEX"),
            ("kode", "KODE"),
            ("tgl_surat_masuk", "SURAT MASUK"),
            ("tgl_penyelesaian", "TGL.PENYLSN"),
            ("isi_ringkas", "ISI RINGKAS"),
            ("asal_surat", "ASAL SURAT"),
            ("nomor_surat", "NOMOR SURAT"),
            ("lampiran", "LAMPIRAN"),
            ("keterangan", "KET"),
            ("tgl_masuk_surat", "TGL MASUK SURAT"),
            ("diperuntukan", "DIPERUNTUKAN"),
            ("tgl_surat_turun", "TGL SURAT TURUN"),
            ("disposisi_sekwan", "DISPOSISI SEKWAN"),
        ],
        "title": "Surat Undangan Masuk"
    },
    "masuk_biasa": {
        "columns": [
            ("nomor_urut", "NOMOR URUT SURAT MASUK"),
            ("index_surat", "INDEX"),
            ("kode", "KODE"),
            ("tgl_surat", "TGL SURAT"),
            ("isi_ringkas", "ISI RINGKAS"),
            ("asal_surat", "ASAL SURAT"),
            ("nomor_surat", "NOMOR SURAT"),
            ("lampiran", "LAMPIRAN"),
            ("pengolah", "PENGOLAH"),
            ("tgl_diteruskan", "TGL DITERUSKAN"),
            ("disposisi_ketua", "CATATAN/DISPOSISI KETUA"),
            ("tgl_masuk", "TGL MASUK"),
            ("tujuan", "TUJUAN"),
            ("tgl_surat_turun", "TGL SURAT TURUN"),
            ("disposisi_sekwan", "DISPOSISI SEKWAN"),
        ],
        "title": "Surat Masuk Biasa"
    },
    "masuk_penting": {
        "columns": [
            ("nomor_urut", "NOMOR URUT SURAT MASUK"),
            ("index_surat", "INDEX"),
            ("kode", "KODE"),
            ("tgl_surat_masuk", "TGL SURAT MASUK"),
            ("isi_ringkas", "ISI RINGKAS"),
            ("asal_surat", "ASAL SURAT"),
            ("nomor_surat", "NOMOR SURAT"),
            ("lampiran", "LAMPIRAN"),
            ("pengolah", "PENGOLAH"),
            ("tgl_diteruskan", "TGL DITERUSKAN"),
            ("disposisi_ketua", "CATATAN/DISPOSISI KETUA"),
            ("tgl_masuk", "TGL MASUK"),
            ("tujuan", "TUJUAN"),
            ("tgl_surat_turun", "TGL SURAT TURUN"),
            ("disposisi_sekwan", "DISPOSISI SEKWAN"),
        ],
        "title": "Surat Masuk Penting"
    },
    "keluar": {
        "columns": [
            ("nomor_urut", "NOMOR_URUT"),
            ("index_surat", "INDEX"),
            ("kode", "KODE"),
            ("isi_ringkas", "ISI_RINGKAS"),
            ("kepada", "KEPADA"),
            ("pengolah", "PENGOLAH"),
            ("tgl_surat", "TGL_SURAT"),
            ("lampiran", "LAMPIRAN"),
            ("catatan", "CATATAN"),
        ],
        "title": "Surat Keluar DPRD"
    },
    "keluar_sekwan": {
        "columns": [
            ("nomor_urut", "NOMOR_URUT"),
            ("index_surat", "INDEX"),
            ("kode", "KODE"),
            ("isi_ringkas", "ISI_RINGKAS"),
            ("kepada", "KEPADA"),
            ("pengolah", "PENGOLAH"),
            ("tgl_surat", "TGL_SURAT"),
            ("lampiran", "LAMPIRAN"),
            ("catatan", "CATATAN"),
        ],
        "title": "Surat Keluar Sekretaris DPRD"
    },
    "rahasia": {
        "columns": [
            ("nomor_urut", "NOMOR URUT"),
            ("index_surat", "INDEX"),
            ("kode", "KODE"),
            ("isi_ringkas", "ISI RINGKAS"),
            ("asal_surat", "ASAL SURAT"),
            ("nomor_surat", "NOMOR SURAT"),
            ("lampiran", "LAMPIRAN"),
            ("pengolah", "PENGOLAH"),
            ("tgl_diteruskan", "TGL DITERUSKAN"),
            ("catatan", "CATATAN"),
            ("tgl_terima_surat", "TGL TERIMA SURAT"),
        ],
        "title": "Surat Rahasia"
    },
}


@router.get("/export")
async def export_surat(
    kategori: str = Query(..., description="Kategori surat (required)"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    format: str = Query("xlsx", description="Export format: xlsx or csv")
):
    # Validate kategori
    if kategori not in [k.value for k in KategoriSurat]:
        return JSONResponse(
            status_code=400,
            content=format_error_response(
                code=ErrorCode.INVALID_CATEGORY,
                message=f"Invalid kategori: {kategori}"
            )
        )
    
    # Validate format
    if format not in ["xlsx", "csv"]:
        return JSONResponse(
            status_code=400,
            content=format_error_response(
                code=ErrorCode.VALIDATION_ERROR,
                message="Format must be 'xlsx' or 'csv'"
            )
        )
    
    # Get export column config
    export_config = EXPORT_COLUMNS.get(kategori)
    if not export_config:
        return JSONResponse(
            status_code=400,
            content=format_error_response(
                code=ErrorCode.INVALID_CATEGORY,
                message=f"Export not configured for kategori: {kategori}"
            )
        )
    
    try:
        with get_db() as conn:
            # Build query
            table_name = f"surat_{kategori}"
            
            where_clauses = ["s.kategori = ?"]
            params = [kategori]
            
            if date_from:
                where_clauses.append("DATE(s.created_at) >= ?")
                params.append(date_from)
            
            if date_to:
                where_clauses.append("DATE(s.created_at) <= ?")
                params.append(date_to)
            
            where_sql = " AND ".join(where_clauses)
            
            # Get columns needed for this kategori
            column_config = export_config["columns"]
            db_columns = [col[0] for col in column_config]
            
            # Build SELECT clause dynamically based on what columns we need
            select_parts = []
            for db_col in db_columns:
                if db_col == "isi_ringkas":
                    # isi_ringkas comes from main surat table
                    select_parts.append("s.isi_ringkas")
                else:
                    select_parts.append(f"d.{db_col}")
            
            select_clause = ", ".join(select_parts)
            
            sql = f"""
                SELECT {select_clause}
                FROM surat s
                LEFT JOIN {table_name} d ON s.id = d.surat_id
                WHERE {where_sql}
                ORDER BY d.nomor_urut ASC
            """
            
            df = pd.read_sql_query(sql, conn, params=params)
            
            if df.empty:
                return JSONResponse(
                    status_code=200,
                    content={
                        "status": "success",
                        "message": "No data found for the specified criteria",
                        "record_count": 0
                    }
                )
            
            # Rename columns according to export config (db_col -> display_col)
            column_mapping = {db_col: display_col for db_col, display_col in export_config["columns"]}
            export_df = df.rename(columns=column_mapping)
            
            # Create output directory
            os.makedirs("output", exist_ok=True)
            
            # Generate filename with year
            year = datetime.now().year
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            title = export_config["title"].replace(" ", "_")
            filename = f"{title}_{year}_{timestamp}.{format}"
            filepath = os.path.join("output", filename)
            
            # Export with renamed columns
            if format == "xlsx":
                export_df.to_excel(filepath, index=False, engine='openpyxl')
                media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            else:
                export_df.to_csv(filepath, index=False)
                media_type = "text/csv"
            
            logger.info(f"Export completed", extra={
                "kategori": kategori,
                "record_count": len(export_df),
                "file_name": filename
            })
            
            # Return file directly for download
            return FileResponse(
                path=filepath,
                filename=filename,
                media_type=media_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
            
    except Exception as e:
        logger.error(f"Export error: {e}")
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.DATABASE_ERROR,
                message=str(e)
            )
        )


@router.get("/download/{filename}")
async def download_file(filename: str):
    filepath = os.path.join("output", filename)
    
    if not os.path.exists(filepath):
        return JSONResponse(
            status_code=404,
            content=format_error_response(
                code=ErrorCode.NOT_FOUND,
                message=f"File not found: {filename}"
            )
        )
    
    # Determine media type
    if filename.endswith(".xlsx"):
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "text/csv"
    
    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename
    )
