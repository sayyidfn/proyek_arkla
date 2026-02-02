import os
import time
import logging
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse

from app.core.constants import (
    KategoriSurat, CATEGORY_SCHEMAS, MAX_FILE_SIZE,
    ALLOWED_EXTENSIONS, ErrorCode, CONFIDENCE_HIGH, CONFIDENCE_MEDIUM
)
from app.core.utils import (
    generate_surat_id, get_file_extension, ensure_upload_dir,
    sanitize_filename, format_error_response, get_timestamp,
    calculate_confidence_average, cleanup_processed_files,
    get_surat_table_name, validate_kategori
)
from app.core.database import get_db
from app.core.config import settings
from app.services.image_preprocessor import image_preprocessor
from app.services.gemini_engine import gemini_engine
from app.services.text_summarizer import text_summarizer
from app.services.auto_filler import auto_filler
from app.services.kode_matcher import kode_matcher
from app.models.schemas import (
    ProcessSuratResponse, ExtractedData, ConfidenceBreakdown,
    GeminiApiUsage, KodeCandidate, ProcessingStatus
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/process-surat", response_model=None)
async def process_surat(
    file: UploadFile = File(...),
    category_id: str = Form(...),
    use_optimized: bool = Form(default=True)
):
    start_time = time.time()
    surat_id = generate_surat_id()
    steps_completed = []
    steps_failed = []
    total_tokens = {"input": 0, "output": 0}
    
    logger.info(f"Processing started", extra={
        "surat_id": surat_id,
        "category": category_id,
        "file_name": file.filename,
        "optimized": use_optimized
    })
    
    # ========== STEP 1: Input Validation ==========
    try:
        # Validate kategori
        if category_id not in [k.value for k in KategoriSurat]:
            return JSONResponse(
                status_code=400,
                content=format_error_response(
                    code=ErrorCode.INVALID_CATEGORY,
                    message=f"Invalid kategori. Must be one of: {[k.value for k in KategoriSurat]}",
                    surat_id=surat_id
                )
            )
        
        # Validate file extension
        ext = get_file_extension(file.filename or "")
        if ext not in ALLOWED_EXTENSIONS:
            return JSONResponse(
                status_code=400,
                content=format_error_response(
                    code=ErrorCode.INVALID_FILE,
                    message=f"Invalid file format. Allowed: {ALLOWED_EXTENSIONS}",
                    surat_id=surat_id
                )
            )
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size
        if len(file_content) > MAX_FILE_SIZE:
            return JSONResponse(
                status_code=400,
                content=format_error_response(
                    code=ErrorCode.FILE_TOO_LARGE,
                    message=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB",
                    surat_id=surat_id
                )
            )
        
        # Check Gemini API configuration
        if not settings.google_api_key:
            return JSONResponse(
                status_code=500,
                content=format_error_response(
                    code=ErrorCode.GEMINI_CONFIG_ERROR,
                    message="Gemini API not configured. Set GOOGLE_API_KEY in .env",
                    surat_id=surat_id
                )
            )
        
        steps_completed.append("validation")
        
    except Exception as e:
        logger.error(f"Validation error: {e}", extra={"surat_id": surat_id})
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.UNKNOWN_ERROR,
                message=str(e),
                surat_id=surat_id
            )
        )
    
    # ========== STEP 2: Save & Preprocess Image ==========
    try:
        upload_dir = ensure_upload_dir(surat_id)
        
        # Save original file
        original_filename = sanitize_filename(file.filename or f"document{ext}")
        original_path = os.path.join(upload_dir, f"original{ext}")
        with open(original_path, "wb") as f:
            f.write(file_content)
        
        # Preprocess image
        preprocess_result = image_preprocessor.preprocess(original_path, upload_dir)
        
        if not preprocess_result.success:
            return JSONResponse(
                status_code=422,
                content=format_error_response(
                    code=ErrorCode.OCR_FAILED,
                    message=f"Image preprocessing failed: {preprocess_result.error}",
                    surat_id=surat_id,
                    details={"step_failed": "preprocessing"}
                )
            )
        
        processed_path = preprocess_result.processed_path
        steps_completed.append("preprocessing")
        
    except Exception as e:
        logger.error(f"Preprocessing error: {e}", extra={"surat_id": surat_id})
        return JSONResponse(
            status_code=500,
            content=format_error_response(
                code=ErrorCode.UNKNOWN_ERROR,
                message=f"Preprocessing failed: {str(e)}",
                surat_id=surat_id
            )
        )
    
    # ========== OPTIMIZED MODE: Single API Call ==========
    raw_text = ""
    isi_ringkas = ""
    extracted_fields = {}
    field_confidences = {}
    summary_confidence = 0.85  # Default for unified extraction
    
    if use_optimized:
        # OPTIMIZED: OCR + Summarization + Auto-fill in ONE API call
        try:
            unified_result = gemini_engine.unified_extract(processed_path, category_id, surat_id)
            
            if not unified_result.success:
                return JSONResponse(
                    status_code=422,
                    content=format_error_response(
                        code=ErrorCode.OCR_FAILED,
                        message="Unified extraction failed. Please try again.",
                        surat_id=surat_id,
                        details={
                            "step_failed": "unified_extract",
                            "error_type": unified_result.error,
                            "suggestion": "Check internet connection or try again later"
                        }
                    )
                )
            
            raw_text = unified_result.raw_text
            isi_ringkas = unified_result.isi_ringkas
            extracted_fields = unified_result.fields or {}
            
            # Set confidence for all extracted fields
            for field in extracted_fields:
                field_confidences[field] = 0.85 if extracted_fields[field] else 0.50
            
            total_tokens["input"] += unified_result.input_tokens
            total_tokens["output"] += unified_result.output_tokens
            
            if not raw_text.strip():
                return JSONResponse(
                    status_code=422,
                    content=format_error_response(
                        code=ErrorCode.NO_TEXT_EXTRACTED,
                        message="No text could be extracted. Please check the image quality.",
                        surat_id=surat_id
                    )
                )
            
            # Save raw OCR text
            ocr_path = os.path.join(upload_dir, "ocr_raw.txt")
            with open(ocr_path, "w", encoding="utf-8") as f:
                f.write(raw_text)
            
            steps_completed.extend(["ocr", "summarization", "auto_fill"])
            
            logger.info(f"Unified extraction completed", extra={
                "surat_id": surat_id,
                "text_length": len(raw_text),
                "tokens_used": unified_result.input_tokens + unified_result.output_tokens
            })
            
        except Exception as e:
            logger.error(f"Unified extraction error: {e}", extra={"surat_id": surat_id})
            return JSONResponse(
                status_code=422,
                content=format_error_response(
                    code=ErrorCode.OCR_FAILED,
                    message=f"Extraction failed: {str(e)}",
                    surat_id=surat_id
                )
            )
    
    else:
        # LEGACY MODE: 3 separate API calls (kept for compatibility)
        # ========== STEP 3: OCR Extraction ==========
        try:
            ocr_result = gemini_engine.extract_text_from_image(processed_path, surat_id)
            
            if not ocr_result.success:
                return JSONResponse(
                    status_code=422,
                    content=format_error_response(
                        code=ErrorCode.OCR_FAILED,
                        message="OCR extraction failed after 3 retries. Please try again.",
                        surat_id=surat_id,
                        details={
                            "step_failed": "ocr",
                            "error_type": ocr_result.error
                        }
                    )
                )
            
            raw_text = ocr_result.data or ""
            
            if not raw_text.strip():
                return JSONResponse(
                    status_code=422,
                    content=format_error_response(
                        code=ErrorCode.NO_TEXT_EXTRACTED,
                        message="No text could be extracted from the document.",
                        surat_id=surat_id
                    )
                )
            
            total_tokens["input"] += ocr_result.input_tokens
            total_tokens["output"] += ocr_result.output_tokens
            
            ocr_path = os.path.join(upload_dir, "ocr_raw.txt")
            with open(ocr_path, "w", encoding="utf-8") as f:
                f.write(raw_text)
            
            steps_completed.append("ocr")
            
        except Exception as e:
            logger.error(f"OCR error: {e}", extra={"surat_id": surat_id})
            return JSONResponse(
                status_code=422,
                content=format_error_response(
                    code=ErrorCode.OCR_FAILED,
                    message=f"OCR failed: {str(e)}",
                    surat_id=surat_id
                )
            )
        
        # ========== STEP 4: Summarization ==========
        try:
            summary_result = text_summarizer.summarize(raw_text, category_id, surat_id)
            isi_ringkas = summary_result.summary
            summary_confidence = summary_result.confidence
            total_tokens["input"] += summary_result.tokens_used
            
            if summary_result.used_fallback:
                steps_failed.append("summarization")
            else:
                steps_completed.append("summarization")
            
        except Exception as e:
            logger.error(f"Summarization error: {e}", extra={"surat_id": surat_id})
            isi_ringkas = raw_text[:200]
            summary_confidence = 0.40
            steps_failed.append("summarization")
        
        # ========== STEP 5: Auto-Fill Fields ==========
        try:
            autofill_result = auto_filler.extract_fields(raw_text, category_id, surat_id)
            
            for field_name, field_result in autofill_result.fields.items():
                extracted_fields[field_name] = field_result.value
                field_confidences[field_name] = field_result.confidence
            
            total_tokens["input"] += autofill_result.tokens_used
            
            if autofill_result.used_fallback:
                steps_failed.append("auto_fill")
            else:
                steps_completed.append("auto_fill")
            
        except Exception as e:
            logger.error(f"Auto-fill error: {e}", extra={"surat_id": surat_id})
            steps_failed.append("auto_fill")
    
    # ========== Validation & Confidence Scoring ==========
    field_confidences["isi_ringkas"] = summary_confidence
    overall_confidence = calculate_confidence_average(field_confidences)
    
    # Determine low confidence fields
    low_confidence_fields = [
        field for field, conf in field_confidences.items()
        if conf < 0.75
    ]
    
    # Determine if manual review is required
    requires_manual_review = overall_confidence < CONFIDENCE_MEDIUM or len(low_confidence_fields) > 2
    
    steps_completed.append("validation")
    
    # ========== STEP 8: Kode Arsip Matching (Optional) ==========
    kode_candidates = None
    if kode_matcher.is_enabled():
        try:
            candidates = kode_matcher.match(isi_ringkas, surat_id)
            if candidates:
                kode_candidates = [
                    KodeCandidate(
                        kode=c.kode,
                        keterangan=c.keterangan,
                        confidence=c.confidence,
                        reasoning=c.reasoning
                    ) for c in candidates
                ]
        except Exception as e:
            logger.warning(f"Kode matching failed: {e}", extra={"surat_id": surat_id})
    
    # ========== STEP 9: Build Response ==========
    processing_time_ms = int((time.time() - start_time) * 1000)
    
    # Calculate cost
    total_input = total_tokens["input"]
    total_output = total_tokens["output"]
    estimated_cost = gemini_engine.calculate_cost(total_input, total_output)
    
    # Build extracted data
    # Exclude fields that are explicitly set to avoid duplicate keyword arguments
    excluded_fields = {'raw_ocr_text', 'isi_ringkas'}
    extracted_data = ExtractedData(
        raw_ocr_text=raw_text[:1000],  # Truncate for response
        isi_ringkas=isi_ringkas,
        **{k: v for k, v in extracted_fields.items() if k in ExtractedData.__fields__ and k not in excluded_fields}
    )
    
    # Determine status
    if steps_failed:
        status = ProcessingStatus.PARTIAL_SUCCESS
        message = f"Some steps used fallback: {', '.join(steps_failed)}"
        fallback_reason = f"GEMINI_{'_'.join([s.upper() for s in steps_failed])}_FAILED"
    else:
        status = ProcessingStatus.SUCCESS
        message = None
        fallback_reason = None
    
    # Clean up processed file
    cleanup_processed_files(surat_id)
    
    # Store initial surat record in database
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            # 1. Insert into main surat table
            cursor.execute("""
                INSERT INTO surat (id, kategori, raw_ocr_text, isi_ringkas, 
                                   overall_confidence, requires_manual_review,
                                   gemini_tokens_used, processing_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                surat_id, category_id, raw_text, isi_ringkas,
                overall_confidence, int(requires_manual_review),
                total_input + total_output, processing_time_ms
            ))
            
            # 2. Insert into category-specific detail table (with validated table name)
            table_name = get_surat_table_name(category_id)
            if not table_name:
                logger.error(f"Invalid category_id for table: {category_id}")
            else:
                category_fields = CATEGORY_SCHEMAS.get(category_id, [])
                
                if category_fields:
                    # Filter only fields that exist in extracted_fields (exclude isi_ringkas as it's in main table)
                    detail_fields = [f for f in category_fields if f != 'isi_ringkas' and f in extracted_fields]
                    
                    if detail_fields:
                        field_names = ", ".join(["surat_id"] + detail_fields)
                        placeholders = ", ".join(["?"] * (len(detail_fields) + 1))
                        values = [surat_id] + [extracted_fields.get(f) for f in detail_fields]
                        
                        cursor.execute(f"""
                            INSERT INTO {table_name} ({field_names})
                            VALUES ({placeholders})
                        """, values)
                        
                        logger.info(f"Surat detail saved", extra={
                            "surat_id": surat_id, 
                            "table": table_name,
                            "fields": detail_fields
                        })
                    else:
                        # Insert with just surat_id if no fields extracted
                        cursor.execute(f"""
                            INSERT INTO {table_name} (surat_id)
                            VALUES (?)
                    """, (surat_id,))
                    
    except Exception as e:
        logger.error(f"Failed to store surat: {e}", extra={"surat_id": surat_id})
    
    response = {
        "status": status.value,
        "surat_id": surat_id,
        "kategori": category_id,
        "processing_time_ms": processing_time_ms,
        "steps_completed": steps_completed,
        
        "extracted_data": {
            "raw_ocr_text": raw_text[:500],
            "isi_ringkas": isi_ringkas,
            **extracted_fields
        },
        
        "isi_ringkas": isi_ringkas,
        "isi_ringkas_confidence": summary_confidence,
        
        "confidence": {
            "overall": round(overall_confidence, 2),
            "breakdown": {k: round(v, 2) for k, v in field_confidences.items()}
        },
        
        "requires_manual_review": requires_manual_review,
        "low_confidence_fields": low_confidence_fields,
        
        "gemini_api_usage": {
            "ocr_tokens": total_tokens["input"],
            "summarization_tokens": 0,
            "auto_fill_tokens": 0,
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "estimated_cost_usd": round(estimated_cost, 4)
        },
        
        "kode_candidates": [
            {"kode": c.kode, "keterangan": c.keterangan, "confidence": c.confidence}
            for c in (kode_candidates or [])
        ] if kode_candidates else None
    }
    
    if message:
        response["message"] = message
    if fallback_reason:
        response["fallback_reason"] = fallback_reason
    if steps_failed:
        response["steps_failed"] = steps_failed
    
    logger.info(f"Processing completed", extra={
        "surat_id": surat_id,
        "status": status.value,
        "processing_time_ms": processing_time_ms,
        "overall_confidence": overall_confidence
    })
    
    return JSONResponse(status_code=200, content=response)
