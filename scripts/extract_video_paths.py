import cv2
import numpy as np

def get_normalized_points(img_path, num_points=12):
    img = cv2.imread(img_path)
    bg = img[0, 0]
    diff = np.abs(img.astype(int) - bg.astype(int)).sum(axis=2)
    mask = (diff > 30).astype(np.uint8) * 255
    
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    left_c = None
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if 650 < x < 900 and w > 100:
            left_c = c
            break
            
    if left_c is None:
        return None
        
    x, y, w, h = cv2.boundingRect(left_c)
    cx, cy = x + w/2, y + h/2
    size = max(w, h)
    
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
                    if r > 20: break
                    
        norm_r = (best_r / (size / 2)) * 19.0
        norm_x = 24.0 + norm_r * ray_x
        norm_y = 24.0 + norm_r * ray_y
        pts.append((norm_x, norm_y))
        
    return pts

def points_to_svg_path(pts):
    path = f"M {pts[0][0]:.2f},{pts[0][1]:.2f}"
    n = len(pts)
    for i in range(n):
        p0 = pts[i]
        p1 = pts[(i+1)%n]
        dx = (p1[0] - p0[0]) / 3
        dy = (p1[1] - p0[1]) / 3
        c1x, c1y = p0[0] + dx, p0[1] + dy
        c2x, c2y = p1[0] - dx, p1[1] - dy
        path += f" C {c1x:.2f},{c1y:.2f} {c2x:.2f},{c2y:.2f} {p1[0]:.2f},{p1[1]:.2f}"
    path += " Z"
    return path

frame_files = [
    ('scallop10', 'frame_000.png'),
    ('pentagon', 'frame_004.png'),
    ('squircle', 'frame_008.png'),
    ('cookie4', 'frame_012.png')
]

for name, file in frame_files:
    pts = get_normalized_points(f'scratch/video_frames/{file}', 12)
    path_str = points_to_svg_path(pts)
    print(f'{name.upper()}_PATH = "{path_str}"')
