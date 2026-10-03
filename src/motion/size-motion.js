import { springDuration } from './spring-duration.js';

// Transition<IntSize> keeps both Float channels alive until the vector's common
// duration. Retarget from the converted IntSize while retaining Float velocity.
export function retargetIntSize(channels, targets, spec, now = performance.now()) {
  if (channels.every((channel, i) => channel.target === targets[i])) return false;
  const current = channels.map(channel => channel.sample(now));
  const animations = channels.map((channel, i) => ({
    from: Math.max(0, Math.round(current[i].position)), to: targets[i],
    velocity: Math.fround(current[i].velocity), stiffness: Math.fround(spec.stiffness),
    dampingRatio: Math.fround(spec.dampingRatio),
    visibilityThreshold: Math.fround(spec.visibilityThreshold ?? .01), start: now, snap: false,
  }));
  const duration = Math.max(...animations.map(springDuration));
  channels.forEach((channel, i) => {
    channel.target = targets[i];
    channel.animation = { ...animations[i], duration };
    channel.sample(now);
  });
  return true;
}

export function toolbarGroupComposed(expanded, state, animating) {
  return expanded || animating || state === 'Visible';
}
