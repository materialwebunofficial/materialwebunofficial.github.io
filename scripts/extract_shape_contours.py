import os
import glob
import numpy as np
from PIL import Image

# The video frames contain 2 loading indicators:
# Indicator 1 (Standalone) is centered around x=755, y=250
# Indicator 2 (Contained) is centered around x=1293, y=250

frames = [
    (1, "SoftBurst"),
    (20, "Cookie9"),
    (40, "Pentagon"),
    (60, "Pill"),
    (80, "Sunny"),
    (100, "Cookie4"),
    (120, "Oval")
]

results = {}

for f_idx, name in frames:
    path = f"research/video_frames/frame_{f_idx:04d}.png"
    if not os.path.exists(path):
        continue
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)

    # Crop around standalone indicator 1: x from 600 to 900, y from 100 to 400
    crop = arr[100:400, 600:900]
    
    # The shape color is purple/indigo (R: 90..115, G: 80..105, B: 140..170)
    # Background is very light pink/purple (#F8F4F8)
    # Mask where pixel is significantly darker than background
    r = crop[:, :, 0].astype(float)
    g = crop[:, :, 1].astype(float)
    b = crop[:, :, 2].astype(float)
    brightness = (r + g + b) / 3.0
    
    # Threshold for the dark purple shape (brightness < 180)
    mask = brightness < 180
    
    # Find center of mass of the mask
    y_indices, x_indices = np.where(mask)
    if len(x_indices) == 0:
        continue
    cx = np.mean(x_indices)
    cy = np.mean(y_indices)
    
    # Calculate radial distances at 128 angles
    angles = np.linspace(0, 2 * np.pi, 128, endpoint=False)
    radii = []
    
    # For each angle, cast ray from center outward to find the edge (transition from True to False)
    max_search_r = 140
    for a in angles:
        cos_a = np.cos(a)
        sin_a = np.sin(a)
        edge_r = 0
        for dist in np.linspace(0, max_search_r, 300):
            px = int(round(cx + dist * cos_a))
            py = int(round(cy + dist * sin_a))
            if 0 <= py < mask.shape[0] and 0 <= px < mask.shape[1]:
                if mask[py, px]:
                    edge_r = dist
                else:
                    break
        radii.append(edge_r)
    
    radii = np.array(radii)
    max_r = np.max(radii)
    norm_radii = radii / max_r if max_r > 0 else radii
    
    points = []
    for a, nr in zip(angles, norm_radii):
        points.append({
            "x": round(float(nr * np.cos(a)), 4),
            "y": round(float(nr * np.sin(a)), 4)
        })
    
    results[name] = {
        "frame": f_idx,
        "max_r": float(max_r),
        "aspect_ratio": float((np.max(x_indices) - np.min(x_indices)) / (np.max(y_indices) - np.min(y_indices))),
        "points": points
    }

print("Extracted shapes successfully:")
for name, data in results.items():
    print(f" - {name} (Frame {data['frame']}): max_r={data['max_r']:.1f}px, aspect={data['aspect_ratio']:.3f}")

import json
with open("research/extracted_shapes_exact.json", "w") as f:
    json.dump(results, f, indent=2)
print("Saved to research/extracted_shapes_exact.json")
