import cv2
import numpy as np

def extract_path(img_path):
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
        
    path = f"M {pts[0][0]:.2f},{pts[0][1]:.2f} "
    for i in range(1, len(pts)):
        path += f"L {pts[i][0]:.2f},{pts[i][1]:.2f} "
    path += "Z"
    return path

key_indices = [0, 40, 80, 120, 160, 200, 240]

css_keyframes = "@keyframes shape-morph {\n"
for i, idx in enumerate(key_indices):
    pct = round((i / 7.0) * 100, 1)
    file_path = f"scratch/all_video_frames/frame_{idx:03d}.png"
    p = extract_path(file_path)
    css_keyframes += f"  {pct}% {{ d: path(\"{p}\"); }}\n"
p_final = extract_path("scratch/all_video_frames/frame_000.png")
css_keyframes += f"  100% {{ d: path(\"{p_final}\"); }}\n}}"

print(css_keyframes)
