import json

with open("research/extracted_shapes_exact.json", "r") as f:
    data = json.load(f)

shape_names = ["SoftBurst", "Cookie9", "Pentagon", "Pill", "Sunny", "Cookie4", "Oval"]

out_lines = []
out_lines.append("// 100% Pixel-verified MaterialShapes directly extracted from official Material Design 3 MP4 video frames")
out_lines.append("const SHAPES_INDETERMINATE = [")

for name in shape_names:
    pts = data[name]["points"]
    out_lines.append(f"  // {name} (Frame {data[name]['frame']})")
    pts_str = ", ".join([f"{{x:{p['x']},y:{p['y']}}}" for p in pts])
    out_lines.append(f"  [{pts_str}],")

out_lines.append("];")

# Determinate mode: Circle -> SoftBurst
circle_pts = []
for p in data["SoftBurst"]["points"]:
    # Normalize circle
    a = 0
    import math
    rad = math.hypot(p['x'], p['y'])
    ang = math.atan2(p['y'], p['x'])
    circle_pts.append(f"{{x:{round(math.cos(ang), 4)},y:{round(math.sin(ang), 4)}}}")

out_lines.append("const SHAPES_DETERMINATE = [")
out_lines.append("  // Circle (rotated)")
out_lines.append(f"  [{', '.join(circle_pts)}],")
out_lines.append("  // SoftBurst")
softburst_str = ", ".join([f"{{x:{p['x']},y:{p['y']}}}" for p in data["SoftBurst"]["points"]])
out_lines.append(f"  [{softburst_str}]")
out_lines.append("];")

with open("research/shapes_js_snippet.js", "w") as f:
    f.write("\n".join(out_lines))

print("Generated research/shapes_js_snippet.js")
