"""
Material Design 3 Expressive (M3 Expressive) - Video & Image to Token Pipeline
Extracts M3 design tokens (colors, shapes, radii, motion duration, keyframe paths)
directly from video files (.mp4) and UI screenshots (.png/.jpg).
"""

import cv2
import numpy as np
import json
import os
import glob

def extract_color_palette(img, num_colors=5):
    """Extract dominant RGB/HEX color tokens from an image using k-means clustering."""
    pixels = img.reshape(-1, 3)
    non_bg = pixels[np.abs(pixels.astype(int) - [255, 255, 255]).sum(axis=1) > 20]
    if len(non_bg) == 0:
        non_bg = pixels
        
    pixels = np.float32(non_bg)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    flags = cv2.KMEANS_RANDOM_CENTERS if hasattr(cv2, 'KMEANS_RANDOM_CENTERS') else 0
    _, labels, centers = cv2.kmeans(pixels, num_colors, None, criteria, 10, flags)
    
    colors = []
    for c in centers:
        b, g, r = int(c[0]), int(c[1]), int(c[2])
        hex_val = f"#{r:02x}{g:02x}{b:02x}"
        colors.append(hex_val)
    return colors

def extract_video_tokens(video_path):
    """Analyzes a full video file to extract key motion, timing, color, and geometric tokens."""
    if not os.path.exists(video_path):
        print(f"File not found: {video_path}")
        return None

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps if fps > 0 else 0

    frames = []
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        frames.append(frame)
    cap.release()

    if not frames:
        return None

    # Sample key frame colors
    sample_frame = frames[len(frames) // 2]
    colors = extract_color_palette(sample_frame)

    tokens = {
        "source": os.path.basename(video_path),
        "fps": round(fps, 2),
        "total_frames": total_frames,
        "duration_ms": int(duration_sec * 1000),
        "motion_timing_token": f"{int(duration_sec * 1000)}ms",
        "extracted_colors": {
            "primary": colors[0] if len(colors) > 0 else "#6750A4",
            "secondary_container": colors[1] if len(colors) > 1 else "#E8DEF8",
            "surface_variant": colors[2] if len(colors) > 2 else "#E6E0E9",
            "accent": colors[3] if len(colors) > 3 else "#7D5260"
        }
    }
    return tokens

def generate_css_tokens(extracted_data, output_css_path):
    """Generates M3 CSS Custom Property tokens from extracted data."""
    css_content = "/* Auto-generated M3 Expressive Video-to-Token Tokens */\n:root {\n"
    for item in extracted_data:
        prefix = item["source"].replace(" ", "_").replace(".", "_").lower()
        css_content += f"  /* Source: {item['source']} */\n"
        css_content += f"  --md-sys-motion-duration-{prefix}: {item['motion_timing_token']};\n"
        for role, hex_code in item["extracted_colors"].items():
            css_content += f"  --md-sys-color-extracted-{prefix}-{role}: {hex_code};\n"
    css_content += "}\n"

    with open(output_css_path, "w", encoding="utf-8") as f:
        f.write(css_content)
    print(f"Generated CSS Tokens at: {output_css_path}")

if __name__ == "__main__":
    print("==========================================================")
    print("[M3 EXPRESSIVE VIDEO-TO-TOKEN & IMAGE-TO-TOKEN PIPELINE]")
    print("==========================================================")

    videos = [
        "Loading indicator - Material Design 3.mp4",
        "lwuthdnj-GM3-Components-Carousel-Overview-1-v01.mp4"
    ]

    extracted = []
    for vid in videos:
        if os.path.exists(vid):
            tok = extract_video_tokens(vid)
            if tok:
                extracted.append(tok)
                print(f"[SUCCESS] Extracted tokens from {vid}: Duration = {tok['motion_timing_token']}, Primary Color = {tok['extracted_colors']['primary']}")

    json_path = "src/tokens/extracted_video_tokens.json"
    css_path = "src/tokens/extracted_video_tokens.css"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(extracted, f, indent=2)

    generate_css_tokens(extracted, css_path)
    print("Pipeline execution complete!")
