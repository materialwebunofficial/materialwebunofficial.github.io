import cv2
import numpy as np

img = cv2.imread('scratch/carousel_frames/state_frame_000.png')
# Full mobile screen bounds in state_frame_000
# Center phone screen x is around 380 to 620
screen = img[90:540, 380:620]
cv2.imwrite('scratch/carousel_frames/phone_screen.png', screen)
print('Saved phone screen crop!')
