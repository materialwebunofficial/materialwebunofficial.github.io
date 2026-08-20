import cv2
import numpy as np
import math

def extract_shape_from_frame(img_path):
    img = cv2.imread(img_path)
    bg = img[0, 0]
    diff = np.abs(img.astype(int) - bg.astype(int)).sum(axis=2)
    mask = (diff > 30).astype(np.uint8) * 255
    
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    left_c = None
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if 600 < x < 900 and w > 80:
            left_c = c
            break
            
    if left_c is None:
        return None
        
    x, y, w, h = cv2.boundingRect(left_c)
    cx, cy = x + w/2, y + h/2
    size = max(w, h)
    
    # 36 ray angles
    num_points = 36
    pts = []
    for i in range(num_points):
        angle = (i * 2 * np.pi) / num_points - np.pi / 2
        ray_x = np.cos(angle)
        ray_y = np.sin(angle)
        
        best_r = 0
        for r in np.linspace(0, size, 200):
            px = int(round(cx + r * ray_x))
            py = int(round(cy + r * ray_y))
            if 0 <= px < img.shape[1] and 0 <= py < img.shape[0]:
                if mask[py, px] > 0:
                    best_r = r
                else:
                    if r > 15: break
                    
        norm_r = (best_r / (size / 2)) * 19.0
        norm_x = 24.0 + norm_r * ray_x
        norm_y = 24.0 + norm_r * ray_y
        pts.append((norm_x, norm_y))
        
    return pts

def pts_to_svg_path(pts):
    path = f"M {pts[0][0]:.2f},{pts[0][1]:.2f} "
    for i in range(1, len(pts)):
        path += f"L {pts[i][0]:.2f},{pts[i][1]:.2f} "
    path += "Z"
    return path

# Extract all 19 frame paths
for f_idx in range(19):
    file_name = f'frame_{f_idx:03d}.png'
    pts = extract_shape_from_frame(f'scratch/video_frames/{file_name}')
    if pts:
        path_str = pts_to_svg_path(pts)
        print(f'FRAME_{f_idx:02d} = "{path_str}"')
