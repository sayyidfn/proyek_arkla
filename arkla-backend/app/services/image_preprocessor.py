"""
ARKLA Backend - Image Preprocessor
Image preprocessing for better OCR results.
"""

import os
import logging
from typing import Tuple, Optional
from dataclasses import dataclass

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class PreprocessResult:
    """Result from image preprocessing."""
    success: bool
    processed_path: Optional[str] = None
    original_dpi: int = 0
    upscaled: bool = False
    error: Optional[str] = None


class ImagePreprocessor:
    """
    Image preprocessing for OCR optimization.
    Applies grayscale, contrast enhancement, denoising, and upscaling.
    Optimized for minimal token usage with Gemini API.
    """
    
    MIN_DPI = 150
    TARGET_DPI = 300
    MAX_DIMENSION = 2048  # Reduced for faster processing on limited resources
    GEMINI_MAX_DIMENSION = 800  # Reduced for faster API calls (was 1024)
    
    def preprocess(
        self,
        input_path: str,
        output_dir: str
    ) -> PreprocessResult:
        """
        Preprocess image for optimal OCR.
        
        Args:
            input_path: Path to input image/PDF
            output_dir: Directory to save processed image
        
        Returns:
            PreprocessResult with processed image path
        """
        try:
            # Load image
            image = self._load_image(input_path)
            if image is None:
                return PreprocessResult(
                    success=False,
                    error="IMAGE_CORRUPT"
                )
            
            # Get original DPI estimate
            original_dpi = self._estimate_dpi(image)
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Enhance contrast using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            
            # Denoise - use lighter filter for speed (was 9, 75, 75)
            denoised = cv2.bilateralFilter(enhanced, 5, 50, 50)
            
            # Upscale if DPI is low
            upscaled = False
            if original_dpi < self.MIN_DPI:
                scale_factor = self.TARGET_DPI / max(original_dpi, 72)
                scale_factor = min(scale_factor, 3.0)  # Cap at 3x
                
                new_width = int(denoised.shape[1] * scale_factor)
                new_height = int(denoised.shape[0] * scale_factor)
                
                # Ensure we don't exceed max dimension
                if new_width > self.MAX_DIMENSION or new_height > self.MAX_DIMENSION:
                    scale_factor = min(
                        self.MAX_DIMENSION / denoised.shape[1],
                        self.MAX_DIMENSION / denoised.shape[0]
                    )
                    new_width = int(denoised.shape[1] * scale_factor)
                    new_height = int(denoised.shape[0] * scale_factor)
                
                denoised = cv2.resize(
                    denoised, 
                    (new_width, new_height),
                    interpolation=cv2.INTER_CUBIC
                )
                upscaled = True
                logger.info(f"Upscaled image by {scale_factor:.2f}x")
            
            # Save processed image (full quality for local storage)
            output_path = os.path.join(output_dir, "processed.jpg")
            cv2.imwrite(output_path, denoised, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            # Create optimized version for Gemini API (reduced size = less tokens)
            gemini_path = os.path.join(output_dir, "processed_gemini.jpg")
            gemini_optimized = self._resize_for_gemini(denoised)
            cv2.imwrite(gemini_path, gemini_optimized, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            logger.info(f"Image preprocessed: {input_path} -> {output_path}")
            logger.info(f"Gemini optimized: {gemini_optimized.shape[1]}x{gemini_optimized.shape[0]}")
            
            return PreprocessResult(
                success=True,
                processed_path=gemini_path,  # Use optimized version for Gemini
                original_dpi=original_dpi,
                upscaled=upscaled
            )
            
        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            return PreprocessResult(
                success=False,
                error="PREPROCESS_FAILED"
            )
    
    def _load_image(self, path: str) -> Optional[np.ndarray]:
        """Load image from file (supports JPG, PNG, PDF first page)."""
        ext = os.path.splitext(path)[1].lower()
        
        try:
            if ext == ".pdf":
                return self._load_pdf_first_page(path)
            else:
                image = cv2.imread(path)
                return image
        except Exception as e:
            logger.error(f"Failed to load image {path}: {e}")
            return None
    
    def _load_pdf_first_page(self, path: str) -> Optional[np.ndarray]:
        """Extract first page of PDF as image."""
        try:
            # Use PIL to convert PDF to image
            # Note: Requires pdf2image or similar, simplified for now
            # For production, use pdf2image with poppler
            
            from PIL import Image
            import io
            
            # Try to open as image (some PDFs are just wrapped images)
            try:
                with Image.open(path) as img:
                    # Convert PIL to OpenCV format
                    img_rgb = img.convert('RGB')
                    return cv2.cvtColor(np.array(img_rgb), cv2.COLOR_RGB2BGR)
            except:
                pass
            
            # For actual PDF parsing, we'd need pdf2image
            # This is a simplified fallback
            logger.warning(f"PDF loading requires pdf2image library: {path}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to load PDF {path}: {e}")
            return None
    
    def _resize_for_gemini(self, image: np.ndarray) -> np.ndarray:
        """
        Resize image for Gemini API to reduce token usage.
        Max dimension is 1024px which significantly reduces tokens while
        maintaining readable text for OCR.
        """
        height, width = image.shape[:2]
        
        # Only resize if larger than max dimension
        if width <= self.GEMINI_MAX_DIMENSION and height <= self.GEMINI_MAX_DIMENSION:
            return image
        
        # Calculate scale to fit within max dimension
        scale = min(
            self.GEMINI_MAX_DIMENSION / width,
            self.GEMINI_MAX_DIMENSION / height
        )
        
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        resized = cv2.resize(
            image,
            (new_width, new_height),
            interpolation=cv2.INTER_AREA  # Best for downscaling
        )
        
        logger.info(f"Resized for Gemini: {width}x{height} -> {new_width}x{new_height} (scale: {scale:.2f})")
        return resized
    
    def _estimate_dpi(self, image: np.ndarray) -> int:
        """Estimate image DPI based on dimensions."""
        # Assume A4 paper size (210mm x 297mm)
        # Estimate based on typical document dimensions
        height, width = image.shape[:2]
        
        # Common DPI values
        if width >= 2480 or height >= 3508:  # 300 DPI A4
            return 300
        elif width >= 1654 or height >= 2339:  # 200 DPI A4
            return 200
        elif width >= 1240 or height >= 1754:  # 150 DPI A4
            return 150
        else:
            return 72  # Low DPI
    
    def validate_image(self, path: str) -> Tuple[bool, str]:
        """
        Validate image file before processing.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not os.path.exists(path):
            return False, "File not found"
        
        # Check file size
        file_size = os.path.getsize(path)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            return False, f"File too large: {file_size / (1024*1024):.1f}MB (max 50MB)"
        
        # Try to load image
        image = self._load_image(path)
        if image is None:
            return False, "Cannot load image (corrupt or unsupported format)"
        
        return True, ""


# Singleton instance
image_preprocessor = ImagePreprocessor()
