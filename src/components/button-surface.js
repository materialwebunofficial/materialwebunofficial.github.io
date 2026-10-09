/**
 * Retained web painting adapter for AndroidX clickable/toggle Surface.
 * Surface clips content after painting its background, while its shadow and
 * minimum interaction reservation remain outside that clip.
 */
import {resolveSurfaceColors} from '../theme/surface-color.js';
import {roundedPointerHit,capturedPointerOutOfBounds} from '../motion/pointer-geometry.js';

export function surfaceContentClip(surface, child) {
  const {width, height, radius} = surface;
  // Corners may differ (connected button group shapes); a single radius applies to all four.
  const round = surface.radii ? surface.radii.map(value => `${value}px`).join(' ') : `${radius}px`;
  return `inset(${-child.y}px ${child.x + child.width - width}px ${child.y + child.height - height}px ${-child.x}px round ${round})`;
}

const cornerRadii = css => ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(name => parseFloat(css[name]) || 0);

export class ButtonSurface {
  constructor(host, button) {
    this.host = host;
    this.button = button;
    this.disposed = false;
    this.background = {value: button.style.getPropertyValue('background-color'), priority: button.style.getPropertyPriority('background-color'), applied: null};
    this.children = [...button.querySelectorAll('.lbl-wrapper,.lead-ico,.trail-ico')];
    this.clips = new Map(this.children.map(child => [child, {value: child.style.getPropertyValue('clip-path'), priority: child.style.getPropertyPriority('clip-path'), applied: null}]));
    this.probe = document.createElement('span');
    this.probe.hidden = true;
    this.probe.setAttribute('aria-hidden', 'true');
    host.shadowRoot.append(this.probe);
    this.resize = new ResizeObserver(() => this.clip());
    for (const node of [button, ...this.children]) this.resize.observe(node);
    this.onFonts = () => this.clip();
    document.fonts?.addEventListener('loadingdone', this.onFonts);
    this.mutations = new MutationObserver(() => {
      // Shape/elevation RAFs also write the button's style. They do not change
      // its color input; only an external background write needs resolving.
      if (button.style.getPropertyValue('background-color') !== this.background.applied ||
          button.style.getPropertyPriority('background-color') !== this.background.appliedPriority) this.refresh();
    });
    this.observe();
  }

  observe() { this.mutations.observe(this.button, {attributes: true, attributeFilter: ['style']}); }

  pointerInput(event) {
    const type={mouse:'Mouse',touch:'Touch',pen:'Stylus'}[event.pointerType];
    if(!type)return null;
    const root=this.button.getBoundingClientRect(),css=getComputedStyle(this.button);
    const width=parseFloat(css.width)||0,height=parseFloat(css.height)||0;
    const scaleX=root.width/width||1,scaleY=root.height/height||1;
    return {width,height,radius:Math.min(...cornerRadii(css),width/2,height/2),
      x:(event.clientX-root.left)/scaleX,y:(event.clientY-root.top)/scaleY,type};
  }

  hitTest(event) { const input=this.pointerInput(event);return input===null||roundedPointerHit(input)!==null; }
  outOfBounds(event) { const input=this.pointerInput(event);return input!==null&&capturedPointerOutOfBounds(input); }

  restore(node, name, entry) {
    if (entry.applied === null) return;
    if (node.style.getPropertyValue(name) === entry.applied && node.style.getPropertyPriority(name) === entry.appliedPriority) {
      if (entry.value) node.style.setProperty(name, entry.value, entry.priority);
      else node.style.removeProperty(name);
    } else {
      entry.value = node.style.getPropertyValue(name);
      entry.priority = node.style.getPropertyPriority(name);
    }
    entry.applied = null;
  }

  refresh() {
    if (this.disposed || !this.host.isConnected) return;
    this.mutations.disconnect();
    try {
      this.restore(this.button, 'background-color', this.background);
      // Read the caller/variant color before applying Surface's tonal overlay.
      // Button passes shadowElevation and leaves tonalElevation at zero.
      const css = getComputedStyle(this.button);
      const input = css.backgroundColor;
      this.resolved = resolveSurfaceColors(this.host, this.probe, {container: input, content: css.color, elevation: 0});
      if (this.resolved.container !== input) {
        this.button.style.setProperty('background-color', this.resolved.container, 'important');
      }
      this.background.applied = this.button.style.getPropertyValue('background-color');
      this.background.appliedPriority = this.button.style.getPropertyPriority('background-color');
    } finally { if (!this.disposed) this.observe(); }
    this.clip();
  }

  clip() {
    if (this.disposed || !this.host.isConnected) return;
    const root = this.button.getBoundingClientRect(), css = getComputedStyle(this.button);
    const width = parseFloat(css.width) || 0, height = parseFloat(css.height) || 0;
    // Local coordinates preserve clipping under axis-aligned CSS scaling.
    const scaleX = root.width / width || 1, scaleY = root.height / height || 1;
    const radii = cornerRadii(css);
    const surface = {width, height, radius: radii[0], radii: radii.every(value => value === radii[0]) ? null : radii};
    for (const child of this.children) {
      const rect = child.getBoundingClientRect(), entry = this.clips.get(child);
      if (entry.applied !== null && (child.style.getPropertyValue('clip-path') !== entry.applied || child.style.getPropertyPriority('clip-path') !== entry.appliedPriority)) {
        entry.value = child.style.getPropertyValue('clip-path');
        entry.priority = child.style.getPropertyPriority('clip-path');
      }
      const value = surfaceContentClip(surface, {x: (rect.left - root.left) / scaleX, y: (rect.top - root.top) / scaleY, width: rect.width / scaleX, height: rect.height / scaleY});
      if (child.style.getPropertyValue('clip-path') !== value) child.style.setProperty('clip-path', value);
      entry.applied = child.style.getPropertyValue('clip-path');
      entry.appliedPriority = child.style.getPropertyPriority('clip-path');
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resize.disconnect();
    this.mutations.disconnect();
    document.fonts?.removeEventListener('loadingdone', this.onFonts);
    this.restore(this.button, 'background-color', this.background);
    for (const [child, entry] of this.clips) this.restore(child, 'clip-path', entry);
    this.probe.remove();
  }
}
