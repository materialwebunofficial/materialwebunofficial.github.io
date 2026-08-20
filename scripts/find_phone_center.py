import cv2
import numpy as np

img = cv2.imread('scratch/carousel_frames/state_frame_000.png')
h, w, _ = img.shape
print(f"Original image shape: {w}x{h}")

# The phone mockup is located in the middle: x: 300 to 900, y: 50 to 650
screen = img[50:650, 300:900]
cv2.imwrite('scratch/carousel_frames/phone_screen_centered.png', screen)
print("Saved phone_screen_centered.png!")
