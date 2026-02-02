import sqlite3
import os
import logging
from contextlib import contextmanager
from typing import Generator

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_db_path() -> str:
    return settings.database_path


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        conn.close()


def init_database():
    os.makedirs(os.path.dirname(get_db_path()), exist_ok=True)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # ref_klasifikasi - Master data for Kode Arsip
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ref_klasifikasi (
                kode TEXT PRIMARY KEY,
                indeks TEXT,
                keterangan TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # surat - Main surat table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS surat (
                id TEXT PRIMARY KEY,
                kategori TEXT NOT NULL,
                nomor_urut_display TEXT,
                kode_arsip TEXT,
                raw_ocr_text TEXT,
                isi_ringkas TEXT,
                overall_confidence REAL,
                requires_manual_review INTEGER DEFAULT 0,
                gemini_tokens_used INTEGER DEFAULT 0,
                processing_time_ms INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified_at TIMESTAMP,
                FOREIGN KEY (kode_arsip) REFERENCES ref_klasifikasi(kode)
            )
        """)
        
        # surat_masuk_biasa - sesuai dengan struktur CSV DPRD
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS surat_masuk_biasa (
                surat_id TEXT PRIMARY KEY,
                nomor_urut TEXT,
                index_surat TEXT,
                kode TEXT,
                tgl_surat DATE,
                isi_ringkas TEXT,
                asal_surat TEXT,
                nomor_surat TEXT,
                lampiran TEXT,
                pengolah TEXT,
                tgl_diteruskan DATE,
                disposisi_ketua TEXT,
                tgl_masuk DATE,
                tujuan TEXT,
                tgl_surat_turun DATE,
                disposisi_sekwan TEXT,
                FOREIGN KEY (surat_id) REFERENCES surat(id) ON DELETE CASCADE
            )
        """)
        
        # surat_undangan
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS surat_undangan (
                surat_id TEXT PRIMARY KEY,
                nomor_urut TEXT,
                index_surat TEXT,
                kode TEXT,
                tgl_surat_masuk DATE,
                tgl_penyelesaian DATE,
                isi_ringkas TEXT,
                asal_surat TEXT,
                nomor_surat TEXT,
                lampiran TEXT,
                keterangan TEXT,
                tgl_masuk_surat DATE,
                diperuntukan TEXT,
                tgl_surat_turun DATE,
                disposisi_sekwan TEXT,
                FOREIGN KEY (surat_id) REFERENCES surat(id) ON DELETE CASCADE
            )
        """)
        
        # surat_masuk_penting
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS surat_masuk_penting (
                surat_id TEXT PRIMARY KEY,
                nomor_urut TEXT,
                index_surat TEXT,
                kode TEXT,
                tgl_surat_masuk DATE,
                isi_ringkas TEXT,
                asal_surat TEXT,
                nomor_surat TEXT,
                lampiran TEXT,
                pengolah TEXT,
                tgl_diteruskan DATE,
                disposisi_ketua TEXT,
                tgl_masuk DATE,
                tujuan TEXT,
                tgl_surat_turun DATE,
                disposisi_sekwan TEXT,
                FOREIGN KEY (surat_id) REFERENCES surat(id) ON DELETE CASCADE
            )
        """)
        
        # surat_keluar
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS surat_keluar (
                surat_id TEXT PRIMARY KEY,
                nomor_urut TEXT,
                index_surat TEXT,
                kode TEXT,
                isi_ringkas TEXT,
                kepada TEXT,
                pengolah TEXT,
                tgl_surat DATE,
                lampiran TEXT,
                catatan TEXT,
                FOREIGN KEY (surat_id) REFERENCES surat(id) ON DELETE CASCADE
            )
        """)
        
        # surat_keluar_sekwan
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS surat_keluar_sekwan (
                surat_id TEXT PRIMARY KEY,
                nomor_urut TEXT,
                index_surat TEXT,
                kode TEXT,
                isi_ringkas TEXT,
                kepada TEXT,
                pengolah TEXT,
                tgl_surat DATE,
                lampiran TEXT,
                catatan TEXT,
                FOREIGN KEY (surat_id) REFERENCES surat(id) ON DELETE CASCADE
            )
        """)
        
        # surat_rahasia
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS surat_rahasia (
                surat_id TEXT PRIMARY KEY,
                nomor_urut TEXT,
                index_surat TEXT,
                kode TEXT,
                tgl_terima_surat DATE,
                isi_ringkas TEXT,
                asal_surat TEXT,
                nomor_surat TEXT,
                lampiran TEXT,
                pengolah TEXT,
                tgl_diteruskan DATE,
                catatan TEXT,
                FOREIGN KEY (surat_id) REFERENCES surat(id) ON DELETE CASCADE
            )
        """)
        
        # audit_log - For rahasia category only
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                surat_id TEXT NOT NULL,
                action TEXT NOT NULL,
                details TEXT,
                user_info TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (surat_id) REFERENCES surat(id)
            )
        """)
        
        # ocr_cache - Cache OCR results
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ocr_cache (
                file_hash TEXT PRIMARY KEY,
                raw_text TEXT,
                confidence REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # api_usage - Track Gemini API usage
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                surat_id TEXT,
                operation TEXT NOT NULL,
                input_tokens INTEGER,
                output_tokens INTEGER,
                estimated_cost_usd REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (surat_id) REFERENCES surat(id)
            )
        """)
        
        # Create indexes for performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_surat_kategori ON surat(kategori)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_surat_kode_arsip ON surat(kode_arsip)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_surat_created_at ON surat(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_surat_id ON audit_log(surat_id)")
        
        logger.info("Database tables initialized successfully")


def store_usage_log(surat_id: str, operation: str, input_tokens: int, 
                    output_tokens: int, cost: float):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO api_usage (surat_id, operation, input_tokens, output_tokens, estimated_cost_usd)
            VALUES (?, ?, ?, ?, ?)
        """, (surat_id, operation, input_tokens, output_tokens, cost))


def get_daily_cost() -> float:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COALESCE(SUM(estimated_cost_usd), 0) as total
            FROM api_usage
            WHERE DATE(created_at) = DATE('now')
        """)
        result = cursor.fetchone()
        return result['total'] if result else 0.0
