// src/motion/spring-physics.js
var SpringPhysics = class {
  static SCHEMES = {
    expressive: {
      spatialSlow: { dampingRatio: 0.7, stiffness: 250, mass: 1 },
      spatialMedium: { dampingRatio: 0.7, stiffness: 450, mass: 1 },
      spatialFast: { dampingRatio: 0.75, stiffness: 800, mass: 1 },
      effectSlow: { dampingRatio: 1, stiffness: 800, mass: 1 },
      effectFast: { dampingRatio: 1, stiffness: 1400, mass: 1 }
    },
    standard: {
      spatialSlow: { dampingRatio: 1, stiffness: 300, mass: 1 },
      spatialMedium: { dampingRatio: 1, stiffness: 700, mass: 1 },
      spatialFast: { dampingRatio: 1, stiffness: 1400, mass: 1 },
      effectSlow: { dampingRatio: 1, stiffness: 1600, mass: 1 },
      effectFast: { dampingRatio: 1, stiffness: 3800, mass: 1 }
    }
  };
  static PRESETS = {
    expressiveSpatialSlow: { dampingRatio: 0.7, stiffness: 250, mass: 1 },
    expressiveSpatialMedium: { dampingRatio: 0.7, stiffness: 450, mass: 1 },
    expressiveSpatialFast: { dampingRatio: 0.75, stiffness: 800, mass: 1 },
    expressiveEffectSlow: { dampingRatio: 1, stiffness: 800, mass: 1 },
    expressiveEffectFast: { dampingRatio: 1, stiffness: 1400, mass: 1 },
    standardSpatialSlow: { dampingRatio: 1, stiffness: 300, mass: 1 },
    standardSpatialMedium: { dampingRatio: 1, stiffness: 700, mass: 1 },
    standardSpatialFast: { dampingRatio: 1, stiffness: 1400, mass: 1 }
  };
  static _activeScheme = "expressive";
  static setScheme(schemeName) {
    if (this.SCHEMES[schemeName]) {
      this._activeScheme = schemeName;
    }
  }
  static getScheme() {
    if (typeof document !== "undefined") {
      const docScheme = document.documentElement.getAttribute("data-motion-scheme") || document.documentElement.getAttribute("data-theme-scheme");
      if (docScheme && this.SCHEMES[docScheme]) return docScheme;
    }
    return this._activeScheme;
  }
  static getPreset(name) {
    const currentScheme = this.getScheme();
    if (this.PRESETS[name]) {
      if (currentScheme === "standard" && name.startsWith("expressive")) {
        const canonical = name.replace("expressive", "standard");
        if (this.PRESETS[canonical]) return this.PRESETS[canonical];
      }
      return this.PRESETS[name];
    }
    return currentScheme === "standard" ? this.PRESETS.standardSpatialMedium : this.PRESETS.expressiveSpatialMedium;
  }
  static solve({ from, to, velocity = 0, dampingRatio = 0.7, stiffness = 450, mass = 1, time }) {
    const x0 = from - to;
    const v0 = velocity;
    const omegaN = Math.sqrt(stiffness / mass);
    if (dampingRatio < 1) {
      const omegaD = omegaN * Math.sqrt(1 - dampingRatio * dampingRatio);
      const alpha = dampingRatio * omegaN;
      const c1 = x0;
      const c2 = (v0 + alpha * x0) / omegaD;
      const envelope = Math.exp(-alpha * time);
      const position = envelope * (c1 * Math.cos(omegaD * time) + c2 * Math.sin(omegaD * time));
      const currentVelocity = envelope * ((-alpha * c1 + omegaD * c2) * Math.cos(omegaD * time) + (-alpha * c2 - omegaD * c1) * Math.sin(omegaD * time));
      return { position: position + to, velocity: currentVelocity };
    } else if (Math.abs(dampingRatio - 1) < 1e-4) {
      const c1 = x0;
      const c2 = v0 + omegaN * x0;
      const decay = Math.exp(-omegaN * time);
      const position = (c1 + c2 * time) * decay;
      const currentVelocity = (c2 - omegaN * (c1 + c2 * time)) * decay;
      return { position: position + to, velocity: currentVelocity };
    } else {
      const omegaD = omegaN * Math.sqrt(dampingRatio * dampingRatio - 1);
      const r1 = -dampingRatio * omegaN + omegaD;
      const r2 = -dampingRatio * omegaN - omegaD;
      const c2 = (v0 - r1 * x0) / (r2 - r1);
      const c1 = x0 - c2;
      const position = c1 * Math.exp(r1 * time) + c2 * Math.exp(r2 * time);
      const currentVelocity = c1 * r1 * Math.exp(r1 * time) + c2 * r2 * Math.exp(r2 * time);
      return { position: position + to, velocity: currentVelocity };
    }
  }
  static generateKeyframes({ from = 0, to = 1, velocity = 0, dampingRatio = 0.7, stiffness = 450, mass = 1, fps = 60 }) {
    const keyframes = [];
    const dt = 1 / fps;
    let t = 0;
    const maxTime = 1.2;
    const threshold = 1e-3;
    let position = from;
    let currentVelocity = velocity;
    while (t < maxTime) {
      const state = this.solve({ from, to, velocity, dampingRatio, stiffness, mass, time: t });
      position = state.position;
      currentVelocity = state.velocity;
      keyframes.push(position);
      if (Math.abs(position - to) < threshold && Math.abs(currentVelocity) < threshold && t > 0.08) {
        keyframes.push(to);
        break;
      }
      t += dt;
    }
    return { keyframes, duration: Math.max(120, Math.round(t * 1e3)) };
  }
  static animateProperty(element, property, from, to, presetName = "expressiveSpatialMedium") {
    if (!element) return;
    const preset = this.getPreset(presetName);
    const { keyframes, duration } = this.generateKeyframes({
      from,
      to,
      dampingRatio: preset.dampingRatio,
      stiffness: preset.stiffness,
      mass: preset.mass
    });
    const animationKeyframes = keyframes.map((val) => {
      if (property === "scale") return { transform: `scale(${val.toFixed(4)})` };
      if (property === "border-radius") return { borderRadius: `${val.toFixed(2)}px` };
      const obj = {};
      obj[property] = val;
      return obj;
    });
    if (element._activeSpringAnim) {
      try {
        element._activeSpringAnim.cancel();
      } catch (_) {
      }
    }
    const anim = element.animate(animationKeyframes, {
      duration,
      easing: "linear",
      fill: "none"
    });
    element._activeSpringAnim = anim;
    anim.onfinish = () => {
      if (property === "scale") {
        if (to === 1) {
          element.style.transform = "";
        } else {
          element.style.transform = `scale(${to})`;
        }
      } else if (property === "border-radius") {
        element.style.borderRadius = `${to}px`;
      } else {
        element.style[property] = typeof to === "number" ? `${to}px` : to;
      }
      element._activeSpringAnim = null;
    };
    return anim;
  }
};

// src/motion/interactions.js
function createRipple(event, containerElement) {
  if (!containerElement || !event) return;
  const rect = containerElement.getBoundingClientRect();
  const circle = document.createElement("span");
  const diameter = Math.max(rect.width, rect.height) * 1.5;
  const radius = diameter / 2;
  circle.style.width = circle.style.height = `${diameter}px`;
  const clientX = event.clientX !== void 0 ? event.clientX : rect.left + rect.width / 2;
  const clientY = event.clientY !== void 0 ? event.clientY : rect.top + rect.height / 2;
  circle.style.left = `${clientX - rect.left - radius}px`;
  circle.style.top = `${clientY - rect.top - radius}px`;
  circle.classList.add("md-ripple-effect");
  const existing = containerElement.querySelector(".md-ripple-effect");
  if (existing) existing.remove();
  containerElement.appendChild(circle);
  setTimeout(() => {
    circle.remove();
  }, 450);
}
function pressScale(el, scale = 0.95, preset = "expressiveSpatialFast") {
  if (!el) return;
  SpringPhysics.animateProperty(el, "scale", 1, scale, preset);
}
function releaseScale(el, scale = 0.95, preset = "expressiveSpatialMedium") {
  if (!el) return;
  SpringPhysics.animateProperty(el, "scale", scale, 1, preset);
}
function morphShape(el, from, to, preset = "expressiveSpatialMedium") {
  if (!el) return;
  SpringPhysics.animateProperty(el, "border-radius", from, to, preset);
}
function bindPress(el, {
  disabled = () => false,
  onPress,
  onRelease,
  onActivate,
  signal
} = {}) {
  if (!el) return;
  let isPressed = false;
  const start = (e) => {
    if (disabled() || isPressed) return;
    if (e && e.pointerType === "mouse" && e.button !== 0) return;
    isPressed = true;
    try {
      if (e && typeof e.pointerId === "number") {
        el.setPointerCapture(e.pointerId);
      }
    } catch (_) {
    }
    el.classList.add("pressed");
    onPress?.(e);
  };
  const end = (shouldActivate = false) => {
    if (!isPressed) return;
    isPressed = false;
    el.classList.remove("pressed");
    onRelease?.();
    if (shouldActivate) {
      onActivate?.();
    }
  };
  const listenerOptions = signal ? { signal } : {};
  el.addEventListener("pointerdown", start, listenerOptions);
  el.addEventListener("pointerup", () => end(true), listenerOptions);
  el.addEventListener("pointercancel", () => end(false), listenerOptions);
  el.addEventListener("keydown", (e) => {
    if (disabled()) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      if (e.repeat) return;
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
      }
      start(e);
    }
  }, listenerOptions);
  el.addEventListener("keyup", (e) => {
    if (disabled()) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
      }
      end(true);
    }
  }, listenerOptions);
}

// src/utils/security.js
function escapeHtml(val) {
  if (val == null) return "";
  return String(val).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function sanitizeAttribute(val) {
  if (val == null) return "";
  return String(val).replace(/["'<>]/g, "");
}
function safeJsonParse(raw, fallback = null) {
  if (!raw || typeof raw !== "string") return fallback;
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return fallback;
    }
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return void 0;
      }
      return value;
    });
    return parsed;
  } catch (_) {
    return fallback;
  }
}

// src/utils/styles.js
function createComponentSheet(cssText) {
  if (typeof CSSStyleSheet !== "undefined" && typeof CSSStyleSheet.prototype.replaceSync === "function") {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      return sheet;
    } catch (_) {
      return null;
    }
  }
  return null;
}
function adoptSheet(shadowRoot, sheet) {
  if (sheet && shadowRoot && "adoptedStyleSheets" in shadowRoot) {
    try {
      shadowRoot.adoptedStyleSheets = [sheet];
    } catch (_) {
    }
  }
}

// src/components/md-button.js
var defaultStyle = `
  :host {
    display: inline-flex;
    vertical-align: middle;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: none;
    outline: none;
    user-select: none;
    cursor: pointer;
    font-family: var(--md-sys-typescale-font-family, 'Roboto', system-ui, sans-serif);
    letter-spacing: 0.1px;
    overflow: hidden;
    will-change: transform, border-radius;
    transition:
      background-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      box-shadow var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      border-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease);
  }

  /* Focus Ring (\xA75.3) */
  .btn:focus-visible::after {
    content: '';
    position: absolute;
    inset: -4px;
    border: 3px solid var(--md-sys-color-secondary, #625b71);
    border-radius: inherit;
    pointer-events: none;
  }

  /* Touch Target expand for small sizes (\xA74.2 - 48dp min) */
  .btn.xs::before,
  .btn.s::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 48px;
    min-height: 48px;
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }

  /* State Layer (\xA75.1 & \xA75.2) */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-color: currentColor;
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short-2, 100ms) ease;
  }

  .btn:hover:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-hover-opacity, 0.08);
  }
  .btn:focus-visible:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-focus-opacity, 0.10);
  }
  .btn:active:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-pressed-opacity, 0.10);
  }

  /* Ripple Effect */
  .md-ripple-effect {
    position: absolute;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.15;
    transform: scale(0);
    animation: ripple-anim 400ms var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1)) forwards;
    pointer-events: none;
  }

  @keyframes ripple-anim {
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Varyant: Filled */
  .btn.filled {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.filled:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.filled:active:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level0, none);
  }

  /* Varyant: Elevated */
  .btn.elevated {
    background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
    color: var(--md-sys-color-primary, #6750a4);
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.elevated:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level2, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .btn.elevated:active:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Varyant: Tonal */
  .btn.tonal {
    background-color: var(--md-sys-color-secondary-container, #e8def8);
    color: var(--md-sys-color-on-secondary-container, #1d192b);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.tonal:hover:not([disabled]) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Varyant: Outlined */
  .btn.outlined {
    background-color: transparent;
    color: var(--md-sys-color-primary, #6750a4);
    border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .btn.outlined:active:not([disabled]) {
    border-color: var(--md-sys-color-outline, #79747e);
  }

  /* Varyant: Text */
  .btn.text {
    background-color: transparent;
    color: var(--md-sys-color-primary, #6750a4);
    box-shadow: var(--md-sys-elevation-level0, none);
  }

  /* Toggle Selected States */
  .btn.togglable.selected.filled {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
  }
  .btn.togglable.selected.tonal {
    background-color: var(--md-sys-color-secondary-container, #e8def8);
    color: var(--md-sys-color-on-secondary-container, #1d192b);
  }
  .btn.togglable.selected.outlined {
    background-color: var(--md-sys-color-inverse-surface, #313033);
    color: var(--md-sys-color-inverse-on-surface, #f4eff4);
    border-color: var(--md-sys-color-inverse-surface, #313033);
  }

  /* Disabled State */
  .btn:disabled, .btn[disabled] {
    cursor: not-allowed;
    box-shadow: none !important;
    pointer-events: none;
  }
  .btn.filled:disabled, .btn.elevated:disabled, .btn.tonal:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
  }
  .btn.outlined:disabled {
    border-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
    background-color: transparent;
  }
  .btn.text:disabled {
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
    background-color: transparent;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', 'Google Symbols', sans-serif;
    line-height: 1;
    pointer-events: none;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  .lbl {
    display: inline-block;
    pointer-events: none;
  }
`;
var buttonSheet = createComponentSheet(defaultStyle);
var SIZES = {
  xs: { height: 32, pad: 12, iconSize: 16, iconGap: 4, round: 16, square: 8, press: 4, fontSize: 12, lineHeight: 16, fontWeight: 500 },
  s: { height: 40, pad: 16, iconSize: 20, iconGap: 8, round: 20, square: 12, press: 8, fontSize: 14, lineHeight: 20, fontWeight: 500 },
  m: { height: 48, pad: 20, iconSize: 20, iconGap: 8, round: 24, square: 12, press: 8, fontSize: 14, lineHeight: 20, fontWeight: 500 },
  l: { height: 56, pad: 24, iconSize: 24, iconGap: 8, round: 28, square: 16, press: 12, fontSize: 16, lineHeight: 24, fontWeight: 500 },
  xl: { height: 64, pad: 32, iconSize: 28, iconGap: 12, round: 32, square: 28, press: 16, fontSize: 24, lineHeight: 32, fontWeight: 500 }
};
var MdButton = class extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return ["variant", "size", "shape", "disabled", "toggle", "selected", "icon", "trailing-icon", "label", "type"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, buttonSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "filled");
  }
  get size() {
    return SIZES[this.getAttribute("size")] ? this.getAttribute("size") : "s";
  }
  get shape() {
    return this.getAttribute("shape") || "round";
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(v) {
    v ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
  }
  get toggle() {
    return this.hasAttribute("toggle");
  }
  get selected() {
    return this.hasAttribute("selected");
  }
  set selected(v) {
    v ? this.setAttribute("selected", "") : this.removeAttribute("selected");
  }
  get icon() {
    return this.getAttribute("icon") || "";
  }
  get trailingIcon() {
    return this.getAttribute("trailing-icon") || "";
  }
  get labelText() {
    return this.getAttribute("label") || "";
  }
  get type() {
    return this.getAttribute("type") || "button";
  }
  get form() {
    return this._internals?.form;
  }
  _getBaseRadius() {
    const s = SIZES[this.size];
    if (this.shape === "square" || this.toggle && this.selected) return s.square;
    return s.round;
  }
  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle}</style>`}
      <button class="btn" type="button" part="button">
        <span class="state-layer"></span>
        <span class="icon lead-ico" style="display: none;"></span>
        <span class="lbl-wrapper"><slot></slot></span>
        <span class="icon trail-ico" style="display: none;"></span>
      </button>
    `;
  }
  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const btn = this.shadowRoot.querySelector(".btn");
    if (!btn) return;
    bindPress(btn, {
      disabled: () => this.disabled,
      onPress: (e) => {
        const s = SIZES[this.size];
        const baseR = this._getBaseRadius();
        pressScale(btn, 0.96, "expressiveSpatialFast");
        morphShape(btn, baseR, s.press, "expressiveSpatialFast");
        createRipple(e, btn);
      },
      onRelease: () => {
        const s = SIZES[this.size];
        const baseR = this._getBaseRadius();
        releaseScale(btn, 0.96, "expressiveSpatialMedium");
        morphShape(btn, s.press, baseR, "expressiveSpatialMedium");
      },
      onActivate: () => {
        if (this.disabled) return;
        if (this.toggle) {
          this.selected = !this.selected;
          this.dispatchEvent(new CustomEvent("change", { detail: { selected: this.selected }, bubbles: true, composed: true }));
        }
        if (this.type === "submit" && this._internals?.form) {
          this._internals.form.requestSubmit();
        } else if (this.type === "reset" && this._internals?.form) {
          this._internals.form.reset();
        }
      },
      signal
    });
  }
  _sync() {
    const btn = this.shadowRoot.querySelector(".btn");
    if (!btn) return;
    const s = SIZES[this.size];
    const baseR = this._getBaseRadius();
    btn.className = `btn ${this.variant} ${this.size}${this.selected ? " selected" : ""}${this.toggle ? " togglable" : ""}`;
    btn.disabled = this.disabled;
    btn.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    btn.setAttribute("tabindex", this.disabled ? "-1" : "0");
    btn.setAttribute("role", "button");
    if (this.toggle) btn.setAttribute("aria-pressed", this.selected ? "true" : "false");
    else btn.removeAttribute("aria-pressed");
    btn.style.height = `${s.height}px`;
    btn.style.minHeight = `${s.height}px`;
    btn.style.padding = `0 ${s.pad}px`;
    btn.style.gap = `${s.iconGap}px`;
    btn.style.fontSize = `${s.fontSize}px`;
    btn.style.lineHeight = `${s.lineHeight}px`;
    btn.style.fontWeight = `${s.fontWeight}`;
    btn.style.borderRadius = `${baseR}px`;
    const leadIcon = this.shadowRoot.querySelector(".lead-ico");
    const leadVal = this.icon;
    if (leadIcon) {
      leadIcon.textContent = leadVal || "";
      leadIcon.style.display = leadVal ? "inline-flex" : "none";
      leadIcon.style.fontSize = `${s.iconSize}px`;
    }
    const trailIcon = this.shadowRoot.querySelector(".trail-ico");
    const trailVal = this.trailingIcon;
    if (trailIcon) {
      trailIcon.textContent = trailVal || "";
      trailIcon.style.display = trailVal ? "inline-flex" : "none";
      trailIcon.style.fontSize = `${s.iconSize}px`;
    }
    const lblWrapper = this.shadowRoot.querySelector(".lbl-wrapper");
    if (lblWrapper) {
      if (this.labelText) {
        lblWrapper.innerHTML = `<span class="lbl">${escapeHtml(this.labelText)}</span>`;
      } else {
        lblWrapper.innerHTML = "<slot></slot>";
      }
    }
  }
};
if (!customElements.get("md-button")) {
  customElements.define("md-button", MdButton);
}

// src/components/md-split-button.js
var defaultStyle2 = `
  :host { display: inline-block; outline: none; position: relative; vertical-align: middle; user-select: none; }

  .split-container { display: inline-flex; align-items: center; gap: 2px; position: relative; }

  .btn-left, .btn-right {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border: none;
    margin: 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    height: 40px;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-primary, #fff);
    outline: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-radius var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      box-shadow var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, ease);
    will-change: transform, border-radius;
  }
  .btn-left:focus, .btn-right:focus { outline: none; }
  .btn-left:focus-visible, .btn-right:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  .btn-left  { padding: 0 16px; border-radius: 9999px 4px 4px 9999px; }
  .btn-right { width: 40px; padding: 0 9px; border-radius: 4px 9999px 9999px 4px; font-size: 22px; }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 22px;
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }

  /* Inner corner morphs larger on hover/press */
  .btn-left:hover  { border-radius: 9999px 12px 12px 9999px; }
  .btn-right:hover { border-radius: 12px 9999px 9999px 12px; }
  .btn-left.pressed  { border-radius: 9999px 12px 12px 9999px; }
  .btn-right.pressed { border-radius: 12px 9999px 9999px 12px; }

  .chevron { display: inline-block; transition: transform 0.2s var(--md-sys-motion-easing-expressive-spatial, ease); }
  .btn-right.open { border-radius: 50% 9999px 9999px 50% !important; }
  .btn-right.open .chevron { transform: rotate(180deg); }

  /* Variants */
  .v-filled .btn-left   { background-color: var(--md-sys-color-primary, #6750A4); color: var(--md-sys-color-on-primary, #fff); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
  .v-filled .btn-left:hover { box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15)); }
  .v-filled .btn-right  { background-color: var(--md-sys-color-primary, #6750A4); color: var(--md-sys-color-on-primary, #fff); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
  .v-filled .btn-right:hover { box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15)); }
  .v-filled .btn-right.open { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 88%, black); }

  .v-tonal .btn-left   { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
  .v-tonal .btn-left:hover { background-color: color-mix(in srgb, var(--md-sys-color-secondary-container, #E8DEF8) 92%, black); }
  .v-tonal .btn-right  { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
  .v-tonal .btn-right.open { background-color: color-mix(in srgb, var(--md-sys-color-secondary-container, #E8DEF8) 88%, black); }

  .v-elevated .btn-left   { background-color: var(--md-sys-color-surface-container-low, #F7F2FA); color: var(--md-sys-color-primary, #6750A4); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
  .v-elevated .btn-left:hover { box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,.15)); }
  .v-elevated .btn-right  { background-color: var(--md-sys-color-surface-container-low, #F7F2FA); color: var(--md-sys-color-primary, #6750A4); box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,.15)); }
  .v-elevated .btn-right.open { background-color: color-mix(in srgb, var(--md-sys-color-surface-container-low, #F7F2FA) 92%, black); }

  .v-outlined .btn-left   { background-color: transparent; color: var(--md-sys-color-on-surface-variant, #49454F); border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0); }
  .v-outlined .btn-left:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 8%, transparent); }
  .v-outlined .btn-right  { background-color: transparent; color: var(--md-sys-color-on-surface-variant, #49454F); border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0); }
  .v-outlined .btn-right.open { background-color: var(--md-sys-color-inverse-surface, #322F35); color: var(--md-sys-color-inverse-on-surface, #F5EFF7); border-color: var(--md-sys-color-inverse-surface, #322F35); }

  /* Dropdown menu */
  .dropdown-menu {
    display: none;
    position: absolute; top: 100%; right: 0; margin-top: 8px;
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: 16px; padding: 8px 0; min-width: 140px;
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.15));
    opacity: 0; pointer-events: none; transform: translateY(-8px) scale(0.96);
    transition: opacity 0.15s ease, transform 0.15s var(--md-sys-motion-easing-expressive-spatial, ease);
    z-index: 100; text-align: left;
  }
  .dropdown-menu.open { display: block; opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }

  .menu-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 16px;
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer; outline: none;
    transition: background-color 0.15s ease;
  }
  .menu-item:hover { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent); }
  .menu-item:focus-visible { outline: 3px solid var(--md-sys-color-primary, #6750A4); outline-offset: -3px; background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent); }
  .menu-item .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-size: 18px; }
`;
var splitButtonSheet = createComponentSheet(defaultStyle2);
var SIZE = {
  xs: { h: 32, leadPadX: 12, leadPadT: 10, icon: 22, inner: 4 },
  s: { h: 40, leadPadX: 16, leadPadT: 12, icon: 22, inner: 4 },
  m: { h: 56, leadPadX: 24, leadPadT: 24, icon: 26, inner: 6 },
  l: { h: 96, leadPadX: 48, leadPadT: 48, icon: 38, inner: 8 },
  xl: { h: 136, leadPadX: 64, leadPadT: 64, icon: 50, inner: 10 }
};
var MdSplitButton = class extends HTMLElement {
  static get observedAttributes() {
    return ["size", "variant", "label", "icon", "open", "items", "spacing"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, splitButtonSheet);
    this._rendered = false;
    this._abortController = null;
    this._docClick = this._docClick.bind(this);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    document.addEventListener("click", this._docClick);
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
    document.removeEventListener("click", this._docClick);
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "size" || name === "variant" || name === "icon" || name === "items" || name === "spacing") {
      this.render();
      this._setup();
    }
    this._sync();
  }
  get size() {
    return SIZE[this.getAttribute("size")] ? this.getAttribute("size") : "m";
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "filled");
  }
  get label() {
    return this.getAttribute("label") || "Option";
  }
  get icon() {
    return this.getAttribute("icon") || "edit";
  }
  get open() {
    return this.hasAttribute("open");
  }
  get spacing() {
    const s = parseFloat(this.getAttribute("spacing"));
    return isNaN(s) || s < 0 ? 2 : s;
  }
  set spacing(val) {
    if (val === null || val === void 0) this.removeAttribute("spacing");
    else this.setAttribute("spacing", String(val));
  }
  _dim() {
    return SIZE[this.size];
  }
  _parseItems() {
    const raw = this.getAttribute("items");
    if (!raw) return [{ icon: "edit", label: "Edit" }, { icon: "content_copy", label: "Duplicate" }, { icon: "delete", label: "Delete" }];
    if (typeof raw === "string" && (raw.trim().startsWith("[") || raw.trim().startsWith("{"))) {
      const parsed = safeJsonParse(raw, null);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => {
          if (typeof item === "string") return { icon: "", label: item };
          return { icon: item.icon || "", label: item.label || item.text || "" };
        }).filter((it) => it.label);
      }
    }
    return raw.split("|").map((s) => {
      s = s.trim();
      if (!s) return null;
      const m = s.match(/^([a-z_]+):(.*)$/);
      if (m) return { icon: m[1], label: m[2] };
      return { icon: "", label: s };
    }).filter(Boolean);
  }
  openMenu() {
    document.querySelectorAll("md-split-button[open]").forEach((sb) => {
      if (sb !== this) sb.close();
    });
    this.setAttribute("open", "");
  }
  toggle() {
    this.open ? this.close() : this.openMenu();
  }
  close() {
    this.removeAttribute("open");
  }
  _sync() {
    const right = this.shadowRoot.querySelector(".btn-right");
    const menu = this.shadowRoot.querySelector(".dropdown-menu");
    if (right) {
      right.setAttribute("aria-expanded", this.open ? "true" : "false");
      right.classList.toggle("open", this.open);
    }
    if (menu) menu.classList.toggle("open", this.open);
  }
  _docClick(e) {
    if (!this.open) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (!path.includes(this)) {
      this.close();
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const left = this.shadowRoot.querySelector(".btn-left");
    const right = this.shadowRoot.querySelector(".btn-right");
    if (left) {
      left.addEventListener("click", () => {
        if (this.disabled) return;
        this.dispatchEvent(new CustomEvent("action", { detail: { label: this.label }, bubbles: true }));
      }, { signal });
      bindPress(left, {
        disabled: () => this.disabled,
        onPress: () => pressScale(left, 0.95, "expressiveSpatialFast"),
        onRelease: () => releaseScale(left, 0.95, "expressiveSpatialMedium"),
        signal
      });
    }
    if (right) {
      right.addEventListener("click", (e) => {
        if (this.disabled) return;
        e.stopPropagation();
        this.toggle();
        this._focusFirstItem();
      }, { signal });
      bindPress(right, {
        disabled: () => this.disabled,
        onPress: () => pressScale(right, 0.95, "expressiveSpatialFast"),
        onRelease: () => releaseScale(right, 0.95, "expressiveSpatialMedium"),
        signal
      });
    }
    this.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open) {
        this.close();
        right && right.focus();
      }
    }, { signal });
    document.removeEventListener("click", this._docClick);
    document.addEventListener("click", this._docClick);
    this.shadowRoot.querySelectorAll(".menu-item").forEach((item, i) => {
      item.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("menu-select", { detail: { index: i, label: item.dataset.label }, bubbles: true }));
        this.close();
      }, { signal });
    });
  }
  _focusFirstItem() {
    requestAnimationFrame(() => {
      const first = this.shadowRoot.querySelector(".menu-item");
      if (first) first.focus();
    });
  }
  render() {
    const d = this._dim();
    const v = this.variant;
    const inner = d.inner;
    const trailPad = Math.max(0, (d.h - d.icon) / 2);
    const items = this._parseItems();
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle2}</style>`}
      <div class="split-container v-${escapeHtml(v)}">
        <div class="btn-left" role="button" tabindex="0" aria-label="${escapeHtml(this.label)}">
          <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(this.icon)}</span>
          <span>${escapeHtml(this.label)}</span>
        </div>
        <div class="btn-right" role="button" tabindex="0"
          aria-label="Open menu" aria-haspopup="menu" aria-expanded="${this.open ? "true" : "false"}" aria-pressed="${this.open ? "true" : "false"}">
          <span class="material-symbols-outlined chevron" aria-hidden="true">expand_more</span>
        </div>

        <div class="dropdown-menu" role="menu">
          ${items.map((it) => `<div class="menu-item" role="menuitem" tabindex="-1" data-label="${escapeHtml(it.label)}">${it.icon ? `<span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(it.icon)}</span>` : ""}<span>${escapeHtml(it.label)}</span></div>`).join("")}
        </div>
      </div>
    `;
  }
};
if (!customElements.get("md-split-button")) {
  customElements.define("md-split-button", MdSplitButton);
}

// src/components/md-icon-button.js
var defaultStyle3 = `
  :host {
    display: inline-flex;
    vertical-align: middle;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .btn {
    position: relative;
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    border: none;
    outline: none;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    background: transparent;
    overflow: hidden;
    transition:
      background-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      border-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease);
  }

  /* Focus Ring */
  .btn:focus-visible::after {
    content: '';
    position: absolute;
    inset: -4px;
    border: 3px solid var(--md-sys-color-secondary, #625b71);
    border-radius: inherit;
    pointer-events: none;
  }

  /* Touch Target: 48dp minimum */
  .btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 48px;
    min-height: 48px;
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }

  /* State Layer */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-color: currentColor;
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short-2, 100ms) ease;
  }

  .btn:hover:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-hover-opacity, 0.08);
  }
  .btn:focus-visible:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-focus-opacity, 0.10);
  }
  .btn:active:not([disabled]) .state-layer {
    opacity: var(--md-sys-state-pressed-opacity, 0.10);
  }

  /* Ripple */
  .md-ripple-effect {
    position: absolute;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.15;
    transform: scale(0);
    animation: ripple-anim 400ms var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1)) forwards;
    pointer-events: none;
  }

  @keyframes ripple-anim {
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Standard */
  .btn.standard {
    color: var(--md-sys-color-on-surface-variant, #49454f);
    background: transparent;
  }
  .btn.standard.togglable.selected {
    color: var(--md-sys-color-primary, #6750a4);
  }

  /* Filled */
  .btn.filled {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
  }
  .btn.filled.togglable {
    background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
    color: var(--md-sys-color-primary, #6750a4);
  }
  .btn.filled.togglable.selected {
    background-color: var(--md-sys-color-primary, #6750a4);
    color: var(--md-sys-color-on-primary, #ffffff);
  }

  /* Tonal */
  .btn.tonal {
    background-color: var(--md-sys-color-secondary-container, #e8def8);
    color: var(--md-sys-color-on-secondary-container, #1d192b);
  }
  .btn.tonal.togglable {
    background-color: var(--md-sys-color-surface-container, #f3edf7);
    color: var(--md-sys-color-on-surface-variant, #49454f);
  }
  .btn.tonal.togglable.selected {
    background-color: var(--md-sys-color-secondary, #625b71);
    color: var(--md-sys-color-on-secondary, #ffffff);
  }

  /* Outlined */
  .btn.outlined {
    border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    color: var(--md-sys-color-on-surface-variant, #49454f);
    background: transparent;
  }
  .btn.outlined.togglable.selected {
    background-color: var(--md-sys-color-inverse-surface, #313033);
    color: var(--md-sys-color-inverse-on-surface, #f4eff4);
    border-color: var(--md-sys-color-inverse-surface, #313033);
  }

  /* Disabled */
  .btn:disabled, .btn[disabled] {
    cursor: not-allowed;
    box-shadow: none !important;
    pointer-events: none;
  }
  .btn.filled:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
  }
  .btn.tonal:disabled {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
  }
  .btn.standard:disabled {
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
    background: transparent;
  }
  .btn.outlined:disabled {
    border-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 12%, transparent);
    color: color-mix(in srgb, var(--md-sys-color-on-surface, #1d1b20) 38%, transparent);
    background: transparent;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', 'Google Symbols', sans-serif;
    font-size: 24px;
    line-height: 1;
    pointer-events: none;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  .btn.selected .icon {
    font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
`;
var iconButtonSheet = createComponentSheet(defaultStyle3);
var SIZES2 = {
  xs: { size: 32, iconSize: 18 },
  s: { size: 40, iconSize: 24 },
  m: { size: 56, iconSize: 28 },
  l: { size: 96, iconSize: 40 },
  xl: { size: 136, iconSize: 56 }
};
var MdIconButton = class extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "size", "toggle", "selected", "checked", "disabled", "icon", "selected-icon", "aria-label"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, iconButtonSheet);
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "checked") {
      if (this.hasAttribute("checked") && !this.hasAttribute("selected")) {
        this.setAttribute("selected", "");
      } else if (!this.hasAttribute("checked") && this.hasAttribute("selected")) {
        this.removeAttribute("selected");
      }
    }
    this._sync();
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "standard");
  }
  get size() {
    return SIZES2[this.getAttribute("size")] ? this.getAttribute("size") : "s";
  }
  get toggle() {
    return this.hasAttribute("toggle");
  }
  get selected() {
    return this.hasAttribute("selected") || this.hasAttribute("checked");
  }
  set selected(v) {
    if (v) {
      this.setAttribute("selected", "");
    } else {
      this.removeAttribute("selected");
      this.removeAttribute("checked");
    }
  }
  get checked() {
    return this.selected;
  }
  set checked(v) {
    this.selected = v;
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(v) {
    v ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
  }
  get icon() {
    return this.getAttribute("icon") || "";
  }
  get selectedIcon() {
    return this.getAttribute("selected-icon") || this.icon;
  }
  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle3}</style>`}
      <button class="btn" type="button" part="button">
        <span class="state-layer"></span>
        <span class="icon"><slot></slot></span>
      </button>
    `;
  }
  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const btn = this.shadowRoot.querySelector(".btn");
    if (!btn) return;
    bindPress(btn, {
      disabled: () => this.disabled,
      onPress: (e) => {
        pressScale(btn, 0.9, "expressiveSpatialFast");
        createRipple(e, btn);
      },
      onRelease: () => {
        releaseScale(btn, 0.9, "expressiveSpatialMedium");
      },
      onActivate: () => {
        if (this.disabled) return;
        if (this.toggle) {
          this.selected = !this.selected;
          this.dispatchEvent(new CustomEvent("change", { detail: { selected: this.selected }, bubbles: true, composed: true }));
        }
      },
      signal
    });
  }
  _sync() {
    const btn = this.shadowRoot.querySelector(".btn");
    if (!btn) return;
    const s = SIZES2[this.size] || SIZES2.s;
    btn.className = `btn ${this.variant} ${this.size}${this.selected ? " selected" : ""}${this.toggle ? " togglable" : ""}`;
    btn.disabled = this.disabled;
    btn.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    btn.setAttribute("tabindex", this.disabled ? "-1" : "0");
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-label", sanitizeAttribute(this.getAttribute("aria-label") || this.icon || "icon button"));
    if (this.toggle) btn.setAttribute("aria-pressed", this.selected ? "true" : "false");
    else btn.removeAttribute("aria-pressed");
    btn.style.width = `${s.size}px`;
    btn.style.height = `${s.size}px`;
    btn.style.minWidth = `${s.size}px`;
    btn.style.minHeight = `${s.size}px`;
    const iconSlot = this.shadowRoot.querySelector(".icon");
    if (iconSlot) {
      iconSlot.style.fontSize = `${s.iconSize}px`;
      const activeIcon = this.selected && this.selectedIcon ? this.selectedIcon : this.icon;
      if (activeIcon) {
        iconSlot.textContent = activeIcon;
      }
    }
  }
};
if (!customElements.get("md-icon-button")) {
  customElements.define("md-icon-button", MdIconButton);
}

// src/components/md-fab.js
var defaultStyle4 = `
  :host { display: inline-block; outline: none; }

  .fab {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border: none;
    margin: 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
    color: var(--md-sys-color-on-primary, #fff);
    background-color: var(--md-sys-color-primary, #6750A4);
    box-shadow: none;
    min-width: 56px;
    height: 56px;
    padding: 0 16px;
    border-radius: 16px;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    will-change: transform;
    outline: none;
  }
  .fab:focus { outline: none; }
  .fab:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
  }

  .fab:not([disabled]):hover { box-shadow: none; }

  /* Color roles (\xA74.3) */
  .fab.primary      { background-color: var(--md-sys-color-primary, #6750A4); color: var(--md-sys-color-on-primary, #fff); }
  .fab.secondary    { background-color: var(--md-sys-color-secondary, #625B71); color: var(--md-sys-color-on-secondary, #fff); }
  .fab.tertiary     { background-color: var(--md-sys-color-tertiary, #7D5260); color: var(--md-sys-color-on-tertiary, #fff); }
  .fab.primary-container   { background-color: var(--md-sys-color-primary-container, #EADDFF); color: var(--md-sys-color-on-primary-container, #21005D); }
  .fab.secondary-container { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
  .fab.tertiary-container  { background-color: var(--md-sys-color-tertiary-container, #FFD8E4); color: var(--md-sys-color-on-tertiary-container, #31111D); }

  .fab[disabled] {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none;
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent) !important;
    color: var(--md-sys-color-on-surface-variant, #49454F) !important;
  }

  .fab .material-symbols-outlined {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }
  .fab .lbl { white-space: nowrap; }
`;
var fabSheet = createComponentSheet(defaultStyle4);
var FAB = {
  small: { h: 40, r: 12, icon: 24, padX: 0 },
  medium: { h: 80, r: 16, icon: 28, padX: 0 },
  large: { h: 96, r: 28, icon: 32, padX: 0 },
  baseline: { h: 56, r: 16, icon: 24, padX: 0 }
};
var EXT = {
  small: { h: 56, r: 16, icon: 24, padX: 16 },
  medium: { h: 80, r: 16, icon: 28, padX: 26 },
  large: { h: 96, r: 28, icon: 32, padX: 28 },
  baseline: { h: 56, r: 16, icon: 24, padX: 16 }
};
var MdFab = class extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "color", "size", "icon", "label", "disabled", "container-color", "content-color", "expanded", "lowered"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, fabSheet);
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "variant" || name === "color" || name === "size" || name === "label" || name === "icon" || name === "container-color" || name === "content-color" || name === "expanded" || name === "lowered") {
      this.render();
      this._setup();
    }
    this._sync();
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "surface");
  }
  set variant(val) {
    if (val === null || val === void 0) this.removeAttribute("variant");
    else this.setAttribute("variant", val);
  }
  get color() {
    return sanitizeAttribute(this.getAttribute("color") || "primary");
  }
  set color(val) {
    if (val === null || val === void 0) this.removeAttribute("color");
    else this.setAttribute("color", val);
  }
  get size() {
    return this.getAttribute("size") || "medium";
  }
  set size(val) {
    if (val === null || val === void 0) this.removeAttribute("size");
    else this.setAttribute("size", val);
  }
  get icon() {
    return this.getAttribute("icon") || "add";
  }
  set icon(val) {
    if (val === null || val === void 0) this.removeAttribute("icon");
    else this.setAttribute("icon", val);
  }
  get label() {
    return this.getAttribute("label") || "";
  }
  set label(val) {
    if (val === null || val === void 0) this.removeAttribute("label");
    else this.setAttribute("label", val);
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(val) {
    if (val === null || val === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", val);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(val) {
    if (val === null || val === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", val);
  }
  get expanded() {
    if (this.getAttribute("expanded") === "false") return false;
    return this.hasAttribute("expanded") || this.variant === "extended" || Boolean(this.label);
  }
  set expanded(val) {
    if (val) this.setAttribute("expanded", "");
    else this.setAttribute("expanded", "false");
  }
  get lowered() {
    return this.hasAttribute("lowered");
  }
  set lowered(val) {
    if (val) this.setAttribute("lowered", "");
    else this.removeAttribute("lowered");
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get isExtended() {
    return this.expanded;
  }
  _dims() {
    const s = this.size;
    const table = this.isExtended ? EXT : FAB;
    return table[s] || (this.isExtended ? EXT.medium : FAB.medium);
  }
  _sync() {
    const fab = this.shadowRoot.querySelector(".fab");
    if (!fab) return;
    const d = this._dims();
    const isExt = this.isExtended;
    fab.style.minWidth = `${d.h}px`;
    fab.style.width = isExt ? "auto" : `${d.h}px`;
    fab.style.height = `${d.h}px`;
    fab.style.padding = isExt ? `0 ${d.padX}px` : "0";
    fab.style.borderRadius = `${d.r}px`;
    if (this.containerColor) fab.style.backgroundColor = this.containerColor;
    if (this.contentColor) fab.style.color = this.contentColor;
    const iconEl = fab.querySelector(".material-symbols-outlined");
    if (iconEl) iconEl.style.fontSize = `${d.icon}px`;
    const fabAriaLabel = this.getAttribute("aria-label") || (isExt && this.label ? this.icon ? `${this.icon} ${this.label}` : this.label : this.label || this.icon || "Floating action button");
    fab.setAttribute("aria-label", fabAriaLabel);
    fab.disabled = this.disabled;
    fab.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    fab.setAttribute("tabindex", this.disabled ? "-1" : "0");
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const fab = this.shadowRoot.querySelector(".fab");
    if (!fab) return;
    bindPress(fab, {
      disabled: () => this.disabled,
      onPress: () => pressScale(fab, 0.92, "expressiveSpatialFast"),
      onRelease: () => releaseScale(fab, 0.92, "expressiveSpatialMedium"),
      signal
    });
  }
  render() {
    const isExt = this.isExtended;
    const c = this.color;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    const fabAriaLabel = this.getAttribute("aria-label") || (isExt && this.label ? this.icon ? `${this.icon} ${this.label}` : this.label : this.label || this.icon || "Floating action button");
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle4}</style>`}
      <button class="fab ${escapeHtml(c)} ${escapeHtml(this.variant)}${isExt ? " extended" : ""}" ${this.disabled ? "disabled" : ""}
        tabindex="${this.disabled ? -1 : 0}" role="button"
        aria-label="${escapeHtml(fabAriaLabel)}"
        aria-disabled="${this.disabled}">
        <span class="material-symbols-outlined" aria-hidden="true">${escapeHtml(this.icon)}</span>
        ${isExt && this.label ? `<span class="lbl">${escapeHtml(this.label)}</span>` : ""}
      </button>
    `;
  }
};
if (!customElements.get("md-fab")) {
  customElements.define("md-fab", MdFab);
}

// src/components/md-card.js
var defaultStyle5 = `
  :host {
    display: block;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .card {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    padding: var(--md-card-padding, var(--md-sys-spacing-4, 16px));
    gap: var(--md-card-gap, 16px);
    height: 100%;
    color: var(--md-sys-color-on-surface, #1d1b20);
    font-family: var(--md-sys-typescale-font-family, 'Roboto', system-ui, sans-serif);
    overflow: hidden;
    will-change: transform, box-shadow;
    transition:
      box-shadow var(--md-sys-motion-duration-medium-2, 300ms) var(--md-sys-motion-easing-emphasized, ease),
      background-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease),
      border-color var(--md-sys-motion-duration-short-2, 100ms) var(--md-sys-motion-easing-emphasized, ease);
    outline: none;
  }

  /* Focus Ring (\xA75.3) */
  .card:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625b71);
    outline-offset: 2px;
  }

  .card.interactive {
    cursor: pointer;
    user-select: none;
  }

  /* State Layer (\xA75.1 & \xA75.2) */
  .state-layer {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    background-color: var(--md-sys-color-on-surface, #1d1b20);
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short-2, 100ms) ease;
  }

  .card.interactive:hover:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-hover-opacity, 0.08);
  }
  .card.interactive:focus-visible:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-focus-opacity, 0.10);
  }
  .card.interactive:active:not(.disabled) .state-layer,
  .card.interactive.pressed:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-pressed-opacity, 0.10);
  }

  /* Ripple Effect */
  .md-ripple-effect {
    position: absolute;
    border-radius: 50%;
    background-color: currentColor;
    opacity: 0.10;
    transform: scale(0);
    animation: ripple-anim 450ms var(--md-sys-motion-easing-emphasized-decelerate, cubic-bezier(0.05, 0.7, 0.1, 1)) forwards;
    pointer-events: none;
  }

  @keyframes ripple-anim {
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Elevated Card (\xA78.2) */
  .card.elevated {
    background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
    border: none;
  }
  .card.elevated.interactive:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level2, 0px 1px 2px rgba(0,0,0,0.3));
  }
  .card.elevated.interactive:active:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Filled Card (\xA78.2) */
  .card.filled {
    background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
    box-shadow: var(--md-sys-elevation-level0, none);
    border: none;
  }
  .card.filled.interactive:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Outlined Card (\xA78.2) */
  .card.outlined {
    background-color: var(--md-sys-color-surface, #fef7ff);
    border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    box-shadow: var(--md-sys-elevation-level0, none);
  }
  .card.outlined.interactive:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level1, 0px 1px 2px rgba(0,0,0,0.3));
  }

  /* Disabled State */
  .card.disabled {
    opacity: 0.38;
    cursor: not-allowed;
    box-shadow: none !important;
    pointer-events: none;
  }

  /* Slot Layouts (\xA78.1) */
  ::slotted([slot="header"]) {
    margin-bottom: var(--md-sys-spacing-3, 12px);
  }
  ::slotted([slot="media"]) {
    margin: calc(-1 * var(--md-sys-spacing-4, 16px)) calc(-1 * var(--md-sys-spacing-4, 16px)) var(--md-sys-spacing-4, 16px) calc(-1 * var(--md-sys-spacing-4, 16px));
    width: calc(100% + 2 * var(--md-sys-spacing-4, 16px));
    display: block;
    object-fit: cover;
  }
  ::slotted([slot="actions"]) {
    margin-top: var(--md-sys-spacing-4, 16px);
    display: flex;
    gap: var(--md-sys-spacing-2, 8px);
    justify-content: flex-end;
    align-items: center;
  }
`;
var cardSheet = createComponentSheet(defaultStyle5);
var MdCard = class extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "interactive", "disabled", "href"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, cardSheet);
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
    this._bindEvents();
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "filled");
  }
  get interactive() {
    return this.hasAttribute("interactive") || Boolean(this.href);
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get href() {
    return this.getAttribute("href") || "";
  }
  _render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle5}</style>`}
      <div class="card" role="region" part="card">
        <span class="state-layer"></span>
        <slot name="media"></slot>
        <slot name="header"></slot>
        <slot></slot>
        <slot name="actions"></slot>
      </div>
    `;
  }
  _bindEvents() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;
    const press = (e) => {
      if (!this.interactive || this.disabled) return;
      if (e) createRipple(e, card);
      pressScale(card, 0.98, "expressiveSpatialFast");
    };
    const release = () => {
      if (!this.interactive || this.disabled) return;
      releaseScale(card, 0.98, "expressiveSpatialMedium");
    };
    const activate = () => {
      if (!this.interactive || this.disabled) return;
      if (this.href) {
        window.open(this.href, "_self");
      }
      this.dispatchEvent(new CustomEvent("action", {
        detail: { href: this.href },
        bubbles: true,
        composed: true
      }));
    };
    card.addEventListener("click", activate, { signal });
    bindPress(card, {
      disabled: () => !this.interactive || this.disabled,
      onPress: press,
      onRelease: release,
      signal
    });
  }
  _sync() {
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;
    const isInteractive = this.interactive && !this.disabled;
    card.className = `card ${this.variant}${isInteractive ? " interactive" : ""}${this.disabled ? " disabled" : ""}`;
    if (isInteractive) {
      card.setAttribute("role", this.href ? "link" : "button");
      card.setAttribute("tabindex", "0");
    } else {
      card.setAttribute("role", "region");
      card.removeAttribute("tabindex");
    }
    card.setAttribute("aria-disabled", this.disabled ? "true" : "false");
  }
};
if (!customElements.get("md-card")) {
  customElements.define("md-card", MdCard);
}

// src/components/md-chip.js
var defaultStyle6 = `
  :host {
    display: inline-flex;
    outline: none;
    vertical-align: middle;
  }

  .chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    height: 32px;
    min-height: 32px;
    padding: 0 12px;
    box-sizing: border-box;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    line-height: var(--md-sys-typescale-label-large-line-height, 20px);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    background-color: transparent;
    border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0);
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      box-shadow var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, ease);
    outline: none;
    will-change: transform;
  }
  .chip:focus { outline: none; }
  .chip:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, #625B71);
    outline-offset: 2px;
  }

  .chip::after {
    content: '';
    position: absolute;
    inset: calc((48px - 100%) / 2) 0;
    pointer-events: auto;
  }

  .chip::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .chip:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .chip:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .chip.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  .chip.assist,
  .chip.suggestion,
  .chip.action {
    background-color: transparent;
    border-color: var(--md-sys-color-outline-variant, #CAC4D0);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }

  .chip.filter,
  .chip.input {
    background-color: transparent;
    border-color: var(--md-sys-color-outline-variant, #CAC4D0);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }

  .chip.filter.selected,
  .chip.input.selected,
  .chip.action.selected {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    border-color: transparent;
    color: var(--md-sys-color-on-secondary-container, #1D192B);
  }

  .chip.elevated {
    background-color: var(--md-sys-color-surface-container-low, #F7F2FA);
    border-color: transparent;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
  }
  .chip.elevated:hover:not(.disabled) {
    box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,0.15));
  }

  .chip.disabled {
    cursor: not-allowed;
    opacity: 0.38;
    box-shadow: none;
  }

  .lbl {
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lbl-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  ::slotted([slot="avatar"]) {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    margin-left: -4px;
  }

  .ico {
    font-family: 'Material Symbols Outlined';
    font-size: 18px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--md-sys-color-primary, #6750A4);
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    pointer-events: none;
  }
  .chip.selected .ico {
    color: var(--md-sys-color-on-secondary-container, #1D192B);
  }

  .remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: none;
    background: transparent;
    padding: 0;
    margin-left: -2px;
    margin-right: -6px;
    cursor: pointer;
    color: inherit;
    border-radius: 9999px;
    width: 20px;
    height: 20px;
    outline: none;
  }
  .remove-btn:hover {
    background-color: color-mix(in srgb, currentColor 12%, transparent);
  }
`;
var chipSheet = createComponentSheet(defaultStyle6);
var MdChip = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "variant",
      "label",
      "icon",
      "trailing-icon",
      "selected",
      "disabled",
      "elevated",
      "removable",
      "horizontal-arrangement",
      "container-color",
      "content-color"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, chipSheet);
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "variant" || name === "removable" || name === "horizontal-arrangement" || name === "container-color" || name === "content-color") {
      this.render();
      this._setup();
    }
    this._sync();
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "assist");
  }
  get label() {
    return this.getAttribute("label") || "";
  }
  get icon() {
    return this.getAttribute("icon") || "";
  }
  get trailingIcon() {
    return this.getAttribute("trailing-icon") || "";
  }
  get horizontalArrangement() {
    return this.getAttribute("horizontal-arrangement") || "start";
  }
  set horizontalArrangement(val) {
    if (val === null || val === void 0) this.removeAttribute("horizontal-arrangement");
    else this.setAttribute("horizontal-arrangement", val);
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(val) {
    if (val === null || val === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", val);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(val) {
    if (val === null || val === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", val);
  }
  get selected() {
    return this.hasAttribute("selected");
  }
  set selected(val) {
    if (val) this.setAttribute("selected", "");
    else this.removeAttribute("selected");
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get elevated() {
    return this.hasAttribute("elevated");
  }
  get removable() {
    return this.hasAttribute("removable") || this.variant === "input";
  }
  _sync() {
    const chip = this.shadowRoot.querySelector(".chip");
    const lbl = this.shadowRoot.querySelector(".lbl-text");
    const leadingIcon = this.shadowRoot.querySelector(".leading-ico");
    if (!chip) return;
    const isFilter = this.variant === "filter";
    chip.className = `chip ${this.variant}${this.elevated ? " elevated" : ""}${this.selected ? " selected" : ""}${this.disabled ? " disabled" : ""}`;
    chip.setAttribute("tabindex", this.disabled ? "-1" : "0");
    chip.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    if (isFilter) {
      chip.setAttribute("role", "checkbox");
      chip.setAttribute("aria-checked", this.selected ? "true" : "false");
    } else {
      chip.setAttribute("role", "button");
      chip.removeAttribute("aria-checked");
    }
    if (lbl) lbl.textContent = this.label;
    if (leadingIcon) {
      leadingIcon.textContent = isFilter ? this.selected ? "check" : this.icon || "" : this.icon;
      leadingIcon.style.display = isFilter && this.selected || this.icon ? "inline-flex" : "none";
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const chip = this.shadowRoot.querySelector(".chip");
    const removeBtn = this.shadowRoot.querySelector(".remove-btn");
    if (!chip) return;
    const press = () => {
      pressScale(chip, 0.95, "expressiveSpatialFast");
    };
    const release = () => {
      releaseScale(chip, 0.95, "expressiveSpatialMedium");
    };
    const activate = () => {
      if (this.disabled) return;
      if (this.variant === "filter") {
        this.selected = !this.selected;
        this._sync();
        this.dispatchEvent(new CustomEvent("change", {
          detail: { selected: this.selected, label: this.label },
          bubbles: true,
          composed: true
        }));
      }
    };
    bindPress(chip, {
      disabled: () => this.disabled,
      onPress: press,
      onRelease: release,
      onActivate: activate,
      signal
    });
    if (removeBtn) {
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.disabled) return;
        const ev = new CustomEvent("remove", {
          detail: { label: this.label },
          bubbles: true,
          composed: true,
          cancelable: true
        });
        const notCancelled = this.dispatchEvent(ev);
        if (notCancelled) {
          this.remove();
        }
      }, { signal });
    }
  }
  render() {
    const isFilter = this.variant === "filter";
    const hasLeading = this.icon || isFilter;
    const isRemovable = this.removable;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle6}</style>`}
      <div class="chip ${escapeHtml(this.variant)}${this.elevated ? " elevated" : ""}${this.selected ? " selected" : ""}" part="chip">
        <slot name="avatar"></slot>
        <span class="ico leading-ico" aria-hidden="true" style="display: ${hasLeading ? "inline-flex" : "none"};">
          ${escapeHtml(isFilter ? this.selected ? "check" : this.icon || "" : this.icon)}
        </span>
        <span class="lbl"><span class="lbl-text">${escapeHtml(this.label)}</span><slot></slot></span>
        ${this.trailingIcon && !isRemovable ? `<span class="ico trailing-ico" aria-hidden="true">${escapeHtml(this.trailingIcon)}</span>` : ""}
        ${isRemovable ? `
          <button class="remove-btn" type="button" aria-label="Remove" tabindex="-1">
            <span class="ico" aria-hidden="true">close</span>
          </button>
        ` : ""}
      </div>
    `;
  }
};
if (!customElements.get("md-chip")) {
  customElements.define("md-chip", MdChip);
}

// src/components/md-slider.js
var defaultStyle7 = `
  :host {
    display: block;
    width: 100%;
    outline: none;
    user-select: none;
    touch-action: none;
    vertical-align: middle;
  }

  .slider-root {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 48px;
    box-sizing: border-box;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  .slider-root:focus { outline: none; }
  .slider-root:focus-visible .thumb {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 3px;
  }

  .track-box {
    position: relative;
    width: 100%;
    height: 16px;
    border-radius: 9999px;
    background: var(--md-slider-track-bg, var(--md-sys-color-secondary-container, #E8DEF8));
    overflow: visible;
  }

  .active-track {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 50%;
    background: var(--md-slider-active-track-bg, var(--md-sys-color-primary, #6750A4));
    border-radius: 9999px;
    pointer-events: none;
  }

  /* Stops dots */
  .stops {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .stop-dot {
    position: absolute;
    top: 50%;
    width: 4px;
    height: 4px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-on-secondary-container, #1D192B);
    transform: translate(-50%, -50%);
    opacity: 0.5;
  }
  .stop-dot.active {
    background-color: var(--md-sys-color-on-primary, #FFFFFF);
    opacity: 0.7;
  }

  /* Handle (Thumb) \u2014 44dp height, 4dp resting width -> morphs to 2dp on focus/press */
  .thumb {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 44px;
    border-radius: 9999px;
    background: var(--md-slider-thumb-bg, var(--md-sys-color-primary, #6750A4));
    transform: translate(-50%, -50%);
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    transition:
      width var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      transform var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }

  .slider-root:hover .thumb {
    width: 6px;
  }
  .slider-root.pressed .thumb,
  .slider-root:focus-visible .thumb {
    width: 2px;
    height: 44px;
    transform: translate(-50%, -50%) scale(1.15, 0.95);
  }

  /* Value Indicator (Tooltip) */
  .tooltip {
    position: absolute;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%) scale(0);
    transform-origin: bottom center;
    background-color: var(--md-sys-color-inverse-surface, #322F35);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    padding: 4px 8px;
    border-radius: 8px;
    pointer-events: none;
    opacity: 0;
    white-space: nowrap;
    transition:
      transform var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }

  .slider-root.pressed .tooltip,
  .slider-root.labeled .tooltip,
  .slider-root:hover .tooltip {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }

  .slider-root.disabled {
    cursor: not-allowed;
    opacity: 0.38;
  }
  .slider-root.disabled .active-track,
  .slider-root.disabled .thumb {
    background-color: var(--md-sys-color-on-surface, #1D1B20);
    box-shadow: none;
  }
`;
var sliderSheet = createComponentSheet(defaultStyle7);
var MdSlider = class extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return [
      "value",
      "min",
      "max",
      "step",
      "disabled",
      "labeled",
      "stops",
      "size",
      "centered",
      "orientation",
      "name",
      "value-range",
      "steps",
      "top-to-bottom",
      "range",
      "range-start",
      "range-end"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, sliderSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._isDragging = false;
    this._rendered = false;
    this._currentValue = 50;
    this._abortController = null;
  }
  get form() {
    return this._internals?.form;
  }
  get name() {
    return this.getAttribute("name");
  }
  set name(val) {
    this.setAttribute("name", val);
  }
  get type() {
    return "range";
  }
  formResetCallback() {
    this.value = parseFloat(this.getAttribute("value")) || 0;
  }
  formStateRestoreCallback(state) {
    if (state != null) this.value = parseFloat(state) || 0;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "value") {
      this._currentValue = this.value;
      this._internals?.setFormValue(String(this.value));
    } else if (name === "value-range") {
      const parts = String(newVal).split("..").map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        this.min = parts[0];
        this.max = parts[1];
      }
    } else if (name === "steps") {
      const st = parseInt(newVal, 10);
      if (!isNaN(st) && st > 0) {
        this.step = (this.max - this.min) / st;
      }
    }
    this._sync();
  }
  get value() {
    const val = parseFloat(this.getAttribute("value"));
    return isNaN(val) ? 50 : val;
  }
  set value(val) {
    const clamped = Math.min(this.max, Math.max(this.min, val));
    const finalVal = this.step > 0 ? Math.round((clamped - this.min) / this.step) * this.step + this.min : clamped;
    this._currentValue = finalVal;
    this.setAttribute("value", String(Number(finalVal.toFixed(4))));
    this._internals?.setFormValue(String(Number(finalVal.toFixed(4))));
  }
  get min() {
    const v = parseFloat(this.getAttribute("min"));
    return isNaN(v) ? 0 : v;
  }
  set min(v) {
    this.setAttribute("min", String(v));
  }
  get max() {
    const v = parseFloat(this.getAttribute("max"));
    return isNaN(v) ? 100 : v;
  }
  set max(v) {
    this.setAttribute("max", String(v));
  }
  get step() {
    const v = parseFloat(this.getAttribute("step"));
    return isNaN(v) ? 0 : v;
  }
  set step(v) {
    this.setAttribute("step", String(v));
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get labeled() {
    return this.hasAttribute("labeled");
  }
  get stops() {
    return this.hasAttribute("stops") || this.step > 0;
  }
  get valueRange() {
    return [this.min, this.max];
  }
  set valueRange(val) {
    if (Array.isArray(val) && val.length === 2) {
      this.min = val[0];
      this.max = val[1];
    } else if (typeof val === "string") {
      this.setAttribute("value-range", val);
    }
  }
  get steps() {
    const st = parseInt(this.getAttribute("steps"), 10);
    if (!isNaN(st) && st > 0) return st;
    return this.step > 0 ? Math.floor((this.max - this.min) / this.step) : 0;
  }
  set steps(val) {
    if (val === null || val === void 0) this.removeAttribute("steps");
    else this.setAttribute("steps", String(val));
  }
  get topToBottom() {
    return this.hasAttribute("top-to-bottom");
  }
  set topToBottom(val) {
    if (val) this.setAttribute("top-to-bottom", "");
    else this.removeAttribute("top-to-bottom");
  }
  get range() {
    return this.hasAttribute("range");
  }
  set range(val) {
    if (val) this.setAttribute("range", "");
    else this.removeAttribute("range");
  }
  get rangeStart() {
    const v = parseFloat(this.getAttribute("range-start"));
    return isNaN(v) ? this.min : v;
  }
  set rangeStart(val) {
    if (val === null || val === void 0) this.removeAttribute("range-start");
    else this.setAttribute("range-start", String(val));
  }
  get rangeEnd() {
    const v = parseFloat(this.getAttribute("range-end"));
    return isNaN(v) ? this.value : v;
  }
  set rangeEnd(val) {
    if (val === null || val === void 0) this.removeAttribute("range-end");
    else this.setAttribute("range-end", String(val));
  }
  get size() {
    return this.getAttribute("size") || "xs";
  }
  // 'xs'(16dp) | 'sm'(24dp) | 'md'(32dp) | 'lg'(40dp) | 'xl'(48dp)
  set size(v) {
    this.setAttribute("size", v);
  }
  get centered() {
    return this.hasAttribute("centered");
  }
  set centered(v) {
    if (v) this.setAttribute("centered", "");
    else this.removeAttribute("centered");
  }
  get orientation() {
    return this.getAttribute("orientation") || "horizontal";
  }
  set orientation(v) {
    this.setAttribute("orientation", v);
  }
  _pct(val = this.value) {
    const range = this.max - this.min;
    if (range <= 0) return 0;
    return Math.min(100, Math.max(0, (val - this.min) / range * 100));
  }
  _sync() {
    const root = this.shadowRoot.querySelector(".slider-root");
    const activeTrack = this.shadowRoot.querySelector(".active-track");
    const thumb = this.shadowRoot.querySelector(".thumb");
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    if (!root || !activeTrack || !thumb) return;
    const pct = this._pct(this.value);
    activeTrack.style.width = `${pct}%`;
    thumb.style.left = `${pct}%`;
    if (tooltip) tooltip.textContent = Math.round(this.value);
    root.className = `slider-root${this.disabled ? " disabled" : ""}${this.labeled ? " labeled" : ""}`;
    root.setAttribute("tabindex", this.disabled ? "-1" : "0");
    root.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    root.setAttribute("aria-valuenow", String(this.value));
    root.setAttribute("aria-valuemin", String(this.min));
    root.setAttribute("aria-valuemax", String(this.max));
    this._renderStops();
  }
  _renderStops() {
    const stopsContainer = this.shadowRoot.querySelector(".stops");
    if (!stopsContainer) return;
    if (!this.stops || this.step <= 0) {
      if (stopsContainer.childNodes.length > 0) stopsContainer.innerHTML = "";
      return;
    }
    const count = Math.floor((this.max - this.min) / this.step);
    if (count <= 0 || count > 100) {
      if (stopsContainer.childNodes.length > 0) stopsContainer.innerHTML = "";
      return;
    }
    const currentPct = this._pct(this.value);
    const existingDots = stopsContainer.children;
    if (existingDots.length !== count + 1) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i <= count; i++) {
        const dot = document.createElement("span");
        const p = i / count * 100;
        dot.className = `stop-dot${p <= currentPct ? " active" : ""}`;
        dot.style.left = `${p}%`;
        frag.appendChild(dot);
      }
      stopsContainer.replaceChildren(frag);
    } else {
      for (let i = 0; i <= count; i++) {
        const dot = existingDots[i];
        const p = i / count * 100;
        dot.classList.toggle("active", p <= currentPct);
      }
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const root = this.shadowRoot.querySelector(".slider-root");
    const trackBox = this.shadowRoot.querySelector(".track-box");
    const thumb = this.shadowRoot.querySelector(".thumb");
    const activeTrack = this.shadowRoot.querySelector(".active-track");
    const tooltip = this.shadowRoot.querySelector(".tooltip");
    if (!root || !trackBox || !thumb) return;
    let cachedRect = null;
    const updateFromPointer = (e, isFinal = false) => {
      if (this.disabled) return;
      if (!cachedRect) cachedRect = trackBox.getBoundingClientRect();
      if (cachedRect.width <= 0) return;
      const clientX = e.clientX;
      const ratio = Math.min(1, Math.max(0, (clientX - cachedRect.left) / cachedRect.width));
      let rawVal = this.min + ratio * (this.max - this.min);
      if (this.step > 0) {
        rawVal = Math.round((rawVal - this.min) / this.step) * this.step + this.min;
      }
      const clamped = Math.min(this.max, Math.max(this.min, rawVal));
      this._currentValue = clamped;
      const pct = this._pct(clamped);
      if (activeTrack) activeTrack.style.width = `${pct}%`;
      if (thumb) thumb.style.left = `${pct}%`;
      if (tooltip) tooltip.textContent = Math.round(clamped);
      root.setAttribute("aria-valuenow", String(clamped));
      if (isFinal) {
        this.value = clamped;
      }
      this.dispatchEvent(new CustomEvent("input", { detail: { value: clamped }, bubbles: true, composed: true }));
    };
    root.addEventListener("pointerdown", (e) => {
      if (this.disabled || e.button !== 0) return;
      this._isDragging = true;
      cachedRect = trackBox.getBoundingClientRect();
      try {
        root.setPointerCapture(e.pointerId);
      } catch (_) {
      }
      root.classList.add("pressed");
      updateFromPointer(e, false);
    }, { signal });
    root.addEventListener("pointermove", (e) => {
      if (!this._isDragging || this.disabled) return;
      updateFromPointer(e, false);
    }, { signal });
    const stopDrag = (e) => {
      if (!this._isDragging) return;
      this._isDragging = false;
      cachedRect = null;
      root.classList.remove("pressed");
      this.value = this._currentValue;
      this.dispatchEvent(new CustomEvent("change", { detail: { value: this.value }, bubbles: true, composed: true }));
    };
    root.addEventListener("pointerup", stopDrag, { signal });
    root.addEventListener("pointercancel", stopDrag, { signal });
    root.addEventListener("keydown", (e) => {
      if (this.disabled) return;
      const stepVal = this.step > 0 ? this.step : (this.max - this.min) / 100;
      const bigStep = this.step > 0 ? this.step * 10 : (this.max - this.min) / 10;
      let handled = false;
      switch (e.key) {
        case "ArrowLeft":
        case "ArrowDown":
          this.value = this.value - stepVal;
          handled = true;
          break;
        case "ArrowRight":
        case "ArrowUp":
          this.value = this.value + stepVal;
          handled = true;
          break;
        case "PageDown":
          this.value = this.value - bigStep;
          handled = true;
          break;
        case "PageUp":
          this.value = this.value + bigStep;
          handled = true;
          break;
        case "Home":
          this.value = this.min;
          handled = true;
          break;
        case "End":
          this.value = this.max;
          handled = true;
          break;
      }
      if (handled) {
        e.preventDefault();
        this.dispatchEvent(new CustomEvent("input", { detail: { value: this.value }, bubbles: true, composed: true }));
        this.dispatchEvent(new CustomEvent("change", { detail: { value: this.value }, bubbles: true, composed: true }));
      }
    }, { signal });
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle7}</style>`}
      <div class="slider-root" role="slider" tabindex="0" aria-orientation="horizontal">
        <div class="track-box">
          <div class="active-track"></div>
          <div class="stops"></div>
        </div>
        <div class="thumb">
          <div class="tooltip">50</div>
        </div>
      </div>
    `;
  }
};
if (!customElements.get("md-slider")) {
  customElements.define("md-slider", MdSlider);
}

// src/components/md-switch.js
var defaultStyle8 = `
  :host {
    display: inline-flex;
    align-items: center;
    outline: none;
    vertical-align: middle;
  }

  .switch-root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    min-width: 52px;
    height: 48px;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  .switch-root:focus { outline: none; }
  .switch-root:focus-visible .track {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  /* 52x32dp Track */
  .track {
    position: relative;
    width: 52px;
    height: 32px;
    border-radius: 9999px;
    box-sizing: border-box;
    border: 2px solid var(--md-sys-color-outline, #79747E);
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }

  .track.checked {
    background-color: var(--md-sys-color-primary, #6750A4);
    border-color: var(--md-sys-color-primary, #6750A4);
  }

  /* Handle: 16x16dp unselected -> 24x24dp selected -> 28x28dp pressed */
  .handle-container {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform var(--md-sys-motion-duration-medium1, 300ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.56, 0.64, 1));
    pointer-events: none;
  }
  .track.checked .handle-container {
    transform: translateX(20px);
  }

  .handle {
    position: relative;
    width: 16px;
    height: 16px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-outline, #79747E);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
    transition:
      width var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      height var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    will-change: transform;
  }

  .track.checked .handle {
    width: 24px;
    height: 24px;
    background-color: var(--md-sys-color-on-primary, #FFFFFF);
  }

  .switch-root.pressed .handle {
    width: 28px;
    height: 28px;
  }

  /* Handle icon */
  .icon {
    font-family: 'Material Symbols Outlined';
    font-size: 14px;
    line-height: 1;
    color: var(--md-sys-color-on-primary-container, #21005D);
    opacity: 0;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
  }
  .track.checked .icon {
    opacity: 1;
  }

  /* 40x40 State layer overlay on handle */
  .state-layer {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: currentColor;
    color: var(--md-sys-color-on-surface, #1D1B20);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .track.checked .state-layer {
    color: var(--md-sys-color-primary, #6750A4);
  }
  .switch-root:hover:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .switch-root:focus-visible:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .switch-root.pressed:not(.disabled) .state-layer {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  /* Disabled */
  .switch-root.disabled {
    cursor: not-allowed;
    opacity: 0.38;
  }
  .switch-root.disabled .track {
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .switch-root.disabled .track.checked {
    background-color: var(--md-sys-color-on-surface, #1D1B20);
    border-color: transparent;
  }
  .switch-root.disabled .handle {
    background-color: var(--md-sys-color-surface, #FEF7FF);
  }
`;
var switchSheet = createComponentSheet(defaultStyle8);
var MdSwitch = class extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return ["checked", "disabled", "icon", "value", "name"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, switchSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }
  get form() {
    return this._internals?.form;
  }
  get type() {
    return "checkbox";
  }
  formResetCallback() {
    this.checked = this.hasAttribute("checked");
  }
  formStateRestoreCallback(state) {
    this.checked = state === "true" || state === true;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "icon") {
      this.render();
      this._setup();
    }
    this._sync();
  }
  get checked() {
    return this.hasAttribute("checked");
  }
  set checked(val) {
    if (val) this.setAttribute("checked", "");
    else this.removeAttribute("checked");
    this._sync();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
    this._sync();
  }
  get icon() {
    return this.getAttribute("icon") || "";
  }
  set icon(val) {
    this.setAttribute("icon", val);
  }
  get value() {
    return this.getAttribute("value") || "on";
  }
  set value(val) {
    this.setAttribute("value", val);
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(val) {
    this.setAttribute("name", val);
  }
  _sync() {
    const isChecked = this.checked;
    const isDisabled = this.disabled;
    const root = this.shadowRoot.querySelector(".switch-root");
    const track = this.shadowRoot.querySelector(".track");
    if (!root || !track) return;
    root.setAttribute("aria-checked", isChecked ? "true" : "false");
    root.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    root.tabIndex = isDisabled ? -1 : 0;
    if (isDisabled) root.classList.add("disabled");
    else root.classList.remove("disabled");
    if (isChecked) track.classList.add("checked");
    else track.classList.remove("checked");
    if (this._internals && this._internals.setFormValue) {
      this._internals.setFormValue(isChecked ? this.value : null);
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const root = this.shadowRoot.querySelector(".switch-root");
    if (!root) return;
    const press = () => {
      if (this.disabled) return;
      root.classList.add("pressed");
      pressScale(root, 0.96, "expressiveSpatialFast");
    };
    const release = () => {
      if (this.disabled) return;
      root.classList.remove("pressed");
      releaseScale(root);
    };
    const activate = () => {
      if (this.disabled) return;
      this.checked = !this.checked;
      this.dispatchEvent(new CustomEvent("change", {
        detail: { checked: this.checked, value: this.value },
        bubbles: true,
        composed: true
      }));
    };
    bindPress(root, {
      disabled: () => this.disabled,
      onPress: press,
      onRelease: release,
      onActivate: activate,
      signal
    });
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle8}</style>`}
      <div class="switch-root" role="switch" tabindex="0" aria-checked="false">
        <div class="track">
          <div class="handle-container">
            <div class="state-layer"></div>
            <div class="handle">
              <span class="icon" aria-hidden="true">${escapeHtml(this.icon || (this.checked ? "check" : ""))}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};
if (!customElements.get("md-switch")) {
  customElements.define("md-switch", MdSwitch);
}

// src/components/md-text-field.js
var defaultStyle9 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: inline-block;
    width: 100%;
    outline: none;
    vertical-align: top;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
  }

  .tf-root {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
  }

  .field-box {
    position: relative;
    display: flex;
    align-items: center;
    height: 56px;
    min-height: 56px;
    padding: 0 16px;
    box-sizing: border-box;
    cursor: text;
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      box-shadow var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease);
  }

  /* Outlined Variant */
  .field-box.outlined {
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    border: 1px solid var(--md-sys-color-outline, #79747E);
    background-color: transparent;
  }
  .field-box.outlined:hover:not(.disabled) {
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .field-box.outlined:focus-within {
    border-color: var(--md-sys-color-primary, #6750A4);
    border-width: 2px;
    padding: 0 15px;
  }

  /* Filled Variant */
  .field-box.filled {
    border-radius: var(--md-sys-shape-corner-extra-small, 4px) var(--md-sys-shape-corner-extra-small, 4px) 0 0;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    border: none;
    border-bottom: 1px solid var(--md-sys-color-on-surface-variant, #49454F);
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .field-box.filled:hover:not(.disabled) {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 4%, var(--md-sys-color-surface-container-highest, #E6E0E9));
    border-bottom-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .field-box.filled:focus-within {
    border-bottom: 2px solid var(--md-sys-color-primary, #6750A4);
  }

  /* Error States */
  .field-box.error {
    border-color: var(--md-sys-color-error, #B3261E) !important;
  }
  .field-box.error .label {
    color: var(--md-sys-color-error, #B3261E) !important;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    height: 100%;
    min-width: 0;
  }

  .field-box.filled .input-wrapper {
    justify-content: flex-end;
    padding-bottom: 2px;
  }

  /* Floating Label */
  .label {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    transform-origin: left top;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-size: var(--md-sys-typescale-body-large-size, 16px);
    line-height: var(--md-sys-typescale-body-large-line-height, 24px);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    pointer-events: none;
    white-space: nowrap;
    transition:
      transform var(--md-sys-motion-duration-short2, 150ms) cubic-bezier(0.2, 0, 0, 1),
      color var(--md-sys-motion-duration-short2, 150ms) ease,
      top var(--md-sys-motion-duration-short2, 150ms) cubic-bezier(0.2, 0, 0, 1);
  }

  /* Floating label for Outlined */
  .field-box.outlined.floating .label {
    top: -9px;
    transform: scale(0.75);
    color: var(--md-sys-color-primary, #6750A4);
    background-color: var(--md-sys-color-surface-container-high, #2B2930);
    padding: 0 4px;
    margin-left: -4px;
    border-radius: 2px;
    line-height: var(--md-sys-typescale-body-small-line-height, 16px);
    z-index: 1;
  }

  /* Floating label for Filled */
  .field-box.filled.floating .label {
    top: 4px;
    transform: scale(0.75);
    color: var(--md-sys-color-primary, #6750A4);
    line-height: var(--md-sys-typescale-body-small-line-height, 16px);
  }

  .input-row {
    display: flex;
    align-items: center;
    width: 100%;
    height: 24px;
  }

  .field-box.filled.floating .input-row {
    margin-top: 14px;
  }

  input {
    width: 100%;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font-family: inherit;
    font-size: var(--md-sys-typescale-body-large-size, 16px);
    line-height: var(--md-sys-typescale-body-large-line-height, 24px);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    padding: 0;
    margin: 0;
    outline: none;
    box-sizing: border-box;
  }

  .affix {
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-size: var(--md-sys-typescale-body-large-size, 16px);
    line-height: var(--md-sys-typescale-body-large-line-height, 24px);
    user-select: none;
    white-space: nowrap;
  }
  .affix.prefix { margin-right: 4px; }
  .affix.suffix { margin-left: 4px; }

  .ico {
    font-family: 'Material Symbols Outlined';
    font-size: 24px;
    line-height: 1;
    width: 24px;
    height: 24px;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    flex-shrink: 0;
    user-select: none;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  .ico.leading { margin-right: 12px; }
  .ico.trailing { margin-left: 12px; }
  .field-box:focus-within .ico.leading { color: var(--md-sys-color-primary, #6750A4); }
  .field-box.error .ico { color: var(--md-sys-color-error, #B3261E); }

  .helper-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 16px 0 16px;
    font-size: var(--md-sys-typescale-body-small-size, 12px);
    line-height: var(--md-sys-typescale-body-small-line-height, 16px);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    min-height: 20px;
  }
  .tf-root.error .helper-text { color: var(--md-sys-color-error, #B3261E); }
  .tf-root.disabled { cursor: not-allowed; opacity: 0.38; }
  .tf-root.disabled .field-box { pointer-events: none; }
`;
var textFieldSheet = createComponentSheet(defaultStyle9);
var MdTextField = class extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return [
      "label",
      "value",
      "placeholder",
      "variant",
      "type",
      "disabled",
      "error",
      "error-text",
      "supporting-text",
      "icon",
      "leading-icon",
      "trailing-icon",
      "prefix-text",
      "suffix-text",
      "maxlength",
      "name",
      "required",
      "single-line",
      "min-lines",
      "max-lines",
      "read-only",
      "readonly",
      "is-error",
      "label-position"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, textFieldSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._value = "";
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this._value = this.getAttribute("value") || "";
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "value") {
      this._value = newVal || "";
    } else if (name === "is-error") {
      if (this.hasAttribute("is-error") && !this.hasAttribute("error")) {
        this.setAttribute("error", "");
      } else if (!this.hasAttribute("is-error") && this.hasAttribute("error")) {
        this.removeAttribute("error");
      }
    }
    this._sync();
  }
  get form() {
    return this._internals?.form;
  }
  get name() {
    return this.getAttribute("name");
  }
  get type() {
    return sanitizeAttribute(this.getAttribute("type") || "text");
  }
  get label() {
    return this.getAttribute("label") || "";
  }
  get placeholder() {
    return this.getAttribute("placeholder") || "";
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "outlined");
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get error() {
    return this.hasAttribute("error") || this.hasAttribute("is-error");
  }
  set error(val) {
    if (val) {
      this.setAttribute("error", "");
    } else {
      this.removeAttribute("error");
      this.removeAttribute("is-error");
    }
  }
  get isError() {
    return this.error;
  }
  set isError(val) {
    this.error = val;
  }
  get readOnly() {
    return this.hasAttribute("read-only") || this.hasAttribute("readonly");
  }
  set readOnly(val) {
    if (val) this.setAttribute("read-only", "");
    else {
      this.removeAttribute("read-only");
      this.removeAttribute("readonly");
    }
  }
  get singleLine() {
    return this.hasAttribute("single-line");
  }
  set singleLine(val) {
    if (val) this.setAttribute("single-line", "");
    else this.removeAttribute("single-line");
  }
  get minLines() {
    const m = parseInt(this.getAttribute("min-lines"), 10);
    return isNaN(m) ? 1 : m;
  }
  set minLines(val) {
    if (val === null || val === void 0) this.removeAttribute("min-lines");
    else this.setAttribute("min-lines", String(val));
  }
  get maxLines() {
    const m = parseInt(this.getAttribute("max-lines"), 10);
    return isNaN(m) ? null : m;
  }
  set maxLines(val) {
    if (val === null || val === void 0) this.removeAttribute("max-lines");
    else this.setAttribute("max-lines", String(val));
  }
  get labelPosition() {
    return this.getAttribute("label-position") || "floating";
  }
  set labelPosition(val) {
    if (val === null || val === void 0) this.removeAttribute("label-position");
    else this.setAttribute("label-position", val);
  }
  get errorText() {
    return this.getAttribute("error-text") || "";
  }
  get supportingText() {
    return this.getAttribute("supporting-text") || "";
  }
  get icon() {
    return this.getAttribute("icon") || this.getAttribute("leading-icon") || "";
  }
  get trailingIcon() {
    return this.getAttribute("trailing-icon") || "";
  }
  get prefixText() {
    return this.getAttribute("prefix-text") || "";
  }
  get suffixText() {
    return this.getAttribute("suffix-text") || "";
  }
  get maxlength() {
    const m = parseInt(this.getAttribute("maxlength"), 10);
    return isNaN(m) ? null : m;
  }
  get value() {
    return this._value;
  }
  set value(val) {
    this._value = val != null ? String(val) : "";
    const input = this.shadowRoot.querySelector("input");
    if (input && input.value !== this._value) input.value = this._value;
    this._internals?.setFormValue(this._value);
    this._syncFloating();
  }
  formResetCallback() {
    this.value = this.getAttribute("value") || "";
  }
  formStateRestoreCallback(state) {
    this.value = state || "";
  }
  _syncFloating() {
    const fieldBox = this.shadowRoot.querySelector(".field-box");
    const input = this.shadowRoot.querySelector("input");
    if (!fieldBox || !input) return;
    const isFocused = this.shadowRoot.activeElement === input;
    const hasVal = Boolean(input.value && input.value.length > 0) || Boolean(this.placeholder);
    if (isFocused || hasVal) {
      fieldBox.classList.add("floating");
    } else {
      fieldBox.classList.remove("floating");
    }
  }
  _sync() {
    const root = this.shadowRoot.querySelector(".tf-root");
    const fieldBox = this.shadowRoot.querySelector(".field-box");
    const input = this.shadowRoot.querySelector("input");
    const helper = this.shadowRoot.querySelector(".helper-text");
    const counter = this.shadowRoot.querySelector(".counter");
    const labelEl = this.shadowRoot.querySelector(".label");
    const leadingIco = this.shadowRoot.querySelector(".ico.leading");
    const trailingIco = this.shadowRoot.querySelector(".ico.trailing");
    const prefixEl = this.shadowRoot.querySelector(".affix.prefix");
    const suffixEl = this.shadowRoot.querySelector(".affix.suffix");
    if (!root || !fieldBox || !input) return;
    root.className = `tf-root ${this.variant}${this.disabled ? " disabled" : ""}${this.error ? " error" : ""}`;
    fieldBox.className = `field-box ${this.variant}${this.error ? " error" : ""}${this.disabled ? " disabled" : ""}`;
    input.disabled = this.disabled;
    input.type = this.type;
    input.placeholder = this.placeholder;
    input.setAttribute("aria-label", this.label || this.getAttribute("aria-label") || "Text field");
    if (input.value !== this._value) input.value = this._value;
    if (labelEl) {
      labelEl.textContent = this.label;
      labelEl.style.display = this.label ? "block" : "none";
    }
    if (leadingIco) {
      leadingIco.textContent = this.icon;
      leadingIco.style.display = this.icon ? "inline-flex" : "none";
    }
    if (trailingIco) {
      trailingIco.textContent = this.trailingIcon;
      trailingIco.style.display = this.trailingIcon ? "inline-flex" : "none";
    }
    if (prefixEl) {
      prefixEl.textContent = this.prefixText;
      prefixEl.style.display = this.prefixText ? "inline" : "none";
    }
    if (suffixEl) {
      suffixEl.textContent = this.suffixText;
      suffixEl.style.display = this.suffixText ? "inline" : "none";
    }
    if (helper) {
      const txt = this.error && this.errorText ? this.errorText : this.supportingText;
      helper.textContent = txt;
      helper.style.display = txt ? "inline" : "none";
    }
    if (counter) {
      if (this.maxlength) {
        counter.textContent = `${this._value.length}/${this.maxlength}`;
        counter.style.display = "inline";
      } else {
        counter.style.display = "none";
      }
    }
    this._internals?.setFormValue(this._value);
    this._syncFloating();
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const input = this.shadowRoot.querySelector("input");
    const fieldBox = this.shadowRoot.querySelector(".field-box");
    if (!input) return;
    if (fieldBox) {
      fieldBox.addEventListener("click", () => input.focus(), { signal });
    }
    input.addEventListener("focus", () => {
      this._syncFloating();
      this.dispatchEvent(new CustomEvent("focus", { bubbles: true, composed: true }));
    }, { signal });
    input.addEventListener("blur", () => {
      this._syncFloating();
      this.dispatchEvent(new CustomEvent("blur", { bubbles: true, composed: true }));
    }, { signal });
    input.addEventListener("input", (e) => {
      this._value = e.target.value;
      const counter = this.shadowRoot.querySelector(".counter");
      if (counter && this.maxlength) {
        counter.textContent = `${this._value.length}/${this.maxlength}`;
      }
      this._internals?.setFormValue(this._value);
      this.dispatchEvent(new CustomEvent("input", {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }, { signal });
    input.addEventListener("change", (e) => {
      this._value = e.target.value;
      this.dispatchEvent(new CustomEvent("change", {
        detail: { value: this._value },
        bubbles: true,
        composed: true
      }));
    }, { signal });
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle9}</style>`}
      <div class="tf-root ${escapeHtml(this.variant)}">
        <div class="field-box ${escapeHtml(this.variant)}">
          <span class="ico leading" aria-hidden="true" style="display: none;"></span>

          <div class="input-wrapper">
            <label class="label" style="display: none;"></label>
            <div class="input-row">
              <span class="affix prefix" style="display: none;"></span>
              <input type="${escapeHtml(this.type)}" value="${escapeHtml(this._value)}" placeholder="${escapeHtml(this.placeholder)}" aria-label="${escapeHtml(this.label || this.getAttribute("aria-label") || "Text field")}">
              <span class="affix suffix" style="display: none;"></span>
            </div>
          </div>

          <span class="ico trailing" aria-hidden="true" style="display: none;"></span>
        </div>

        <div class="helper-row">
          <span class="helper-text" style="display: none;"></span>
          <span class="counter" style="display: none;"></span>
        </div>
      </div>
    `;
  }
};
if (!customElements.get("md-text-field")) {
  customElements.define("md-text-field", MdTextField);
}

// src/components/md-checkbox.js
var defaultStyle10 = `
  :host {
    display: inline-flex;
    align-items: center;
    outline: none;
    vertical-align: middle;
  }

  .chk-root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    box-sizing: border-box;
    border-radius: 9999px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    will-change: transform;
  }
  .chk-root:focus { outline: none; }
  .chk-root:focus-visible .box {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 3px;
  }

  /* 40x40 State layer */
  .chk-root::before {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: currentColor;
    color: var(--md-sys-color-primary, #6750A4);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .chk-root:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .chk-root:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .chk-root.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  /* 18x18 Box container */
  .box {
    position: relative;
    width: 18px;
    height: 18px;
    box-sizing: border-box;
    border-radius: 2px;
    border: 2px solid var(--md-sys-color-on-surface-variant, #49454F);
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }

  .box.checked,
  .box.indeterminate {
    background-color: var(--md-sys-color-primary, #6750A4);
    border-color: var(--md-sys-color-primary, #6750A4);
  }

  .box.error {
    border-color: var(--md-sys-color-error, #B3261E);
  }
  .box.error.checked,
  .box.error.indeterminate {
    background-color: var(--md-sys-color-error, #B3261E);
    border-color: var(--md-sys-color-error, #B3261E);
  }

  .chk-root.disabled {
    cursor: not-allowed;
  }
  .chk-root.disabled .box {
    opacity: 0.38;
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .chk-root.disabled .box.checked,
  .chk-root.disabled .box.indeterminate {
    background-color: var(--md-sys-color-on-surface, #1D1B20);
    border-color: transparent;
  }

  /* SVG Marks (Checkmark & Indeterminate Dash) */
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .mark-check,
  .mark-dash {
    fill: none;
    stroke: var(--md-sys-color-on-primary, #FFFFFF);
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke-dashoffset var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
                opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }

  .mark-check {
    stroke-dasharray: 20;
    stroke-dashoffset: 20;
    opacity: 0;
  }
  .box.checked .mark-check {
    stroke-dashoffset: 0;
    opacity: 1;
  }

  .mark-dash {
    stroke-dasharray: 10;
    stroke-dashoffset: 10;
    opacity: 0;
  }
  .box.indeterminate .mark-dash {
    stroke-dashoffset: 0;
    opacity: 1;
  }

  .box.error .mark-check,
  .box.error .mark-dash {
    stroke: var(--md-sys-color-on-error, #FFFFFF);
  }
`;
var checkboxSheet = createComponentSheet(defaultStyle10);
var MdCheckbox = class extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return ["checked", "disabled", "indeterminate", "error", "name", "value", "checkmark-stroke", "outline-stroke"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, checkboxSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }
  get form() {
    return this._internals?.form;
  }
  get type() {
    return "checkbox";
  }
  formResetCallback() {
    this.checked = this.hasAttribute("checked");
  }
  formStateRestoreCallback(state) {
    this.checked = state === "true" || state === true;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }
  get checked() {
    return this.hasAttribute("checked");
  }
  set checked(val) {
    if (val) this.setAttribute("checked", "");
    else this.removeAttribute("checked");
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get indeterminate() {
    return this.hasAttribute("indeterminate");
  }
  set indeterminate(val) {
    if (val) this.setAttribute("indeterminate", "");
    else this.removeAttribute("indeterminate");
  }
  get error() {
    return this.hasAttribute("error");
  }
  set error(val) {
    if (val) this.setAttribute("error", "");
    else this.removeAttribute("error");
  }
  get checkmarkStroke() {
    const s = parseFloat(this.getAttribute("checkmark-stroke"));
    return isNaN(s) || s <= 0 ? 2.2 : s;
  }
  set checkmarkStroke(val) {
    if (val === null || val === void 0) this.removeAttribute("checkmark-stroke");
    else this.setAttribute("checkmark-stroke", String(val));
  }
  get outlineStroke() {
    const s = parseFloat(this.getAttribute("outline-stroke"));
    return isNaN(s) || s <= 0 ? 2 : s;
  }
  set outlineStroke(val) {
    if (val === null || val === void 0) this.removeAttribute("outline-stroke");
    else this.setAttribute("outline-stroke", String(val));
  }
  get value() {
    return this.getAttribute("value") || "on";
  }
  set value(val) {
    this.setAttribute("value", val);
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(val) {
    this.setAttribute("name", val);
  }
  _sync() {
    const root = this.shadowRoot.querySelector(".chk-root");
    const box = this.shadowRoot.querySelector(".box");
    if (!root || !box) return;
    this._internals?.setFormValue(this.checked ? this.value : null);
    root.className = `chk-root${this.disabled ? " disabled" : ""}`;
    box.className = `box${this.checked ? " checked" : ""}${this.indeterminate ? " indeterminate" : ""}${this.error ? " error" : ""}`;
    box.style.borderWidth = `${this.outlineStroke}px`;
    const marks = this.shadowRoot.querySelectorAll(".mark-check, .mark-dash");
    marks.forEach((m) => {
      m.style.strokeWidth = `${this.checkmarkStroke}px`;
    });
    root.setAttribute("tabindex", this.disabled ? "-1" : "0");
    root.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    if (this.indeterminate) {
      root.setAttribute("aria-checked", "mixed");
    } else {
      root.setAttribute("aria-checked", this.checked ? "true" : "false");
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const root = this.shadowRoot.querySelector(".chk-root");
    if (!root) return;
    const press = () => {
      pressScale(root, 0.92, "expressiveSpatialFast");
    };
    const release = () => {
      releaseScale(root, 0.92, "expressiveSpatialMedium");
    };
    const activate = () => {
      if (this.disabled) return;
      if (this.indeterminate) {
        this.indeterminate = false;
        this.checked = true;
      } else {
        this.checked = !this.checked;
      }
      this.dispatchEvent(new CustomEvent("change", {
        detail: { checked: this.checked, indeterminate: this.indeterminate, value: this.value },
        bubbles: true,
        composed: true
      }));
    };
    bindPress(root, {
      disabled: () => this.disabled,
      onPress: press,
      onRelease: release,
      onActivate: activate,
      signal
    });
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle10}</style>`}
      <div class="chk-root" role="checkbox" tabindex="0" aria-checked="false">
        <div class="box">
          <svg viewBox="0 0 18 18" aria-hidden="true">
            <path class="mark-check" d="M 4 9.5 L 7.5 13 L 14 5"></path>
            <path class="mark-dash" d="M 4 9 L 14 9"></path>
          </svg>
        </div>
      </div>
    `;
  }
};
if (!customElements.get("md-checkbox")) {
  customElements.define("md-checkbox", MdCheckbox);
}

// src/components/md-radio-button.js
var defaultStyle11 = `
  :host {
    display: inline-flex;
    align-items: center;
    outline: none;
    vertical-align: middle;
  }

  .radio-root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    box-sizing: border-box;
    border-radius: 9999px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    will-change: transform;
  }
  .radio-root:focus { outline: none; }
  .radio-root:focus-visible .ring {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 3px;
  }

  /* 40x40 State layer */
  .radio-root::before {
    content: '';
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: currentColor;
    color: var(--md-sys-color-primary, #6750A4);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .radio-root:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .radio-root:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .radio-root.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  /* 20x20 Outer Ring */
  .ring {
    position: relative;
    width: 20px;
    height: 20px;
    box-sizing: border-box;
    border-radius: 9999px;
    border: 2px solid var(--md-sys-color-on-surface-variant, #49454F);
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }

  .ring.checked {
    border-color: var(--md-sys-color-primary, #6750A4);
  }

  /* 10x10 Inner Dot */
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-primary, #6750A4);
    transform: scale(0);
    transition: transform var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.34, 1.56, 0.64, 1));
  }
  .ring.checked .dot {
    transform: scale(1);
  }

  .radio-root.disabled {
    cursor: not-allowed;
  }
  .radio-root.disabled .ring {
    opacity: 0.38;
    border-color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .radio-root.disabled .ring .dot {
    background-color: var(--md-sys-color-on-surface, #1D1B20);
  }
`;
var radioSheet = createComponentSheet(defaultStyle11);
var MdRadioButton = class extends HTMLElement {
  static formAssociated = true;
  static get observedAttributes() {
    return ["checked", "selected", "disabled", "name", "value"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, radioSheet);
    this._internals = this.attachInternals ? this.attachInternals() : null;
    this._rendered = false;
    this._abortController = null;
  }
  get form() {
    return this._internals?.form;
  }
  get type() {
    return "radio";
  }
  formResetCallback() {
    this.checked = this.hasAttribute("checked") || this.hasAttribute("selected");
  }
  formStateRestoreCallback(state) {
    this.checked = state === "true" || state === true;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "selected") {
      if (this.hasAttribute("selected") && !this.hasAttribute("checked")) {
        this.setAttribute("checked", "");
      } else if (!this.hasAttribute("selected") && this.hasAttribute("checked")) {
        this.removeAttribute("checked");
      }
    }
    this._sync();
  }
  get checked() {
    return this.hasAttribute("checked") || this.hasAttribute("selected");
  }
  set checked(val) {
    if (val) {
      this.setAttribute("checked", "");
      this.setAttribute("selected", "");
    } else {
      this.removeAttribute("checked");
      this.removeAttribute("selected");
    }
    this._sync();
  }
  get selected() {
    return this.checked;
  }
  set selected(val) {
    this.checked = val;
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
    this._sync();
  }
  get name() {
    return this.getAttribute("name") || "";
  }
  set name(val) {
    this.setAttribute("name", val);
  }
  get value() {
    return this.getAttribute("value") || "on";
  }
  set value(val) {
    this.setAttribute("value", val);
  }
  _sync() {
    const isChecked = this.checked;
    const isDisabled = this.disabled;
    const root = this.shadowRoot.querySelector(".radio-root");
    const ring = this.shadowRoot.querySelector(".ring");
    if (!root || !ring) return;
    root.setAttribute("aria-checked", isChecked ? "true" : "false");
    root.setAttribute("aria-disabled", isDisabled ? "true" : "false");
    root.tabIndex = isDisabled ? -1 : 0;
    if (isDisabled) root.classList.add("disabled");
    else root.classList.remove("disabled");
    if (isChecked) ring.classList.add("checked");
    else ring.classList.remove("checked");
    if (this._internals && this._internals.setFormValue) {
      this._internals.setFormValue(isChecked ? this.value : null);
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const root = this.shadowRoot.querySelector(".radio-root");
    if (!root) return;
    const press = () => {
      if (this.disabled) return;
      pressScale(root, 0.92, "expressiveSpatialFast");
    };
    const release = () => {
      if (this.disabled) return;
      releaseScale(root);
    };
    const activate = () => {
      if (this.disabled || this.checked) return;
      this._uncheckOthersInGroup();
      this.checked = true;
      this.dispatchEvent(new CustomEvent("change", {
        detail: { checked: true, value: this.value },
        bubbles: true,
        composed: true
      }));
    };
    bindPress(root, {
      disabled: () => this.disabled,
      onPress: press,
      onRelease: release,
      onActivate: activate,
      signal
    });
  }
  _uncheckOthersInGroup() {
    const name = this.name;
    if (!name) return;
    const root = this.getRootNode();
    if (!root) return;
    const radios = root.querySelectorAll ? root.querySelectorAll(`md-radio-button[name="${CSS.escape(name)}"]`) : [];
    radios.forEach((r) => {
      if (r !== this) {
        r.checked = false;
      }
    });
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle11}</style>`}
      <div class="radio-root" role="radio" tabindex="0" aria-checked="false">
        <div class="ring">
          <div class="dot"></div>
        </div>
      </div>
    `;
  }
};
if (!customElements.get("md-radio-button")) {
  customElements.define("md-radio-button", MdRadioButton);
}

// src/components/md-progress-indicator.js
var defaultStyle12 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: inline-block;
    vertical-align: middle;
    outline: none;
  }

  :host([type="linear"]) {
    display: block;
    width: 100%;
  }

  .progress-root {
    position: relative;
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }

  :host([type="linear"]) .progress-root {
    display: block;
    width: 100%;
  }

  canvas {
    display: block;
    width: 48px;
    height: 48px;
    pointer-events: none;
  }

  :host([type="linear"]) canvas {
    width: 100%;
  }
`;
var progressIndicatorSheet = createComponentSheet(defaultStyle12);
var MdProgressIndicator = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "type",
      "variant",
      "value",
      "progress",
      "indeterminate",
      "max",
      "amplitude",
      "wavelength",
      "stroke-width",
      "gap-size",
      "track-color",
      "stop-size"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, progressIndicatorSheet);
    this._rendered = false;
    this._rafId = null;
    this._startTime = 0;
    this._activeColor = "#6750A4";
    this._trackColor = "#E8DEF8";
    this._colorDirty = true;
    this._observer = null;
    this._resizeObserver = null;
    this._isVisible = true;
    this._onThemeChange = () => {
      this._colorDirty = true;
    };
    this._cachedWidth = 240;
    this._animatedAmplitude = null;
    this._lastFrameTime = 0;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._colorDirty = true;
    if (typeof window !== "undefined") {
      window.addEventListener("theme-color-change", this._onThemeChange);
    }
    this._setupIntersectionObserver();
    this._setupResizeObserver();
    this._startAnimation();
  }
  disconnectedCallback() {
    this._stopAnimation();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("theme-color-change", this._onThemeChange);
    }
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "type" || name === "variant") {
      this.render();
    }
    if (name === "track-color") {
      this._colorDirty = true;
    }
    if (name === "stroke-width" || name === "amplitude" || name === "type" || name === "variant") {
      this._syncDimensions();
    }
  }
  _setupIntersectionObserver() {
    if (typeof IntersectionObserver === "undefined") return;
    this._observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      this._isVisible = entry ? entry.isIntersecting : true;
      if (this._isVisible) {
        if (!this._rafId) this._startAnimation();
      } else {
        this._stopAnimation();
      }
    }, { threshold: 0 });
    this._observer.observe(this);
  }
  _setupResizeObserver() {
    if (typeof ResizeObserver === "undefined") return;
    this._resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const measured = entry.contentRect.width;
        if (measured > 0 && Math.abs(measured - this._cachedWidth) > 1) {
          this._cachedWidth = measured;
          this._syncDimensions();
        }
      }
    });
    this._resizeObserver.observe(this);
  }
  _getWidth() {
    if (this.type === "circular") return 48;
    const measured = this.clientWidth || this.getBoundingClientRect()?.width || 0;
    if (measured > 0) {
      this._cachedWidth = measured;
      return measured;
    }
    return this._cachedWidth || 240;
  }
  _resolveColors() {
    if (this.hasAttribute("track-color")) {
      this._trackColor = this.getAttribute("track-color");
    } else if (this._colorDirty || !this._trackColor) {
      const computed2 = getComputedStyle(this);
      this._trackColor = computed2.getPropertyValue("--md-sys-color-secondary-container").trim() || computed2.getPropertyValue("--md-sys-color-surface-container-highest").trim() || "#E8DEF8";
    }
    if (!this._colorDirty && this._activeColor) return;
    const computed = getComputedStyle(this);
    this._activeColor = computed.getPropertyValue("--md-sys-color-primary").trim() || "#6750A4";
    this._colorDirty = false;
  }
  get strokeWidth() {
    const sw = parseFloat(this.getAttribute("stroke-width"));
    return isNaN(sw) || sw <= 0 ? 4 : sw;
  }
  set strokeWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("stroke-width");
    else this.setAttribute("stroke-width", String(v));
  }
  get gapSize() {
    const gs = parseFloat(this.getAttribute("gap-size"));
    return isNaN(gs) || gs < 0 ? 4 : gs;
  }
  set gapSize(v) {
    if (v === null || v === void 0) this.removeAttribute("gap-size");
    else this.setAttribute("gap-size", String(v));
  }
  get trackColor() {
    return this.getAttribute("track-color") || this._trackColor || "#E8DEF8";
  }
  set trackColor(v) {
    if (v === null || v === void 0) this.removeAttribute("track-color");
    else this.setAttribute("track-color", String(v));
  }
  get stopSize() {
    const ss = parseFloat(this.getAttribute("stop-size"));
    return isNaN(ss) || ss < 0 ? 4 : ss;
  }
  set stopSize(v) {
    if (v === null || v === void 0) this.removeAttribute("stop-size");
    else this.setAttribute("stop-size", String(v));
  }
  get amplitude() {
    const amp = parseFloat(this.getAttribute("amplitude"));
    return isNaN(amp) ? null : amp;
  }
  set amplitude(v) {
    if (v === null || v === void 0) this.removeAttribute("amplitude");
    else this.setAttribute("amplitude", String(v));
  }
  get wavelength() {
    const wl = parseFloat(this.getAttribute("wavelength"));
    return isNaN(wl) ? null : wl;
  }
  set wavelength(v) {
    if (v === null || v === void 0) this.removeAttribute("wavelength");
    else this.setAttribute("wavelength", String(v));
  }
  get type() {
    return this.getAttribute("type") || "linear";
  }
  set type(v) {
    this.setAttribute("type", v);
  }
  get variant() {
    return this.getAttribute("variant") || "standard";
  }
  set variant(v) {
    this.setAttribute("variant", v);
  }
  get max() {
    const m = parseFloat(this.getAttribute("max"));
    return isNaN(m) || m <= 0 ? 100 : m;
  }
  set max(v) {
    this.setAttribute("max", String(v));
  }
  get value() {
    const v = parseFloat(this.getAttribute("value") ?? this.getAttribute("progress"));
    if (isNaN(v)) return null;
    return Math.min(this.max, Math.max(0, v));
  }
  set value(v) {
    if (v === null || v === void 0) {
      this.removeAttribute("value");
      this.removeAttribute("progress");
    } else {
      this.setAttribute("value", String(v));
    }
  }
  get indeterminate() {
    return this.hasAttribute("indeterminate") || this.value === null;
  }
  set indeterminate(v) {
    if (v) this.setAttribute("indeterminate", "");
    else this.removeAttribute("indeterminate");
  }
  get fraction() {
    if (this.indeterminate) return 0;
    return Math.max(0, Math.min(1, this.value / this.max));
  }
  _startAnimation() {
    this._stopAnimation();
    this._startTime = performance.now();
    const canvas = this.shadowRoot.querySelector("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const loop = (now) => {
      this._draw(ctx, now);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }
  _stopAnimation() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
  _syncDimensions() {
    const canvas = this.shadowRoot.querySelector("canvas");
    if (!canvas) return;
    const isLinear = this.type === "linear";
    const isWavy = this.variant === "wavy";
    const strokeWidth = this.strokeWidth;
    const amplitudeMax = this.amplitude !== null ? this.amplitude : 3;
    const w = this._getWidth();
    const h = isLinear ? isWavy ? Math.max(10, Math.round(amplitudeMax * 2 + strokeWidth + 2)) : Math.max(4, Math.round(strokeWidth)) : 48;
    const dpr = window.devicePixelRatio || 1;
    const requiredW = Math.round(w * dpr);
    const requiredH = Math.round(h * dpr);
    if (canvas.width !== requiredW || canvas.height !== requiredH) {
      canvas.width = requiredW;
      canvas.height = requiredH;
      canvas.style.width = isLinear ? "100%" : `${w}px`;
      canvas.style.height = `${h}px`;
    }
    const root = this.shadowRoot.querySelector(".progress-root");
    if (root) {
      root.style.width = isLinear ? "100%" : `${w}px`;
      root.style.height = `${h}px`;
      if (this.indeterminate) {
        root.setAttribute("aria-busy", "true");
        root.removeAttribute("aria-valuenow");
      } else {
        root.setAttribute("aria-busy", "false");
        root.setAttribute("aria-valuenow", String(Math.round(this.fraction * 100)));
        root.setAttribute("aria-valuemin", "0");
        root.setAttribute("aria-valuemax", "100");
      }
    }
  }
  _draw(ctx, now) {
    const isLinear = this.type === "linear";
    const isWavy = this.variant === "wavy";
    const isIndet = this.indeterminate;
    const p = this.fraction;
    this._resolveColors();
    const activeColor = this._activeColor;
    const trackColor = this._trackColor;
    const strokeWidth = this.strokeWidth;
    const gapSize = this.gapSize;
    const stopSize = this.stopSize;
    const amplitudeMax = this.amplitude !== null ? this.amplitude : 3;
    const dpr = window.devicePixelRatio || 1;
    const w = this._getWidth();
    const h = isLinear ? isWavy ? Math.max(10, Math.round(amplitudeMax * 2 + strokeWidth + 2)) : Math.max(4, Math.round(strokeWidth)) : 48;
    const centerY = isLinear ? h / 2 : 24;
    const requiredW = Math.round(w * dpr);
    const requiredH = Math.round(h * dpr);
    const canvas = ctx.canvas;
    if (canvas.width !== requiredW || canvas.height !== requiredH) {
      canvas.width = requiredW;
      canvas.height = requiredH;
      canvas.style.width = isLinear ? "100%" : `${w}px`;
      canvas.style.height = `${h}px`;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const elapsed = (now - this._startTime) / 1e3;
    const dt = this._lastFrameTime > 0 ? Math.min((now - this._lastFrameTime) / 1e3, 0.05) : 0.016;
    this._lastFrameTime = now;
    if (isLinear) {
      if (isWavy) {
        const wavelength = this.wavelength !== null ? this.wavelength : isIndet ? 20 : 40;
        const waveSpeed = wavelength;
        const waveOffset = elapsed * waveSpeed % wavelength;
        const adjustedGapSize = gapSize + strokeWidth;
        let targetAmp = amplitudeMax;
        if (!isIndet) {
          targetAmp = p <= 0.1 || p >= 0.95 ? 0 : amplitudeMax;
        }
        if (this._animatedAmplitude === null) {
          this._animatedAmplitude = targetAmp;
        } else {
          const smoothSpeed = targetAmp > this._animatedAmplitude ? 7 : 9;
          this._animatedAmplitude += (targetAmp - this._animatedAmplitude) * (1 - Math.exp(-smoothSpeed * dt));
        }
        const currentAmp = this._animatedAmplitude;
        const waveY = (x) => centerY + currentAmp * Math.sin((x - waveOffset) * 2 * Math.PI / wavelength);
        if (isIndet) {
          const tCycle = elapsed * 0.7 % 2;
          const head1 = Math.min(w, Math.max(0, tCycle / 1.2 * w));
          const tail1 = Math.min(w, Math.max(0, (tCycle - 0.4) / 1.2 * w));
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          for (let x = 0; x <= w; x += 1) {
            const y = waveY(x);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          if (head1 > tail1) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(tail1, waveY(tail1));
            for (let x = tail1 + 1; x < head1; x += 1) {
              ctx.lineTo(x, waveY(x));
            }
            ctx.lineTo(head1, waveY(head1));
            ctx.stroke();
          }
        } else {
          const activeWidth = p * w;
          const trackStart = Math.min(w, activeWidth + adjustedGapSize);
          const stopX = w - stopSize / 2;
          const trackEnd = Math.max(trackStart, w - stopSize - gapSize);
          if (trackStart < trackEnd) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(trackStart, centerY);
            ctx.lineTo(trackEnd, centerY);
            ctx.stroke();
          }
          if (activeWidth > 0) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(0, waveY(0));
            const stepPx = 1;
            for (let x = stepPx; x < activeWidth; x += stepPx) {
              ctx.lineTo(x, waveY(x));
            }
            ctx.lineTo(activeWidth, waveY(activeWidth));
            ctx.stroke();
          }
          if (p < 0.99) {
            ctx.beginPath();
            ctx.fillStyle = activeColor;
            ctx.arc(stopX, centerY, stopSize / 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      } else {
        const centerY2 = 2;
        const adjustedGapSize = gapSize + strokeWidth;
        if (isIndet) {
          const minX = strokeWidth / 2;
          const maxX = w - strokeWidth / 2;
          const range = Math.max(1, maxX - minX);
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          ctx.moveTo(minX, centerY2);
          ctx.lineTo(maxX, centerY2);
          ctx.stroke();
          const tCycle = elapsed * 0.7 % 1.8;
          const head = minX + Math.min(range, Math.max(0, tCycle / 1.1 * range));
          const tail = minX + Math.min(range, Math.max(0, (tCycle - 0.45) / 1.1 * range));
          if (head > tail) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(tail, centerY2);
            ctx.lineTo(head, centerY2);
            ctx.stroke();
          }
        } else {
          const minX = strokeWidth / 2;
          const maxX = w - strokeWidth / 2;
          const activeW = minX + p * (maxX - minX);
          const trackStart = Math.min(maxX, activeW + adjustedGapSize);
          if (trackStart < maxX) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(trackStart, centerY2);
            ctx.lineTo(maxX, centerY2);
            ctx.stroke();
          }
          if (activeW > minX) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(minX, centerY2);
            ctx.lineTo(activeW, centerY2);
            ctx.stroke();
          }
          if (p < 0.99) {
            ctx.beginPath();
            ctx.fillStyle = activeColor;
            ctx.arc(w - stopSize / 2, centerY2, stopSize / 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    } else {
      const center = 24;
      const radius = Math.max(4, center - strokeWidth - 2);
      if (isWavy) {
        const amplitudeMax2 = this.amplitude !== null ? this.amplitude : 3;
        const numWaves = 8;
        let targetAmp = amplitudeMax2;
        if (!isIndet) {
          targetAmp = p <= 0.1 || p >= 0.95 ? 0 : amplitudeMax2;
        }
        if (this._animatedAmplitude === null) {
          this._animatedAmplitude = targetAmp;
        } else {
          const smoothSpeed = targetAmp > this._animatedAmplitude ? 7 : 9;
          this._animatedAmplitude += (targetAmp - this._animatedAmplitude) * (1 - Math.exp(-smoothSpeed * dt));
        }
        const currentAmp = this._animatedAmplitude;
        const waveSpeed = Math.PI / 4;
        const phaseOffset = elapsed * waveSpeed;
        const getPoint = (theta) => {
          const r = radius + currentAmp * Math.sin(numWaves * theta - phaseOffset);
          return {
            x: center + r * Math.cos(theta),
            y: center + r * Math.sin(theta)
          };
        };
        if (isIndet) {
          const spinOffset = elapsed * 1.5;
          const startAngle = spinOffset;
          const sweepAngle = Math.PI * 1.4;
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          const trackSteps = 180;
          for (let i = 0; i <= trackSteps; i++) {
            const angle = i / trackSteps * 2 * Math.PI;
            const pt = getPoint(angle);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = strokeWidth;
          const activeSteps = 120;
          for (let i = 0; i <= activeSteps; i++) {
            const angle = startAngle + i / activeSteps * sweepAngle;
            const pt = getPoint(angle);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        } else {
          const sweepAngle = p * 2 * Math.PI;
          const adjustedGapAngle = (gapSize + strokeWidth) / (2 * Math.PI * radius) * 2 * Math.PI;
          const gapSweep = Math.min(sweepAngle, adjustedGapAngle);
          const startAngle = -Math.PI / 2;
          if (p < 0.99 && startAngle + sweepAngle + gapSweep < startAngle + 2 * Math.PI - gapSweep) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.arc(center, center, radius, startAngle + sweepAngle + gapSweep, startAngle + 2 * Math.PI - gapSweep);
            ctx.stroke();
          }
          if (sweepAngle > 0.05) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            const activeSteps = Math.max(10, Math.floor(sweepAngle / (2 * Math.PI) * 180));
            for (let i = 0; i <= activeSteps; i++) {
              const angle = startAngle + i / activeSteps * sweepAngle;
              const pt = getPoint(angle);
              if (i === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }
        }
      } else {
        const startAngle = -Math.PI / 2;
        if (isIndet) {
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          ctx.arc(center, center, radius, 0, 2 * Math.PI);
          ctx.stroke();
          const spin = elapsed * 2 % (2 * Math.PI);
          ctx.beginPath();
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = strokeWidth;
          ctx.arc(center, center, radius, spin, spin + Math.PI * 1.3);
          ctx.stroke();
        } else {
          const sweep = p * 2 * Math.PI;
          const adjustedGapAngle = (gapSize + strokeWidth) / (2 * Math.PI * radius) * 2 * Math.PI;
          const gapSweep = Math.min(sweep, adjustedGapAngle);
          if (p < 0.99 && startAngle + sweep + gapSweep < startAngle + 2 * Math.PI - gapSweep) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.arc(center, center, radius, startAngle + sweep + gapSweep, startAngle + 2 * Math.PI - gapSweep);
            ctx.stroke();
          }
          if (sweep > 0.02) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            ctx.arc(center, center, radius, startAngle, startAngle + sweep);
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle12}</style>`}
      <div class="progress-root" role="progressbar" aria-label="Progress indicator">
        <canvas></canvas>
      </div>
    `;
    this._syncDimensions();
  }
};
if (!customElements.get("md-progress-indicator")) {
  customElements.define("md-progress-indicator", MdProgressIndicator);
}

// src/components/md-loading-indicator.js
var defaultStyle13 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: inline-block;
    vertical-align: middle;
    outline: none;
  }

  .loading-root {
    position: relative;
    width: 48px;
    height: 48px;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    overflow: hidden;
    background-color: transparent;
    transition: background-color 0.2s ease;
  }

  :host([variant="contained"]) .loading-root {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
  }

  canvas {
    display: block;
    width: 48px;
    height: 48px;
    pointer-events: none;
  }
`;
var loadingIndicatorSheet = createComponentSheet(defaultStyle13);
var GLOBAL_ROTATION_DURATION = 4666;
var MORPH_INTERVAL = 650;
var QUARTER_ROTATION = 90;
var SHAPES_INDETERMINATE = [
  // 1. SoftBurst (Frame 1)
  [{ x: 0.79, y: 0 }, { x: 0.799, y: 0.0393 }, { x: 0.831, y: 0.0818 }, { x: 0.8754, y: 0.1299 }, { x: 0.9268, y: 0.1844 }, { x: 0.9603, y: 0.2406 }, { x: 0.9569, y: 0.2903 }, { x: 0.9368, y: 0.3352 }, { x: 0.8823, y: 0.3655 }, { x: 0.8091, y: 0.3827 }, { x: 0.7364, y: 0.3936 }, { x: 0.6819, y: 0.4087 }, { x: 0.6485, y: 0.4333 }, { x: 0.6265, y: 0.4646 }, { x: 0.6184, y: 0.5075 }, { x: 0.6298, y: 0.5708 }, { x: 0.6293, y: 0.6293 }, { x: 0.638, y: 0.7039 }, { x: 0.6185, y: 0.7537 }, { x: 0.5838, y: 0.7871 }, { x: 0.5333, y: 0.7982 }, { x: 0.473, y: 0.7891 }, { x: 0.403, y: 0.754 }, { x: 0.3485, y: 0.7368 }, { x: 0.2947, y: 0.7114 }, { x: 0.2544, y: 0.7109 }, { x: 0.2235, y: 0.7368 }, { x: 0.192, y: 0.7663 }, { x: 0.16, y: 0.8042 }, { x: 0.1277, y: 0.8606 }, { x: 0.0902, y: 0.9156 }, { x: 0.0471, y: 0.9588 }, { x: 0, y: 0.97 }, { x: -0.0471, y: 0.9588 }, { x: -0.0902, y: 0.9156 }, { x: -0.1277, y: 0.8606 }, { x: -0.16, y: 0.8042 }, { x: -0.192, y: 0.7663 }, { x: -0.2235, y: 0.7368 }, { x: -0.2544, y: 0.7109 }, { x: -0.2947, y: 0.7114 }, { x: -0.3485, y: 0.7368 }, { x: -0.403, y: 0.754 }, { x: -0.473, y: 0.7891 }, { x: -0.5333, y: 0.7982 }, { x: -0.5838, y: 0.7871 }, { x: -0.6185, y: 0.7537 }, { x: -0.638, y: 0.7039 }, { x: -0.6293, y: 0.6293 }, { x: -0.6298, y: 0.5708 }, { x: -0.6184, y: 0.5075 }, { x: -0.6265, y: 0.4646 }, { x: -0.6485, y: 0.4333 }, { x: -0.6819, y: 0.4087 }, { x: -0.7364, y: 0.3936 }, { x: -0.8091, y: 0.3827 }, { x: -0.8823, y: 0.3655 }, { x: -0.9368, y: 0.3352 }, { x: -0.9569, y: 0.2903 }, { x: -0.9603, y: 0.2406 }, { x: -0.9268, y: 0.1844 }, { x: -0.8754, y: 0.1299 }, { x: -0.831, y: 0.0818 }, { x: -0.799, y: 0.0393 }, { x: -0.79, y: 0 }, { x: -0.799, y: -0.0393 }, { x: -0.831, y: -0.0818 }, { x: -0.8754, y: -0.1299 }, { x: -0.9268, y: -0.1844 }, { x: -0.9603, y: -0.2406 }, { x: -0.9569, y: -0.2903 }, { x: -0.9368, y: -0.3352 }, { x: -0.8823, y: -0.3655 }, { x: -0.8091, y: -0.3827 }, { x: -0.7364, y: -0.3936 }, { x: -0.6819, y: -0.4087 }, { x: -0.6485, y: -0.4333 }, { x: -0.6265, y: -0.4646 }, { x: -0.6184, y: -0.5075 }, { x: -0.6298, y: -0.5708 }, { x: -0.6293, y: -0.6293 }, { x: -0.638, y: -0.7039 }, { x: -0.6185, y: -0.7537 }, { x: -0.5838, y: -0.7871 }, { x: -0.5333, y: -0.7982 }, { x: -0.473, y: -0.7891 }, { x: -0.403, y: -0.754 }, { x: -0.3485, y: -0.7368 }, { x: -0.2947, y: -0.7114 }, { x: -0.2544, y: -0.7109 }, { x: -0.2221, y: -0.7321 }, { x: -0.192, y: -0.7663 }, { x: -0.16, y: -0.8042 }, { x: -0.1277, y: -0.8606 }, { x: -0.0902, y: -0.9156 }, { x: -0.0471, y: -0.9588 }, { x: -0, y: -0.97 }, { x: 0.0471, y: -0.9588 }, { x: 0.0902, y: -0.9156 }, { x: 0.1277, y: -0.8606 }, { x: 0.16, y: -0.8042 }, { x: 0.192, y: -0.7663 }, { x: 0.2221, y: -0.7321 }, { x: 0.2544, y: -0.7109 }, { x: 0.2947, y: -0.7114 }, { x: 0.3485, y: -0.7368 }, { x: 0.403, y: -0.754 }, { x: 0.473, y: -0.7891 }, { x: 0.5333, y: -0.7982 }, { x: 0.5838, y: -0.7871 }, { x: 0.6185, y: -0.7537 }, { x: 0.638, y: -0.7039 }, { x: 0.6293, y: -0.6293 }, { x: 0.6298, y: -0.5708 }, { x: 0.6184, y: -0.5075 }, { x: 0.6265, y: -0.4646 }, { x: 0.6485, y: -0.4333 }, { x: 0.6819, y: -0.4087 }, { x: 0.7364, y: -0.3936 }, { x: 0.8091, y: -0.3827 }, { x: 0.8823, y: -0.3655 }, { x: 0.9368, y: -0.3352 }, { x: 0.9569, y: -0.2903 }, { x: 0.9603, y: -0.2406 }, { x: 0.9268, y: -0.1844 }, { x: 0.8754, y: -0.1299 }, { x: 0.831, y: -0.0818 }, { x: 0.799, y: -0.0393 }],
  // 2. Cookie9 (Frame 20)
  [{ x: 0.9694, y: 0 }, { x: 0.9784, y: 0.0481 }, { x: 0.98, y: 0.0965 }, { x: 0.9791, y: 0.1452 }, { x: 0.9708, y: 0.1931 }, { x: 0.9601, y: 0.2405 }, { x: 0.9374, y: 0.2844 }, { x: 0.9031, y: 0.3231 }, { x: 0.8626, y: 0.3573 }, { x: 0.8302, y: 0.3927 }, { x: 0.8009, y: 0.4281 }, { x: 0.7833, y: 0.4695 }, { x: 0.7636, y: 0.5102 }, { x: 0.754, y: 0.5592 }, { x: 0.7415, y: 0.6085 }, { x: 0.7258, y: 0.6579 }, { x: 0.6963, y: 0.6963 }, { x: 0.6647, y: 0.7334 }, { x: 0.6279, y: 0.7651 }, { x: 0.5896, y: 0.795 }, { x: 0.5414, y: 0.8103 }, { x: 0.4984, y: 0.8315 }, { x: 0.4449, y: 0.8324 }, { x: 0.3927, y: 0.8302 }, { x: 0.3475, y: 0.839 }, { x: 0.306, y: 0.8551 }, { x: 0.2651, y: 0.8739 }, { x: 0.2269, y: 0.9057 }, { x: 0.1871, y: 0.9408 }, { x: 0.1422, y: 0.9589 }, { x: 0.097, y: 0.985 }, { x: 0.0488, y: 0.9937 }, { x: 0, y: 0.9949 }, { x: -0.0488, y: 0.9937 }, { x: -0.0955, y: 0.9698 }, { x: -0.1422, y: 0.9589 }, { x: -0.1851, y: 0.9307 }, { x: -0.2256, y: 0.9007 }, { x: -0.2651, y: 0.8739 }, { x: -0.3042, y: 0.8503 }, { x: -0.3475, y: 0.839 }, { x: -0.397, y: 0.8394 }, { x: -0.4498, y: 0.8414 }, { x: -0.4984, y: 0.8315 }, { x: -0.5471, y: 0.8187 }, { x: -0.5927, y: 0.7991 }, { x: -0.6279, y: 0.7651 }, { x: -0.6647, y: 0.7334 }, { x: -0.6927, y: 0.6927 }, { x: -0.7258, y: 0.6579 }, { x: -0.7375, y: 0.6053 }, { x: -0.7458, y: 0.5531 }, { x: -0.7594, y: 0.5074 }, { x: -0.779, y: 0.4669 }, { x: -0.8009, y: 0.4281 }, { x: -0.8348, y: 0.3948 }, { x: -0.8767, y: 0.3632 }, { x: -0.9127, y: 0.3266 }, { x: -0.9423, y: 0.2858 }, { x: -0.9651, y: 0.2417 }, { x: -0.9758, y: 0.1941 }, { x: -0.9841, y: 0.146 }, { x: -0.985, y: 0.097 }, { x: -0.9733, y: 0.0478 }, { x: -0.9541, y: 0 }, { x: -0.9325, y: -0.0458 }, { x: -0.9089, y: -0.0895 }, { x: -0.8983, y: -0.1333 }, { x: -0.9007, y: -0.1792 }, { x: -0.9007, y: -0.2256 }, { x: -0.8984, y: -0.2725 }, { x: -0.9127, y: -0.3266 }, { x: -0.9003, y: -0.3729 }, { x: -0.8902, y: -0.421 }, { x: -0.8774, y: -0.469 }, { x: -0.8446, y: -0.5062 }, { x: -0.823, y: -0.5499 }, { x: -0.7868, y: -0.5835 }, { x: -0.7493, y: -0.615 }, { x: -0.6918, y: -0.627 }, { x: -0.6494, y: -0.6494 }, { x: -0.6167, y: -0.6805 }, { x: -0.5761, y: -0.702 }, { x: -0.544, y: -0.7335 }, { x: -0.5187, y: -0.7763 }, { x: -0.4931, y: -0.8227 }, { x: -0.457, y: -0.8549 }, { x: -0.421, y: -0.8902 }, { x: -0.3788, y: -0.9145 }, { x: -0.3352, y: -0.9367 }, { x: -0.2888, y: -0.9521 }, { x: -0.238, y: -0.9502 }, { x: -0.1891, y: -0.9508 }, { x: -0.1377, y: -0.9286 }, { x: -0.0905, y: -0.919 }, { x: -0.0446, y: -0.9071 }, { x: -0, y: -0.9082 }, { x: 0.0451, y: -0.9173 }, { x: 0.0915, y: -0.9292 }, { x: 0.1392, y: -0.9387 }, { x: 0.1891, y: -0.9508 }, { x: 0.238, y: -0.9502 }, { x: 0.2888, y: -0.9521 }, { x: 0.3369, y: -0.9415 }, { x: 0.3807, y: -0.9192 }, { x: 0.4188, y: -0.8855 }, { x: 0.4594, y: -0.8594 }, { x: 0.4905, y: -0.8183 }, { x: 0.5131, y: -0.7678 }, { x: 0.5471, y: -0.7376 }, { x: 0.5794, y: -0.706 }, { x: 0.6167, y: -0.6805 }, { x: 0.6566, y: -0.6566 }, { x: 0.7031, y: -0.6373 }, { x: 0.7493, y: -0.615 }, { x: 0.7868, y: -0.5835 }, { x: 0.823, y: -0.5499 }, { x: 0.849, y: -0.5089 }, { x: 0.8729, y: -0.4666 }, { x: 0.8948, y: -0.4232 }, { x: 0.905, y: -0.3749 }, { x: 0.9031, y: -0.3231 }, { x: 0.8935, y: -0.271 }, { x: 0.8958, y: -0.2244 }, { x: 0.8957, y: -0.1782 }, { x: 0.9034, y: -0.134 }, { x: 0.9241, y: -0.091 }, { x: 0.9478, y: -0.0466 }],
  // 3. Pentagon (Frame 40)
  [{ x: 0.868, y: 0 }, { x: 0.8568, y: 0.0421 }, { x: 0.8588, y: 0.0846 }, { x: 0.8486, y: 0.1259 }, { x: 0.8364, y: 0.1664 }, { x: 0.8272, y: 0.2072 }, { x: 0.8161, y: 0.2476 }, { x: 0.8125, y: 0.2907 }, { x: 0.8019, y: 0.3322 }, { x: 0.7939, y: 0.3755 }, { x: 0.7924, y: 0.4235 }, { x: 0.7837, y: 0.4697 }, { x: 0.7724, y: 0.5161 }, { x: 0.7624, y: 0.5655 }, { x: 0.7495, y: 0.6151 }, { x: 0.7259, y: 0.6579 }, { x: 0.6963, y: 0.6963 }, { x: 0.6647, y: 0.7334 }, { x: 0.6215, y: 0.7573 }, { x: 0.5836, y: 0.7869 }, { x: 0.533, y: 0.7977 }, { x: 0.4906, y: 0.8185 }, { x: 0.4379, y: 0.8192 }, { x: 0.3928, y: 0.8306 }, { x: 0.3438, y: 0.8301 }, { x: 0.301, y: 0.8412 }, { x: 0.2549, y: 0.8404 }, { x: 0.2134, y: 0.8519 }, { x: 0.1693, y: 0.8513 }, { x: 0.1281, y: 0.8636 }, { x: 0.0851, y: 0.8638 }, { x: 0.0428, y: 0.872 }, { x: 0, y: 0.8731 }, { x: -0.0436, y: 0.8873 }, { x: -0.0871, y: 0.884 }, { x: -0.1326, y: 0.8938 }, { x: -0.1783, y: 0.8961 }, { x: -0.2269, y: 0.906 }, { x: -0.2785, y: 0.9181 }, { x: -0.3283, y: 0.9176 }, { x: -0.3749, y: 0.9051 }, { x: -0.4232, y: 0.8948 }, { x: -0.4714, y: 0.8819 }, { x: -0.5115, y: 0.8534 }, { x: -0.5471, y: 0.8188 }, { x: -0.5806, y: 0.7828 }, { x: -0.6119, y: 0.7455 }, { x: -0.6341, y: 0.6996 }, { x: -0.6461, y: 0.6461 }, { x: -0.6657, y: 0.6034 }, { x: -0.6867, y: 0.5635 }, { x: -0.7094, y: 0.5262 }, { x: -0.7217, y: 0.4822 }, { x: -0.7402, y: 0.4436 }, { x: -0.7521, y: 0.402 }, { x: -0.7755, y: 0.3668 }, { x: -0.7973, y: 0.3302 }, { x: -0.8125, y: 0.2907 }, { x: -0.8306, y: 0.252 }, { x: -0.8519, y: 0.2134 }, { x: -0.8663, y: 0.1723 }, { x: -0.8837, y: 0.1311 }, { x: -0.9043, y: 0.0891 }, { x: -0.9278, y: 0.0456 }, { x: -0.9492, y: 0 }, { x: -0.9582, y: -0.0471 }, { x: -0.9699, y: -0.0955 }, { x: -0.9691, y: -0.1438 }, { x: -0.9559, y: -0.1901 }, { x: -0.9454, y: -0.2368 }, { x: -0.9327, y: -0.2829 }, { x: -0.9033, y: -0.3232 }, { x: -0.8723, y: -0.3613 }, { x: -0.8397, y: -0.3972 }, { x: -0.7969, y: -0.4259 }, { x: -0.7619, y: -0.4567 }, { x: -0.7302, y: -0.4879 }, { x: -0.7013, y: -0.5201 }, { x: -0.6671, y: -0.5474 }, { x: -0.6319, y: -0.5727 }, { x: -0.6066, y: -0.6066 }, { x: -0.5795, y: -0.6394 }, { x: -0.5474, y: -0.6671 }, { x: -0.5141, y: -0.6931 }, { x: -0.4851, y: -0.726 }, { x: -0.4541, y: -0.7576 }, { x: -0.4164, y: -0.779 }, { x: -0.3841, y: -0.8122 }, { x: -0.3535, y: -0.8535 }, { x: -0.3181, y: -0.889 }, { x: -0.2785, y: -0.9181 }, { x: -0.238, y: -0.9503 }, { x: -0.1941, y: -0.9758 }, { x: -0.146, y: -0.9842 }, { x: -0.098, y: -0.9952 }, { x: -0.0488, y: -0.9937 }, { x: -0, y: -0.9848 }, { x: 0.0473, y: -0.9633 }, { x: 0.0925, y: -0.9396 }, { x: 0.1363, y: -0.9189 }, { x: 0.1783, y: -0.8961 }, { x: 0.2195, y: -0.8765 }, { x: 0.2593, y: -0.8549 }, { x: 0.2958, y: -0.8268 }, { x: 0.3361, y: -0.8113 }, { x: 0.3711, y: -0.7847 }, { x: 0.4116, y: -0.77 }, { x: 0.4463, y: -0.7445 }, { x: 0.4851, y: -0.726 }, { x: 0.5231, y: -0.7054 }, { x: 0.5603, y: -0.6828 }, { x: 0.6, y: -0.662 }, { x: 0.6389, y: -0.6389 }, { x: 0.6808, y: -0.617 }, { x: 0.7259, y: -0.5958 }, { x: 0.7624, y: -0.5655 }, { x: 0.8061, y: -0.5386 }, { x: 0.836, y: -0.5011 }, { x: 0.8685, y: -0.4642 }, { x: 0.8902, y: -0.421 }, { x: 0.9145, y: -0.3788 }, { x: 0.9129, y: -0.3266 }, { x: 0.9229, y: -0.28 }, { x: 0.9109, y: -0.2282 }, { x: 0.9111, y: -0.1812 }, { x: 0.9038, y: -0.1341 }, { x: 0.8891, y: -0.0876 }, { x: 0.8822, y: -0.0433 }],
  // 4. Pill (Frame 60)
  [{ x: 0.9897, y: 0 }, { x: 0.9885, y: 0.0486 }, { x: 0.9901, y: 0.0975 }, { x: 0.979, y: 0.1452 }, { x: 0.9757, y: 0.1941 }, { x: 0.965, y: 0.2417 }, { x: 0.9569, y: 0.2903 }, { x: 0.9318, y: 0.3334 }, { x: 0.9239, y: 0.3827 }, { x: 0.8993, y: 0.4254 }, { x: 0.8774, y: 0.469 }, { x: 0.8445, y: 0.5062 }, { x: 0.8229, y: 0.5498 }, { x: 0.7908, y: 0.5865 }, { x: 0.7571, y: 0.6213 }, { x: 0.7257, y: 0.6577 }, { x: 0.6816, y: 0.6816 }, { x: 0.6473, y: 0.7142 }, { x: 0.605, y: 0.7371 }, { x: 0.5711, y: 0.7701 }, { x: 0.5269, y: 0.7886 }, { x: 0.4797, y: 0.8003 }, { x: 0.4398, y: 0.8228 }, { x: 0.3945, y: 0.8341 }, { x: 0.3491, y: 0.8429 }, { x: 0.3056, y: 0.8542 }, { x: 0.2604, y: 0.8583 }, { x: 0.2167, y: 0.865 }, { x: 0.173, y: 0.8696 }, { x: 0.1286, y: 0.8668 }, { x: 0.0844, y: 0.8567 }, { x: 0.042, y: 0.8546 }, { x: 0, y: 0.8454 }, { x: -0.041, y: 0.834 }, { x: -0.0808, y: 0.8208 }, { x: -0.1203, y: 0.8107 }, { x: -0.1589, y: 0.7988 }, { x: -0.1979, y: 0.79 }, { x: -0.2334, y: 0.7695 }, { x: -0.2709, y: 0.7571 }, { x: -0.3097, y: 0.7477 }, { x: -0.3482, y: 0.7362 }, { x: -0.3864, y: 0.7228 }, { x: -0.4267, y: 0.7118 }, { x: -0.4697, y: 0.7029 }, { x: -0.5036, y: 0.679 }, { x: -0.5494, y: 0.6694 }, { x: -0.5816, y: 0.6416 }, { x: -0.616, y: 0.616 }, { x: -0.6531, y: 0.5919 }, { x: -0.6933, y: 0.569 }, { x: -0.7245, y: 0.5374 }, { x: -0.7586, y: 0.5069 }, { x: -0.787, y: 0.4717 }, { x: -0.8228, y: 0.4398 }, { x: -0.8434, y: 0.3989 }, { x: -0.8667, y: 0.359 }, { x: -0.8882, y: 0.3178 }, { x: -0.9125, y: 0.2768 }, { x: -0.935, y: 0.2342 }, { x: -0.9454, y: 0.1881 }, { x: -0.9637, y: 0.1429 }, { x: -0.9644, y: 0.095 }, { x: -0.9782, y: 0.0481 }, { x: -0.9897, y: 0 }, { x: -0.9885, y: -0.0486 }, { x: -0.9901, y: -0.0975 }, { x: -0.979, y: -0.1452 }, { x: -0.9757, y: -0.1941 }, { x: -0.965, y: -0.2417 }, { x: -0.9569, y: -0.2903 }, { x: -0.9318, y: -0.3334 }, { x: -0.9239, y: -0.3827 }, { x: -0.8993, y: -0.4254 }, { x: -0.8774, y: -0.469 }, { x: -0.8445, y: -0.5062 }, { x: -0.8229, y: -0.5498 }, { x: -0.7908, y: -0.5865 }, { x: -0.7571, y: -0.6213 }, { x: -0.7257, y: -0.6577 }, { x: -0.6816, y: -0.6816 }, { x: -0.6473, y: -0.7142 }, { x: -0.605, y: -0.7371 }, { x: -0.5711, y: -0.7701 }, { x: -0.5269, y: -0.7886 }, { x: -0.4797, y: -0.8003 }, { x: -0.4398, y: -0.8228 }, { x: -0.3945, y: -0.8341 }, { x: -0.3511, y: -0.8477 }, { x: -0.3056, y: -0.8542 }, { x: -0.2604, y: -0.8583 }, { x: -0.2167, y: -0.865 }, { x: -0.173, y: -0.8696 }, { x: -0.1286, y: -0.8668 }, { x: -0.0844, y: -0.8567 }, { x: -0.042, y: -0.8546 }, { x: -0, y: -0.8454 }, { x: 0.041, y: -0.834 }, { x: 0.0808, y: -0.8208 }, { x: 0.1203, y: -0.8107 }, { x: 0.1589, y: -0.7988 }, { x: 0.1979, y: -0.79 }, { x: 0.2334, y: -0.7695 }, { x: 0.2709, y: -0.7571 }, { x: 0.3097, y: -0.7477 }, { x: 0.3482, y: -0.7362 }, { x: 0.3864, y: -0.7228 }, { x: 0.4267, y: -0.7118 }, { x: 0.4697, y: -0.7029 }, { x: 0.5036, y: -0.679 }, { x: 0.5396, y: -0.6575 }, { x: 0.5816, y: -0.6416 }, { x: 0.616, y: -0.616 }, { x: 0.6531, y: -0.5919 }, { x: 0.6933, y: -0.569 }, { x: 0.7245, y: -0.5374 }, { x: 0.7586, y: -0.5069 }, { x: 0.787, y: -0.4717 }, { x: 0.8228, y: -0.4398 }, { x: 0.8434, y: -0.3989 }, { x: 0.8667, y: -0.359 }, { x: 0.8882, y: -0.3178 }, { x: 0.9125, y: -0.2768 }, { x: 0.935, y: -0.2342 }, { x: 0.9454, y: -0.1881 }, { x: 0.9637, y: -0.1429 }, { x: 0.9644, y: -0.095 }, { x: 0.9782, y: -0.0481 }],
  // 5. Sunny (Frame 80)
  [{ x: 0.8454, y: 0 }, { x: 0.834, y: 0.041 }, { x: 0.8464, y: 0.0834 }, { x: 0.8566, y: 0.1271 }, { x: 0.8797, y: 0.175 }, { x: 0.89, y: 0.2229 }, { x: 0.9125, y: 0.2768 }, { x: 0.9221, y: 0.3299 }, { x: 0.9096, y: 0.3768 }, { x: 0.8993, y: 0.4254 }, { x: 0.8637, y: 0.4617 }, { x: 0.8224, y: 0.4929 }, { x: 0.7715, y: 0.5155 }, { x: 0.7245, y: 0.5374 }, { x: 0.6814, y: 0.5592 }, { x: 0.6378, y: 0.5781 }, { x: 0.5941, y: 0.5941 }, { x: 0.5677, y: 0.6264 }, { x: 0.5396, y: 0.6575 }, { x: 0.5159, y: 0.6956 }, { x: 0.4954, y: 0.7415 }, { x: 0.4717, y: 0.787 }, { x: 0.4471, y: 0.8365 }, { x: 0.4165, y: 0.8807 }, { x: 0.3768, y: 0.9096 }, { x: 0.3334, y: 0.9318 }, { x: 0.2858, y: 0.9421 }, { x: 0.2342, y: 0.935 }, { x: 0.181, y: 0.91 }, { x: 0.1316, y: 0.8872 }, { x: 0.0854, y: 0.8669 }, { x: 0.042, y: 0.8546 }, { x: 0, y: 0.8454 }, { x: -0.0415, y: 0.8443 }, { x: -0.0834, y: 0.8464 }, { x: -0.1271, y: 0.8566 }, { x: -0.175, y: 0.8797 }, { x: -0.2229, y: 0.89 }, { x: -0.2723, y: 0.8977 }, { x: -0.3299, y: 0.9221 }, { x: -0.3768, y: 0.9096 }, { x: -0.4254, y: 0.8993 }, { x: -0.4617, y: 0.8637 }, { x: -0.4929, y: 0.8224 }, { x: -0.5155, y: 0.7715 }, { x: -0.5374, y: 0.7245 }, { x: -0.5592, y: 0.6814 }, { x: -0.5781, y: 0.6378 }, { x: -0.5941, y: 0.5941 }, { x: -0.6264, y: 0.5677 }, { x: -0.6575, y: 0.5396 }, { x: -0.6956, y: 0.5159 }, { x: -0.7372, y: 0.4926 }, { x: -0.787, y: 0.4717 }, { x: -0.8365, y: 0.4471 }, { x: -0.8807, y: 0.4165 }, { x: -0.9239, y: 0.3827 }, { x: -0.9318, y: 0.3334 }, { x: -0.9421, y: 0.2858 }, { x: -0.935, y: 0.2342 }, { x: -0.91, y: 0.181 }, { x: -0.8872, y: 0.1316 }, { x: -0.8669, y: 0.0854 }, { x: -0.8546, y: 0.042 }, { x: -0.8454, y: 0 }, { x: -0.834, y: -0.041 }, { x: -0.8464, y: -0.0834 }, { x: -0.8566, y: -0.1271 }, { x: -0.8797, y: -0.175 }, { x: -0.89, y: -0.2229 }, { x: -0.8977, y: -0.2723 }, { x: -0.9221, y: -0.3299 }, { x: -0.9096, y: -0.3768 }, { x: -0.8993, y: -0.4254 }, { x: -0.8637, y: -0.4617 }, { x: -0.8224, y: -0.4929 }, { x: -0.7715, y: -0.5155 }, { x: -0.7245, y: -0.5374 }, { x: -0.6814, y: -0.5592 }, { x: -0.6378, y: -0.5781 }, { x: -0.5941, y: -0.5941 }, { x: -0.5677, y: -0.6264 }, { x: -0.5396, y: -0.6575 }, { x: -0.5159, y: -0.6956 }, { x: -0.4926, y: -0.7372 }, { x: -0.4717, y: -0.787 }, { x: -0.4471, y: -0.8365 }, { x: -0.4165, y: -0.8807 }, { x: -0.3768, y: -0.9096 }, { x: -0.3334, y: -0.9318 }, { x: -0.2858, y: -0.9421 }, { x: -0.2342, y: -0.935 }, { x: -0.181, y: -0.91 }, { x: -0.1316, y: -0.8872 }, { x: -0.0854, y: -0.8669 }, { x: -0.042, y: -0.8546 }, { x: -0, y: -0.8454 }, { x: 0.0415, y: -0.8443 }, { x: 0.0834, y: -0.8464 }, { x: 0.1271, y: -0.8566 }, { x: 0.175, y: -0.8797 }, { x: 0.2229, y: -0.89 }, { x: 0.2768, y: -0.9125 }, { x: 0.3299, y: -0.9221 }, { x: 0.3768, y: -0.9096 }, { x: 0.4254, y: -0.8993 }, { x: 0.4617, y: -0.8637 }, { x: 0.4929, y: -0.8224 }, { x: 0.5155, y: -0.7715 }, { x: 0.5374, y: -0.7245 }, { x: 0.5592, y: -0.6814 }, { x: 0.5781, y: -0.6378 }, { x: 0.5941, y: -0.5941 }, { x: 0.6264, y: -0.5677 }, { x: 0.6575, y: -0.5396 }, { x: 0.6956, y: -0.5159 }, { x: 0.7415, y: -0.4954 }, { x: 0.787, y: -0.4717 }, { x: 0.8365, y: -0.4471 }, { x: 0.8807, y: -0.4165 }, { x: 0.9239, y: -0.3827 }, { x: 0.9318, y: -0.3334 }, { x: 0.9421, y: -0.2858 }, { x: 0.935, y: -0.2342 }, { x: 0.91, y: -0.181 }, { x: 0.8872, y: -0.1316 }, { x: 0.8669, y: -0.0854 }, { x: 0.8546, y: -0.042 }],
  // 6. Cookie4 (Frame 100)
  [{ x: 0.8136, y: 0 }, { x: 0.8444, y: 0.0415 }, { x: 0.8595, y: 0.0847 }, { x: 0.8903, y: 0.1321 }, { x: 0.9005, y: 0.1791 }, { x: 0.9083, y: 0.2275 }, { x: 0.9221, y: 0.2797 }, { x: 0.9201, y: 0.3292 }, { x: 0.9113, y: 0.3775 }, { x: 0.8999, y: 0.4256 }, { x: 0.8819, y: 0.4714 }, { x: 0.8577, y: 0.5141 }, { x: 0.8277, y: 0.553 }, { x: 0.7959, y: 0.5903 }, { x: 0.766, y: 0.6286 }, { x: 0.7275, y: 0.6593 }, { x: 0.6782, y: 0.6782 }, { x: 0.6319, y: 0.6972 }, { x: 0.5883, y: 0.7168 }, { x: 0.5334, y: 0.7192 }, { x: 0.4849, y: 0.7256 }, { x: 0.43, y: 0.7174 }, { x: 0.3771, y: 0.7055 }, { x: 0.3343, y: 0.7068 }, { x: 0.2888, y: 0.6971 }, { x: 0.2496, y: 0.6976 }, { x: 0.2138, y: 0.7047 }, { x: 0.1789, y: 0.7143 }, { x: 0.1445, y: 0.7267 }, { x: 0.1094, y: 0.7374 }, { x: 0.0744, y: 0.7554 }, { x: 0.0386, y: 0.7854 }, { x: 0, y: 0.8045 }, { x: -0.0415, y: 0.8444 }, { x: -0.0847, y: 0.8595 }, { x: -0.1321, y: 0.8903 }, { x: -0.1791, y: 0.9005 }, { x: -0.2275, y: 0.9083 }, { x: -0.2797, y: 0.9221 }, { x: -0.3292, y: 0.9201 }, { x: -0.3775, y: 0.9113 }, { x: -0.4256, y: 0.8999 }, { x: -0.4714, y: 0.8819 }, { x: -0.5141, y: 0.8577 }, { x: -0.553, y: 0.8277 }, { x: -0.5903, y: 0.7959 }, { x: -0.6286, y: 0.766 }, { x: -0.6593, y: 0.7275 }, { x: -0.6782, y: 0.6782 }, { x: -0.6972, y: 0.6319 }, { x: -0.7168, y: 0.5883 }, { x: -0.7156, y: 0.5307 }, { x: -0.7256, y: 0.4849 }, { x: -0.7174, y: 0.43 }, { x: -0.7055, y: 0.3771 }, { x: -0.7068, y: 0.3343 }, { x: -0.6971, y: 0.2888 }, { x: -0.6976, y: 0.2496 }, { x: -0.7047, y: 0.2138 }, { x: -0.7143, y: 0.1789 }, { x: -0.7267, y: 0.1445 }, { x: -0.7374, y: 0.1094 }, { x: -0.7554, y: 0.0744 }, { x: -0.7763, y: 0.0381 }, { x: -0.8045, y: 0 }, { x: -0.8444, y: -0.0415 }, { x: -0.864, y: -0.0851 }, { x: -0.8903, y: -0.1321 }, { x: -0.9005, y: -0.1791 }, { x: -0.9083, y: -0.2275 }, { x: -0.9221, y: -0.2797 }, { x: -0.9201, y: -0.3292 }, { x: -0.9113, y: -0.3775 }, { x: -0.8999, y: -0.4256 }, { x: -0.8819, y: -0.4714 }, { x: -0.8577, y: -0.5141 }, { x: -0.8277, y: -0.553 }, { x: -0.7959, y: -0.5903 }, { x: -0.766, y: -0.6286 }, { x: -0.7275, y: -0.6593 }, { x: -0.6782, y: -0.6782 }, { x: -0.6319, y: -0.6972 }, { x: -0.5825, y: -0.7098 }, { x: -0.5307, y: -0.7156 }, { x: -0.4849, y: -0.7256 }, { x: -0.43, y: -0.7174 }, { x: -0.3771, y: -0.7055 }, { x: -0.3343, y: -0.7068 }, { x: -0.2888, y: -0.6971 }, { x: -0.2496, y: -0.6976 }, { x: -0.2138, y: -0.7047 }, { x: -0.1789, y: -0.7143 }, { x: -0.1445, y: -0.7267 }, { x: -0.1094, y: -0.7374 }, { x: -0.0744, y: -0.7554 }, { x: -0.0386, y: -0.7854 }, { x: -0, y: -0.8136 }, { x: 0.0415, y: -0.8444 }, { x: 0.0851, y: -0.864 }, { x: 0.1321, y: -0.8903 }, { x: 0.1791, y: -0.9005 }, { x: 0.2275, y: -0.9083 }, { x: 0.2797, y: -0.9221 }, { x: 0.3292, y: -0.9201 }, { x: 0.3775, y: -0.9113 }, { x: 0.4256, y: -0.8999 }, { x: 0.4714, y: -0.8819 }, { x: 0.5141, y: -0.8577 }, { x: 0.553, y: -0.8277 }, { x: 0.5903, y: -0.7959 }, { x: 0.6286, y: -0.766 }, { x: 0.6593, y: -0.7275 }, { x: 0.6782, y: -0.6782 }, { x: 0.6972, y: -0.6319 }, { x: 0.7168, y: -0.5883 }, { x: 0.7156, y: -0.5307 }, { x: 0.7256, y: -0.4849 }, { x: 0.7174, y: -0.43 }, { x: 0.7055, y: -0.3771 }, { x: 0.7068, y: -0.3343 }, { x: 0.6971, y: -0.2888 }, { x: 0.6976, y: -0.2496 }, { x: 0.7047, y: -0.2138 }, { x: 0.7143, y: -0.1789 }, { x: 0.7267, y: -0.1445 }, { x: 0.7374, y: -0.1094 }, { x: 0.7554, y: -0.0744 }, { x: 0.7763, y: -0.0381 }],
  // 7. Oval (Frame 120)
  [{ x: 0.6444, y: 0 }, { x: 0.6525, y: 0.0321 }, { x: 0.6546, y: 0.0645 }, { x: 0.6507, y: 0.0965 }, { x: 0.6539, y: 0.1301 }, { x: 0.651, y: 0.1631 }, { x: 0.6507, y: 0.1974 }, { x: 0.6444, y: 0.2306 }, { x: 0.6447, y: 0.267 }, { x: 0.6428, y: 0.304 }, { x: 0.635, y: 0.3394 }, { x: 0.6252, y: 0.3747 }, { x: 0.6245, y: 0.4173 }, { x: 0.614, y: 0.4554 }, { x: 0.6012, y: 0.4934 }, { x: 0.5862, y: 0.5313 }, { x: 0.5783, y: 0.5783 }, { x: 0.5581, y: 0.6158 }, { x: 0.5385, y: 0.6562 }, { x: 0.5189, y: 0.6997 }, { x: 0.4914, y: 0.7354 }, { x: 0.4638, y: 0.7739 }, { x: 0.4358, y: 0.8153 }, { x: 0.4029, y: 0.8518 }, { x: 0.364, y: 0.8787 }, { x: 0.3294, y: 0.9206 }, { x: 0.2838, y: 0.9357 }, { x: 0.2397, y: 0.9571 }, { x: 0.1942, y: 0.9764 }, { x: 0.1461, y: 0.9848 }, { x: 0.098, y: 0.9952 }, { x: 0.0488, y: 0.9944 }, { x: 0, y: 0.9867 }, { x: -0.048, y: 0.9766 }, { x: -0.0945, y: 0.9598 }, { x: -0.1389, y: 0.9364 }, { x: -0.183, y: 0.9198 }, { x: -0.2225, y: 0.8881 }, { x: -0.2619, y: 0.8634 }, { x: -0.295, y: 0.8244 }, { x: -0.33, y: 0.7966 }, { x: -0.3591, y: 0.7594 }, { x: -0.3876, y: 0.7251 }, { x: -0.4136, y: 0.69 }, { x: -0.437, y: 0.6541 }, { x: -0.4554, y: 0.614 }, { x: -0.4821, y: 0.5875 }, { x: -0.4984, y: 0.55 }, { x: -0.5123, y: 0.5123 }, { x: -0.5302, y: 0.4805 }, { x: -0.5428, y: 0.4455 }, { x: -0.5569, y: 0.413 }, { x: -0.5691, y: 0.3803 }, { x: -0.5756, y: 0.345 }, { x: -0.5879, y: 0.3143 }, { x: -0.5946, y: 0.2812 }, { x: -0.6036, y: 0.25 }, { x: -0.6151, y: 0.2201 }, { x: -0.6252, y: 0.1897 }, { x: -0.6251, y: 0.1566 }, { x: -0.6321, y: 0.1257 }, { x: -0.6331, y: 0.0939 }, { x: -0.6413, y: 0.0632 }, { x: -0.6437, y: 0.0316 }, { x: -0.6444, y: 0 }, { x: -0.6525, y: -0.0321 }, { x: -0.6546, y: -0.0645 }, { x: -0.6507, y: -0.0965 }, { x: -0.6539, y: -0.1301 }, { x: -0.651, y: -0.1631 }, { x: -0.6507, y: -0.1974 }, { x: -0.6444, y: -0.2306 }, { x: -0.6447, y: -0.267 }, { x: -0.6428, y: -0.304 }, { x: -0.635, y: -0.3394 }, { x: -0.6252, y: -0.3747 }, { x: -0.6245, y: -0.4173 }, { x: -0.614, y: -0.4554 }, { x: -0.6012, y: -0.4934 }, { x: -0.5862, y: -0.5313 }, { x: -0.5783, y: -0.5783 }, { x: -0.5581, y: -0.6158 }, { x: -0.5385, y: -0.6562 }, { x: -0.5189, y: -0.6997 }, { x: -0.4914, y: -0.7354 }, { x: -0.4638, y: -0.7739 }, { x: -0.4358, y: -0.8153 }, { x: -0.4029, y: -0.8518 }, { x: -0.364, y: -0.8787 }, { x: -0.3249, y: -0.9081 }, { x: -0.2838, y: -0.9357 }, { x: -0.2397, y: -0.9571 }, { x: -0.1942, y: -0.9764 }, { x: -0.1461, y: -0.9848 }, { x: -0.098, y: -0.9952 }, { x: -0.0488, y: -0.9944 }, { x: -0, y: -0.9867 }, { x: 0.048, y: -0.9766 }, { x: 0.0945, y: -0.9598 }, { x: 0.1389, y: -0.9364 }, { x: 0.183, y: -0.9198 }, { x: 0.2225, y: -0.8881 }, { x: 0.2619, y: -0.8634 }, { x: 0.295, y: -0.8244 }, { x: 0.33, y: -0.7966 }, { x: 0.3591, y: -0.7594 }, { x: 0.3876, y: -0.7251 }, { x: 0.4136, y: -0.69 }, { x: 0.437, y: -0.6541 }, { x: 0.4554, y: -0.614 }, { x: 0.4821, y: -0.5875 }, { x: 0.4984, y: -0.55 }, { x: 0.5123, y: -0.5123 }, { x: 0.5302, y: -0.4805 }, { x: 0.5428, y: -0.4455 }, { x: 0.5569, y: -0.413 }, { x: 0.5691, y: -0.3803 }, { x: 0.5756, y: -0.345 }, { x: 0.5879, y: -0.3143 }, { x: 0.5946, y: -0.2812 }, { x: 0.6036, y: -0.25 }, { x: 0.6151, y: -0.2201 }, { x: 0.6252, y: -0.1897 }, { x: 0.6251, y: -0.1566 }, { x: 0.6321, y: -0.1257 }, { x: 0.6331, y: -0.0939 }, { x: 0.6413, y: -0.0632 }, { x: 0.6437, y: -0.0316 }]
];
var SHAPES_DETERMINATE = [
  // Circle (rotated)
  [{ x: 1, y: 0 }, { x: 0.9988, y: 0.0491 }, { x: 0.9952, y: 0.098 }, { x: 0.9892, y: 0.1468 }, { x: 0.9808, y: 0.1951 }, { x: 0.97, y: 0.243 }, { x: 0.9569, y: 0.2903 }, { x: 0.9415, y: 0.3369 }, { x: 0.9239, y: 0.3827 }, { x: 0.904, y: 0.4276 }, { x: 0.8819, y: 0.4714 }, { x: 0.8577, y: 0.5141 }, { x: 0.8315, y: 0.5556 }, { x: 0.8032, y: 0.5957 }, { x: 0.773, y: 0.6344 }, { x: 0.741, y: 0.6715 }, { x: 0.7071, y: 0.7071 }, { x: 0.6716, y: 0.7409 }, { x: 0.6344, y: 0.773 }, { x: 0.5957, y: 0.8032 }, { x: 0.5555, y: 0.8315 }, { x: 0.5141, y: 0.8577 }, { x: 0.4714, y: 0.8819 }, { x: 0.4276, y: 0.904 }, { x: 0.3827, y: 0.9239 }, { x: 0.3369, y: 0.9415 }, { x: 0.2903, y: 0.9569 }, { x: 0.243, y: 0.97 }, { x: 0.1951, y: 0.9808 }, { x: 0.1468, y: 0.9892 }, { x: 0.098, y: 0.9952 }, { x: 0.0491, y: 0.9988 }, { x: 0, y: 1 }, { x: -0.0491, y: 0.9988 }, { x: -0.098, y: 0.9952 }, { x: -0.1468, y: 0.9892 }, { x: -0.1951, y: 0.9808 }, { x: -0.243, y: 0.97 }, { x: -0.2903, y: 0.9569 }, { x: -0.3369, y: 0.9415 }, { x: -0.3827, y: 0.9239 }, { x: -0.4276, y: 0.904 }, { x: -0.4714, y: 0.8819 }, { x: -0.5141, y: 0.8577 }, { x: -0.5555, y: 0.8315 }, { x: -0.5957, y: 0.8032 }, { x: -0.6344, y: 0.773 }, { x: -0.6716, y: 0.7409 }, { x: -0.7071, y: 0.7071 }, { x: -0.741, y: 0.6715 }, { x: -0.773, y: 0.6344 }, { x: -0.8032, y: 0.5957 }, { x: -0.8315, y: 0.5556 }, { x: -0.8577, y: 0.5141 }, { x: -0.8819, y: 0.4714 }, { x: -0.904, y: 0.4276 }, { x: -0.9239, y: 0.3827 }, { x: -0.9415, y: 0.3369 }, { x: -0.9569, y: 0.2903 }, { x: -0.97, y: 0.243 }, { x: -0.9808, y: 0.1951 }, { x: -0.9892, y: 0.1468 }, { x: -0.9952, y: 0.098 }, { x: -0.9988, y: 0.0491 }, { x: -1, y: 0 }, { x: -0.9988, y: -0.0491 }, { x: -0.9952, y: -0.098 }, { x: -0.9892, y: -0.1468 }, { x: -0.9808, y: -0.1951 }, { x: -0.97, y: -0.243 }, { x: -0.9569, y: -0.2903 }, { x: -0.9415, y: -0.3369 }, { x: -0.9239, y: -0.3827 }, { x: -0.904, y: -0.4276 }, { x: -0.8819, y: -0.4714 }, { x: -0.8577, y: -0.5141 }, { x: -0.8315, y: -0.5556 }, { x: -0.8032, y: -0.5957 }, { x: -0.773, y: -0.6344 }, { x: -0.741, y: -0.6715 }, { x: -0.7071, y: -0.7071 }, { x: -0.6716, y: -0.7409 }, { x: -0.6344, y: -0.773 }, { x: -0.5957, y: -0.8032 }, { x: -0.5555, y: -0.8315 }, { x: -0.5141, y: -0.8577 }, { x: -0.4714, y: -0.8819 }, { x: -0.4276, y: -0.904 }, { x: -0.3827, y: -0.9239 }, { x: -0.3369, y: -0.9415 }, { x: -0.2903, y: -0.9569 }, { x: -0.243, y: -0.97 }, { x: -0.1951, y: -0.9808 }, { x: -0.1468, y: -0.9892 }, { x: -0.098, y: -0.9952 }, { x: -0.0491, y: -0.9988 }, { x: 0, y: -1 }, { x: 0.0491, y: -0.9988 }, { x: 0.098, y: -0.9952 }, { x: 0.1468, y: -0.9892 }, { x: 0.1951, y: -0.9808 }, { x: 0.243, y: -0.97 }, { x: 0.2903, y: -0.9569 }, { x: 0.3369, y: -0.9415 }, { x: 0.3827, y: -0.9239 }, { x: 0.4276, y: -0.904 }, { x: 0.4714, y: -0.8819 }, { x: 0.5141, y: -0.8577 }, { x: 0.5555, y: -0.8315 }, { x: 0.5957, y: -0.8032 }, { x: 0.6344, y: -0.773 }, { x: 0.6716, y: -0.7409 }, { x: 0.7071, y: -0.7071 }, { x: 0.741, y: -0.6715 }, { x: 0.773, y: -0.6344 }, { x: 0.8032, y: -0.5957 }, { x: 0.8315, y: -0.5556 }, { x: 0.8577, y: -0.5141 }, { x: 0.8819, y: -0.4714 }, { x: 0.904, y: -0.4276 }, { x: 0.9239, y: -0.3827 }, { x: 0.9415, y: -0.3369 }, { x: 0.9569, y: -0.2903 }, { x: 0.97, y: -0.243 }, { x: 0.9808, y: -0.1951 }, { x: 0.9892, y: -0.1468 }, { x: 0.9952, y: -0.098 }, { x: 0.9988, y: -0.0491 }],
  // SoftBurst (Frame 1)
  [{ x: 0.79, y: 0 }, { x: 0.799, y: 0.0393 }, { x: 0.831, y: 0.0818 }, { x: 0.8754, y: 0.1299 }, { x: 0.9268, y: 0.1844 }, { x: 0.9603, y: 0.2406 }, { x: 0.9569, y: 0.2903 }, { x: 0.9368, y: 0.3352 }, { x: 0.8823, y: 0.3655 }, { x: 0.8091, y: 0.3827 }, { x: 0.7364, y: 0.3936 }, { x: 0.6819, y: 0.4087 }, { x: 0.6485, y: 0.4333 }, { x: 0.6265, y: 0.4646 }, { x: 0.6184, y: 0.5075 }, { x: 0.6298, y: 0.5708 }, { x: 0.6293, y: 0.6293 }, { x: 0.638, y: 0.7039 }, { x: 0.6185, y: 0.7537 }, { x: 0.5838, y: 0.7871 }, { x: 0.5333, y: 0.7982 }, { x: 0.473, y: 0.7891 }, { x: 0.403, y: 0.754 }, { x: 0.3485, y: 0.7368 }, { x: 0.2947, y: 0.7114 }, { x: 0.2544, y: 0.7109 }, { x: 0.2221, y: 0.7321 }, { x: 0.192, y: 0.7663 }, { x: 0.16, y: 0.8042 }, { x: 0.1277, y: 0.8606 }, { x: 0.0902, y: 0.9156 }, { x: 0.0471, y: 0.9588 }, { x: -0, y: 0.97 }, { x: -0.0471, y: 0.9588 }, { x: -0.0902, y: 0.9156 }, { x: -0.1277, y: 0.8606 }, { x: -0.16, y: 0.8042 }, { x: -0.192, y: 0.7663 }, { x: -0.2221, y: 0.7321 }, { x: -0.2544, y: 0.7109 }, { x: -0.2947, y: 0.7114 }, { x: -0.3485, y: 0.7368 }, { x: -0.403, y: 0.754 }, { x: -0.473, y: 0.7891 }, { x: -0.5333, y: 0.7982 }, { x: -0.5838, y: 0.7871 }, { x: -0.6185, y: 0.7537 }, { x: -0.638, y: 0.7039 }, { x: -0.6293, y: 0.6293 }, { x: -0.6298, y: 0.5708 }, { x: -0.6184, y: 0.5075 }, { x: -0.6265, y: 0.4646 }, { x: -0.6485, y: 0.4333 }, { x: -0.6819, y: 0.4087 }, { x: -0.7364, y: 0.3936 }, { x: -0.8091, y: 0.3827 }, { x: -0.8823, y: 0.3655 }, { x: -0.9368, y: 0.3352 }, { x: -0.9569, y: 0.2903 }, { x: -0.9603, y: 0.2406 }, { x: -0.9268, y: 0.1844 }, { x: -0.8754, y: 0.1299 }, { x: -0.831, y: 0.0818 }, { x: -0.799, y: 0.0393 }, { x: -0.79, y: 0 }, { x: -0.799, y: -0.0393 }, { x: -0.831, y: -0.0818 }, { x: -0.8754, y: -0.1299 }, { x: -0.9268, y: -0.1844 }, { x: -0.9603, y: -0.2406 }, { x: -0.9569, y: -0.2903 }, { x: -0.9368, y: -0.3352 }, { x: -0.8823, y: -0.3655 }, { x: -0.8091, y: -0.3827 }, { x: -0.7364, y: -0.3936 }, { x: -0.6819, y: -0.4087 }, { x: -0.6485, y: -0.4333 }, { x: -0.6265, y: -0.4646 }, { x: -0.6184, y: -0.5075 }, { x: -0.6298, y: -0.5708 }, { x: -0.6293, y: -0.6293 }, { x: -0.638, y: -0.7039 }, { x: -0.6185, y: -0.7537 }, { x: -0.5838, y: -0.7871 }, { x: -0.5333, y: -0.7982 }, { x: -0.473, y: -0.7891 }, { x: -0.403, y: -0.754 }, { x: -0.3485, y: -0.7368 }, { x: -0.2947, y: -0.7114 }, { x: -0.2544, y: -0.7109 }, { x: -0.2221, y: -0.7321 }, { x: -0.192, y: -0.7663 }, { x: -0.16, y: -0.8042 }, { x: -0.1277, y: -0.8606 }, { x: -0.0902, y: -0.9156 }, { x: -0.0471, y: -0.9588 }, { x: -0, y: -0.97 }, { x: 0.0471, y: -0.9588 }, { x: 0.0902, y: -0.9156 }, { x: 0.1277, y: -0.8606 }, { x: 0.16, y: -0.8042 }, { x: 0.192, y: -0.7663 }, { x: 0.2221, y: -0.7321 }, { x: 0.2544, y: -0.7109 }, { x: 0.2947, y: -0.7114 }, { x: 0.3485, y: -0.7368 }, { x: 0.403, y: -0.754 }, { x: 0.473, y: -0.7891 }, { x: 0.5333, y: -0.7982 }, { x: 0.5838, y: -0.7871 }, { x: 0.6185, y: -0.7537 }, { x: 0.638, y: -0.7039 }, { x: 0.6293, y: -0.6293 }, { x: 0.6298, y: -0.5708 }, { x: 0.6184, y: -0.5075 }, { x: 0.6265, y: -0.4646 }, { x: 0.6485, y: -0.4333 }, { x: 0.6819, y: -0.4087 }, { x: 0.7364, y: -0.3936 }, { x: 0.8091, y: -0.3827 }, { x: 0.8823, y: -0.3655 }, { x: 0.9368, y: -0.3352 }, { x: 0.9569, y: -0.2903 }, { x: 0.9603, y: -0.2406 }, { x: 0.9268, y: -0.1844 }, { x: 0.8754, y: -0.1299 }, { x: 0.831, y: -0.0818 }, { x: 0.799, y: -0.0393 }]
];
var MdLoadingIndicator = class extends HTMLElement {
  static get observedAttributes() {
    return ["variant", "size", "progress", "indeterminate", "color", "track-color", "stroke-cap", "gap-size", "stroke-width"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, loadingIndicatorSheet);
    this._rendered = false;
    this._rafId = null;
    this._startTime = 0;
    this._currentMorphIndex = 0;
    this._lastStepTime = 0;
    this._cachedColor = "#6750A4";
    this._colorDirty = true;
    this._observer = null;
    this._isVisible = true;
    this._onThemeChange = () => {
      this._colorDirty = true;
    };
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._colorDirty = true;
    if (typeof window !== "undefined") {
      window.addEventListener("theme-color-change", this._onThemeChange);
    }
    this._setupIntersectionObserver();
    this._startAnimation();
  }
  disconnectedCallback() {
    this._stopAnimation();
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("theme-color-change", this._onThemeChange);
    }
  }
  _setupIntersectionObserver() {
    if (typeof IntersectionObserver === "undefined") return;
    this._observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      this._isVisible = entry ? entry.isIntersecting : true;
      if (this._isVisible) {
        if (!this._rafId) this._startAnimation();
      } else {
        this._stopAnimation();
      }
    }, { threshold: 0 });
    this._observer.observe(this);
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "color" || name === "variant") {
      this._colorDirty = true;
    }
    if (name === "progress" || name === "indeterminate") {
      this._syncProgress();
    }
    this._updateDimensions();
  }
  _resolveActiveColor(isContained) {
    if (!this._colorDirty && this._cachedColor) {
      return this._cachedColor;
    }
    const colorAttr = this.getAttribute("color");
    let activeColor = "";
    if (colorAttr && (colorAttr.startsWith("#") || colorAttr.startsWith("rgb") || colorAttr.startsWith("hsl"))) {
      activeColor = colorAttr;
    } else {
      const computedStyle = getComputedStyle(this);
      if (colorAttr === "primary" && !isContained) {
        activeColor = computedStyle.getPropertyValue("--md-sys-color-primary").trim() || "#D0BCFF";
      } else if (colorAttr === "secondary") {
        activeColor = computedStyle.getPropertyValue("--md-sys-color-secondary").trim() || "#CCC2DC";
      } else if (colorAttr === "tertiary") {
        activeColor = computedStyle.getPropertyValue("--md-sys-color-tertiary").trim() || "#EFB8C8";
      } else if (colorAttr === "on-primary-container") {
        activeColor = computedStyle.getPropertyValue("--md-sys-color-on-primary-container").trim() || "#EADDFF";
      } else if (isContained) {
        activeColor = computedStyle.getPropertyValue("--md-sys-color-on-primary-container").trim() || computedStyle.getPropertyValue("--md-sys-color-primary").trim() || "#EADDFF";
      } else {
        activeColor = computedStyle.getPropertyValue("--md-sys-color-primary").trim() || "#D0BCFF";
      }
    }
    this._cachedColor = activeColor || "#D0BCFF";
    this._colorDirty = false;
    return this._cachedColor;
  }
  get variant() {
    return this.getAttribute("variant") || "standalone";
  }
  set variant(v) {
    this.setAttribute("variant", v);
  }
  get size() {
    return this.getAttribute("size") || "standard";
  }
  set size(v) {
    this.setAttribute("size", v);
  }
  get indeterminate() {
    return !this.hasAttribute("progress") || this.hasAttribute("indeterminate");
  }
  set indeterminate(v) {
    if (v) this.setAttribute("indeterminate", "");
    else this.removeAttribute("indeterminate");
  }
  get progress() {
    const p = parseFloat(this.getAttribute("progress"));
    return isNaN(p) ? null : Math.max(0, Math.min(1, p));
  }
  set progress(v) {
    if (v === null || v === void 0) this.removeAttribute("progress");
    else this.setAttribute("progress", String(v));
  }
  get trackColor() {
    return this.getAttribute("track-color") || "var(--md-sys-color-secondary-container, #E8DEF8)";
  }
  set trackColor(v) {
    if (v === null || v === void 0) this.removeAttribute("track-color");
    else this.setAttribute("track-color", String(v));
  }
  get strokeCap() {
    return this.getAttribute("stroke-cap") || "round";
  }
  set strokeCap(v) {
    if (v === null || v === void 0) this.removeAttribute("stroke-cap");
    else this.setAttribute("stroke-cap", String(v));
  }
  get gapSize() {
    const gs = parseFloat(this.getAttribute("gap-size"));
    return isNaN(gs) || gs < 0 ? 4 : gs;
  }
  set gapSize(v) {
    if (v === null || v === void 0) this.removeAttribute("gap-size");
    else this.setAttribute("gap-size", String(v));
  }
  get strokeWidth() {
    const sw = parseFloat(this.getAttribute("stroke-width"));
    return isNaN(sw) || sw <= 0 ? 4 : sw;
  }
  set strokeWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("stroke-width");
    else this.setAttribute("stroke-width", String(v));
  }
  get sizePx() {
    const s = this.size;
    if (s === "small") return 36;
    if (s === "large") return 64;
    const n = parseInt(s, 10);
    return isNaN(n) ? 48 : Math.max(24, Math.min(128, n));
  }
  _startAnimation() {
    this._stopAnimation();
    this._startTime = performance.now();
    this._lastStepTime = this._startTime;
    this._currentMorphIndex = 0;
    const canvas = this.shadowRoot.querySelector("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const loop = (now) => {
      this._drawFrame(ctx, now);
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }
  _stopAnimation() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
  _drawFrame(ctx, now) {
    const canvas = ctx.canvas;
    const dpr = window.devicePixelRatio || 1;
    const sz = this.sizePx;
    const requiredW = Math.round(sz * dpr);
    const requiredH = Math.round(sz * dpr);
    if (canvas.width !== requiredW || canvas.height !== requiredH) {
      canvas.width = requiredW;
      canvas.height = requiredH;
      canvas.style.width = `${sz}px`;
      canvas.style.height = `${sz}px`;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.lineCap = this.strokeCap;
    ctx.lineJoin = "round";
    const center = sz / 2;
    const isContained = this.variant === "contained";
    const activeRatio = 0.66;
    const indicatorRadius = activeRatio * (sz / 2);
    const isIndet = this.indeterminate;
    let pointsA;
    let pointsB;
    let morphT = 0;
    let globalAngle = 0;
    let stepAngle = 0;
    if (isIndet) {
      const elapsedTotal = now - this._startTime;
      globalAngle = elapsedTotal % GLOBAL_ROTATION_DURATION / GLOBAL_ROTATION_DURATION * 360;
      const stepElapsed = now - this._lastStepTime;
      if (stepElapsed >= MORPH_INTERVAL) {
        this._currentMorphIndex = (this._currentMorphIndex + 1) % SHAPES_INDETERMINATE.length;
        this._lastStepTime = now;
      }
      const nextIndex = (this._currentMorphIndex + 1) % SHAPES_INDETERMINATE.length;
      pointsA = SHAPES_INDETERMINATE[this._currentMorphIndex];
      pointsB = SHAPES_INDETERMINATE[nextIndex];
      const tNorm = Math.min(1, (now - this._lastStepTime) / MORPH_INTERVAL);
      const springState = SpringPhysics.solve({
        from: 0,
        to: 1,
        dampingRatio: 0.6,
        stiffness: 200,
        mass: 1,
        time: tNorm * (MORPH_INTERVAL / 1e3)
      });
      morphT = Math.max(0, Math.min(1, springState.position));
      stepAngle = this._currentMorphIndex * QUARTER_ROTATION + morphT * QUARTER_ROTATION;
    } else {
      const p = this.progress || 0;
      pointsA = SHAPES_DETERMINATE[0];
      pointsB = SHAPES_DETERMINATE[1];
      morphT = p;
      globalAngle = p * 360;
      stepAngle = p * 90;
    }
    const totalAngle = (globalAngle + stepAngle) * Math.PI / 180;
    ctx.translate(center, center);
    ctx.rotate(totalAngle);
    ctx.fillStyle = this._resolveActiveColor(isContained);
    ctx.beginPath();
    const nPoints = pointsA.length;
    for (let i = 0; i < nPoints; i++) {
      const pa = pointsA[i];
      const pb = pointsB[i];
      const px = (pa.x + (pb.x - pa.x) * morphT) * indicatorRadius;
      const py = (pa.y + (pb.y - pa.y) * morphT) * indicatorRadius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  _updateDimensions() {
    const root = this.shadowRoot.querySelector(".loading-root");
    const canvas = this.shadowRoot.querySelector("canvas");
    if (!root || !canvas) return;
    const sz = this.sizePx;
    root.style.width = `${sz}px`;
    root.style.height = `${sz}px`;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = sz * dpr;
    canvas.height = sz * dpr;
    canvas.style.width = `${sz}px`;
    canvas.style.height = `${sz}px`;
  }
  _syncProgress() {
    const root = this.shadowRoot.querySelector(".loading-root");
    if (!root) return;
    if (this.indeterminate) {
      root.setAttribute("aria-busy", "true");
      root.removeAttribute("aria-valuenow");
    } else {
      root.setAttribute("aria-busy", "false");
      root.setAttribute("aria-valuenow", String(Math.round((this.progress || 0) * 100)));
      root.setAttribute("aria-valuemin", "0");
      root.setAttribute("aria-valuemax", "100");
    }
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle13}</style>`}
      <div class="loading-root" role="progressbar" aria-label="Loading indicator">
        <canvas></canvas>
      </div>
    `;
    this._updateDimensions();
    this._syncProgress();
  }
};
if (!customElements.get("md-loading-indicator")) {
  customElements.define("md-loading-indicator", MdLoadingIndicator);
}

// src/components/md-bottom-sheet.js
var defaultStyle14 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; outline: none; display: contents; }
  :host(:not([open])) .scrim, :host(:not([open])) .sheet { display: none !important; }
  :host([open]) .scrim { display: block !important; }

  .scrim {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-scrim, #000);
    opacity: 0.4;
    z-index: 2000;
    touch-action: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .sheet {
    box-sizing: border-box;
    position: fixed;
    left: 0;
    right: 0;
    margin: 0 auto;
    width: min(640px, 100vw);
    bottom: 0;
    z-index: 2001;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    max-height: 85vh;
    padding: 0 24px calc(56px + env(safe-area-inset-bottom, 24px));
    /* CornerExtraLargeTop 28/28/0/0 */
    border-radius: var(--md-sys-shape-corner-extra-large, 28px) var(--md-sys-shape-corner-extra-large, 28px) 0 0;
    background-color: var(--md-sys-color-surface-container-low, #1D1B20);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.25));
    overflow: visible;
    will-change: transform;
  }

  /* Skirt extension at bottom so dragging upwards never exposes background beneath */
  .sheet::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    height: 100vh;
    background-color: inherit;
    pointer-events: none;
  }

  .handle-area {
    display: flex; align-items: center; justify-content: center;
    min-height: 40px;                    /* touch target */
    padding: 12px 0 8px;
    border: none; background: transparent; cursor: grab; outline: none;
    width: 100%;
    touch-action: none;
    user-select: none;
  }
  .handle-area:active { cursor: grabbing; }
  .handle-area:focus { outline: none; }
  .handle-area:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #D0BCFF);
    outline-offset: 2px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .handle {
    width: 32px; height: 4px;            /* drag handle 32x4dp */
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    opacity: 0.4;
    transition: opacity var(--md-sys-motion-duration-short2, 100ms) ease;
  }
  .handle-area:hover .handle { opacity: 0.7; }
  .handle-area.pressed .handle { opacity: 0.95; }

  .headline {
    font: var(--md-sys-typescale-title-large, 400 22px/28px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #E6E0E9);
    padding: 4px 0 12px;
  }
  .headline:empty { display: none; }
  .content {
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    overflow-y: auto;
    max-height: calc(85vh - 80px);
    overscroll-behavior: contain;
    padding-bottom: 24px;
  }

  @media (max-width: 600px) {
    .sheet {
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100vw !important;
      max-width: 100vw !important;
      margin: 0 !important;
      border-radius: var(--md-sys-shape-corner-extra-large, 28px) var(--md-sys-shape-corner-extra-large, 28px) 0 0 !important;
      padding: 0 20px calc(80px + env(safe-area-inset-bottom, 24px)) !important;
      box-sizing: border-box !important;
    }
    .content {
      padding-bottom: 24px !important;
    }
  }
`;
var bottomSheetSheet = createComponentSheet(defaultStyle14);
var MdBottomSheet = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "open",
      "modal",
      "minimized",
      "headline",
      "sheet-max-width",
      "sheet-gestures-enabled",
      "container-color",
      "content-color",
      "scrim-color",
      "peek-height",
      "sheet-swipe-enabled"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, bottomSheetSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    v ? this.setAttribute("open", "") : this.removeAttribute("open");
  }
  get modal() {
    return this.hasAttribute("modal");
  }
  get minimized() {
    return this.hasAttribute("minimized");
  }
  get sheetMaxWidth() {
    return this.getAttribute("sheet-max-width") || "640px";
  }
  set sheetMaxWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("sheet-max-width");
    else this.setAttribute("sheet-max-width", v);
  }
  get sheetGesturesEnabled() {
    return this.getAttribute("sheet-gestures-enabled") !== "false";
  }
  set sheetGesturesEnabled(v) {
    if (v) this.setAttribute("sheet-gestures-enabled", "true");
    else this.setAttribute("sheet-gestures-enabled", "false");
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get scrimColor() {
    return this.getAttribute("scrim-color") || "";
  }
  set scrimColor(v) {
    if (v === null || v === void 0) this.removeAttribute("scrim-color");
    else this.setAttribute("scrim-color", v);
  }
  get peekHeight() {
    const p = parseFloat(this.getAttribute("peek-height"));
    return isNaN(p) ? 0 : p;
  }
  set peekHeight(v) {
    if (v === null || v === void 0) this.removeAttribute("peek-height");
    else this.setAttribute("peek-height", String(v));
  }
  get sheetSwipeEnabled() {
    return this.getAttribute("sheet-swipe-enabled") !== "false";
  }
  set sheetSwipeEnabled(v) {
    if (v) this.setAttribute("sheet-swipe-enabled", "true");
    else this.setAttribute("sheet-swipe-enabled", "false");
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
    if (this.open) this._activate();
  }
  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown);
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "open") this.open ? this._activate() : this._deactivate();
    else if (name === "headline") {
      const h = this.shadowRoot.querySelector(".headline");
      if (h) h.textContent = newV || "";
    } else if (name === "container-color" || name === "content-color" || name === "scrim-color" || name === "sheet-max-width") {
      this.render();
      this.setupInteractions();
    }
  }
  show() {
    this.open = true;
  }
  close() {
    this.open = false;
    this._deactivate();
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }
  render() {
    const headline = this.getAttribute("headline") || "";
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle14}</style>`}
      <div class="scrim" part="scrim"></div>
      <div class="sheet" role="dialog" aria-modal="${this.modal ? "true" : "false"}"
        aria-label="${escapeHtml(this.getAttribute("aria-label") || headline || "Bottom sheet")}">
        <button class="handle-area" type="button" aria-label="Drag handle">
          <span class="handle"></span>
        </button>
        <div class="headline">${escapeHtml(headline)}</div>
        <div class="content"><slot></slot></div>
      </div>
    `;
  }
  _focusable() {
    const s = this.shadowRoot.querySelector(".sheet");
    return [...s.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href],input,select,textarea')];
  }
  _activate() {
    document.addEventListener("keydown", this._onKeydown);
    document.body.style.overflow = "hidden";
    const f = this._focusable();
    if (f.length) f[0].focus({ preventScroll: true });
    const sheet = this.shadowRoot.querySelector(".sheet");
    if (sheet) {
      sheet.style.transform = "translateY(100%)";
      sheet.style.transition = "transform 0.3s cubic-bezier(0.2, 0, 0, 1)";
      requestAnimationFrame(() => {
        sheet.style.transform = "translateY(0)";
      });
      setTimeout(() => {
        sheet.style.transition = "";
      }, 300);
    }
  }
  _deactivate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.body.style.overflow = "";
  }
  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === "Tab") {
      const f = this._focusable();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const active = this.shadowRoot.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) {
      const onScrimDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      };
      scrim.addEventListener("click", onScrimDismiss, { signal });
      scrim.addEventListener("pointerdown", onScrimDismiss, { signal });
      scrim.addEventListener("touchstart", onScrimDismiss, { signal, passive: false });
    }
    const handleArea = this.shadowRoot.querySelector(".handle-area");
    const sheet = this.shadowRoot.querySelector(".sheet");
    if (!handleArea || !sheet) return;
    let isDragging = false;
    let startY = 0;
    let currentY = 0;
    let startTime = 0;
    const onPointerDown = (e) => {
      isDragging = true;
      startY = e.clientY;
      currentY = startY;
      startTime = performance.now();
      handleArea.setPointerCapture?.(e.pointerId);
      handleArea.classList.add("pressed");
      sheet.style.transition = "none";
      if (scrim) scrim.style.transition = "none";
    };
    const onPointerMove = (e) => {
      if (!isDragging) return;
      currentY = e.clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        sheet.style.transform = `translateY(${deltaY}px)`;
        if (scrim) {
          const sheetHeight = sheet.offsetHeight || 300;
          const opacity = Math.max(0, 0.32 * (1 - deltaY / sheetHeight));
          scrim.style.opacity = String(opacity);
        }
      } else {
        const rubberBand = deltaY * 0.35;
        sheet.style.transform = `translateY(${rubberBand}px)`;
      }
    };
    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handleArea.classList.remove("pressed");
      const deltaY = currentY - startY;
      const elapsed = performance.now() - startTime || 1;
      const velocityY = deltaY / elapsed;
      if (deltaY > 80 || velocityY > 0.4) {
        sheet.style.transition = "transform 0.2s cubic-bezier(0.3, 0, 0, 1)";
        sheet.style.transform = "translateY(100%)";
        if (scrim) {
          scrim.style.transition = "opacity 0.2s linear";
          scrim.style.opacity = "0";
        }
        setTimeout(() => {
          this.open = false;
          sheet.style.transform = "";
          sheet.style.transition = "";
          if (scrim) {
            scrim.style.opacity = "";
            scrim.style.transition = "";
          }
          this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
        }, 200);
      } else {
        sheet.style.transition = "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)";
        sheet.style.transform = "translateY(0px)";
        if (scrim) {
          scrim.style.transition = "opacity 0.2s linear";
          scrim.style.opacity = "0.32";
        }
        setTimeout(() => {
          sheet.style.transition = "";
          if (scrim) {
            scrim.style.transition = "";
            scrim.style.opacity = "";
          }
        }, 260);
      }
    };
    handleArea.addEventListener("pointerdown", onPointerDown, { signal });
    handleArea.addEventListener("pointermove", onPointerMove, { signal });
    handleArea.addEventListener("pointerup", onPointerUp, { signal });
    handleArea.addEventListener("pointercancel", onPointerUp, { signal });
  }
};
if (!customElements.get("md-bottom-sheet")) {
  customElements.define("md-bottom-sheet", MdBottomSheet);
}

// src/components/md-snackbar.js
var defaultStyle15 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; outline: none; display: contents; }
  :host(:not([open])) .snackbar { display: none; }

  .snackbar {
    box-sizing: border-box;
    position: fixed;
    bottom: 24px;
    left: 0;
    right: 0;
    margin: 0 auto;
    width: fit-content;
    max-width: min(672px, calc(100vw - 32px));
    z-index: 2002;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    min-width: min(344px, calc(100vw - 32px));
    padding: 4px 8px 4px 16px;
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    background-color: var(--md-sys-color-inverse-surface, #322F35);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
  }

  @media (max-width: 599px) {
    .snackbar {
      bottom: calc(80px + 16px) !important;
      max-width: calc(100vw - 32px) !important;
      min-width: 0 !important;
      width: fit-content !important;
      margin: 0 auto !important;
    }
  }
  :host([two-line]) .snackbar {
    min-height: 68px;
    align-items: flex-start;
    padding-top: 12px;
  }

  .message {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
  }

  .action {
    flex: 0 0 auto;
    min-width: 48px; min-height: 48px;
    padding: 0 12px;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-inverse-primary, #D0BCFF);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    cursor: pointer;
    outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .action[hidden] { display: none; }
  .action:hover { background-color: color-mix(in srgb, var(--md-sys-color-inverse-primary, #D0BCFF) 8%, transparent); }
  .action.pressed { background-color: color-mix(in srgb, var(--md-sys-color-inverse-primary, #D0BCFF) 12%, transparent); }
  .action:focus-visible {
    outline: 3px solid var(--md-sys-color-inverse-primary, #D0BCFF);
    outline-offset: 2px;
  }

  .close {
    flex: 0 0 auto;
    width: 48px; height: 48px;
    display: inline-flex; align-items: center; justify-content: center;
    border: none; background: transparent; cursor: pointer; outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .close:hover { background-color: color-mix(in srgb, var(--md-sys-color-inverse-on-surface, #F5EFF7) 8%, transparent); }
  .close.pressed { background-color: color-mix(in srgb, var(--md-sys-color-inverse-on-surface, #F5EFF7) 12%, transparent); }
  .close:focus-visible {
    outline: 3px solid var(--md-sys-color-inverse-primary, #D0BCFF);
    outline-offset: 2px;
  }

  .material-symbols-rounded {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-size: 24px;
    line-height: 1;
  }
`;
var snackbarSheet = createComponentSheet(defaultStyle15);
var MdSnackbar = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "open",
      "message",
      "action-label",
      "timeout",
      "two-line",
      "action-on-new-line",
      "container-color",
      "content-color",
      "action-content-color",
      "dismiss-action-content-color"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, snackbarSheet);
    this._rendered = false;
    this._timer = null;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    v ? this.setAttribute("open", "") : this.removeAttribute("open");
  }
  get timeout() {
    return parseInt(this.getAttribute("timeout") || "4000", 10);
  }
  get actionOnNewLine() {
    return this.hasAttribute("action-on-new-line");
  }
  set actionOnNewLine(v) {
    if (v) this.setAttribute("action-on-new-line", "");
    else this.removeAttribute("action-on-new-line");
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get actionContentColor() {
    return this.getAttribute("action-content-color") || "";
  }
  set actionContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("action-content-color");
    else this.setAttribute("action-content-color", v);
  }
  get dismissActionContentColor() {
    return this.getAttribute("dismiss-action-content-color") || "";
  }
  set dismissActionContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("dismiss-action-content-color");
    else this.setAttribute("dismiss-action-content-color", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this.setupInteractions();
    if (this.open) this._activate();
  }
  disconnectedCallback() {
    this._deactivate();
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "open") {
      this.open ? this._activate() : this._deactivate();
    } else if (name === "message") {
      const m = this.shadowRoot.querySelector(".message");
      if (m) m.textContent = newV || "";
    } else if (name === "action-label") {
      const a = this.shadowRoot.querySelector(".action");
      if (a) {
        a.textContent = newV || "";
        a.hidden = !newV;
      }
    }
  }
  show(message) {
    if (message != null) {
      this.setAttribute("message", message);
      const m = this.shadowRoot?.querySelector(".message");
      if (m) m.textContent = message;
    }
    this.open = true;
    this._activate();
  }
  close(reason = "timeout") {
    this.open = false;
    this.dispatchEvent(new CustomEvent("close", { detail: { reason }, bubbles: true, composed: true }));
  }
  render() {
    const actionLabel = this.getAttribute("action-label") || "";
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle15}</style>`}
      <div class="snackbar" role="status" aria-live="polite">
        <span class="message">${escapeHtml(this.getAttribute("message"))}</span>
        <button class="action" type="button" ${actionLabel ? "" : "hidden"}
          aria-label="${escapeHtml(actionLabel || "Action")}">${escapeHtml(actionLabel)}</button>
        <button class="close" type="button" aria-label="Dismiss">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
    `;
  }
  _activate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.addEventListener("keydown", this._onKeydown);
    const bar = this.shadowRoot.querySelector(".snackbar");
    if (bar) SpringPhysics.animateProperty(bar, "scale", 0.9, 1, "expressiveSpatialMedium");
    if (this._timer) clearTimeout(this._timer);
    if (this.timeout > 0) this._timer = setTimeout(() => this.close("timeout"), this.timeout);
  }
  _deactivate() {
    document.removeEventListener("keydown", this._onKeydown);
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close("escape");
    }
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const action = this.shadowRoot.querySelector(".action");
    const close = this.shadowRoot.querySelector(".close");
    if (action) {
      bindPress(action, {
        onPress: () => pressScale(action, 0.93, "expressiveSpatialFast"),
        onRelease: () => releaseScale(action, 0.93, "expressiveSpatialMedium"),
        onActivate: () => {
          this.dispatchEvent(new CustomEvent("action", { bubbles: true, composed: true }));
          this.close("action");
        },
        signal
      });
    }
    if (close) {
      bindPress(close, {
        onPress: () => pressScale(close, 0.93, "expressiveSpatialFast"),
        onRelease: () => releaseScale(close, 0.93, "expressiveSpatialMedium"),
        onActivate: () => this.close("dismiss"),
        signal
      });
    }
  }
};
if (!customElements.get("md-snackbar")) {
  customElements.define("md-snackbar", MdSnackbar);
}

// src/components/md-tooltip.js
var defaultStyle16 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: contents;
  }

  .tip {
    box-sizing: border-box;
    position: fixed;
    top: 0;
    left: 0;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    z-index: 10000;
    font-family: var(--md-sys-typescale-font-family, Roboto, sans-serif);
    transition:
      opacity var(--md-sys-motion-duration-short1, 100ms) cubic-bezier(0.4, 0, 1, 1),
      transform var(--md-sys-motion-duration-short1, 100ms) cubic-bezier(0.4, 0, 1, 1),
      visibility var(--md-sys-motion-duration-short1, 100ms);
    will-change: opacity, transform;
  }

  .tip.top {
    transform-origin: center bottom;
    transform: translate(-50%, calc(-100% + 4px)) scale(0.92);
  }

  .tip.bottom {
    transform-origin: center top;
    transform: translate(-50%, -4px) scale(0.92);
  }

  .tip.open {
    opacity: 1;
    visibility: visible;
    transition:
      opacity var(--md-sys-motion-duration-short2, 150ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      transform var(--md-sys-motion-duration-short2, 150ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.2, 0, 0, 1)),
      visibility var(--md-sys-motion-duration-short2, 150ms);
  }

  .tip.top.open {
    transform: translate(-50%, -100%) scale(1);
  }

  .tip.bottom.open {
    transform: translate(-50%, 0) scale(1);
  }

  /* Plain Tooltip */
  .tip.plain {
    background-color: var(--md-sys-color-inverse-surface, #322F35);
    color: var(--md-sys-color-inverse-on-surface, #F5EFF7);
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    font: var(--md-sys-typescale-body-small, 400 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    padding: 4px 8px;
    white-space: nowrap;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px 1px rgba(0,0,0,0.15));
  }

  /* Rich Tooltip */
  .tip.rich {
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
    padding: 12px 16px;
    max-width: 320px;
    white-space: normal;
    box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px 2px rgba(0,0,0,0.15));
  }

  .headline {
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-small-tracking, 0.1px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    margin-bottom: 4px;
  }

  /* Caret Arrow */
  .tip.has-caret::after {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
  }
  .tip.has-caret.top::after {
    top: 100%;
    border-top-color: var(--md-sys-color-inverse-surface, #322F35);
  }
  .tip.rich.has-caret.top::after {
    border-top-color: var(--md-sys-color-surface-container, #F3EDF7);
  }
  .tip.has-caret.bottom::after {
    bottom: 100%;
    border-bottom-color: var(--md-sys-color-inverse-surface, #322F35);
  }
  .tip.rich.has-caret.bottom::after {
    border-bottom-color: var(--md-sys-color-surface-container, #F3EDF7);
  }

  .actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
`;
var tooltipSheet = createComponentSheet(defaultStyle16);
var MdTooltip = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "variant",
      "text",
      "headline",
      "open",
      "for",
      "placement",
      "caret",
      "focusable",
      "enable-user-input",
      "has-action",
      "max-width",
      "content-color",
      "container-color"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, tooltipSheet);
    this._rendered = false;
    this._target = null;
    this._boundHandlers = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._bindTarget();
  }
  disconnectedCallback() {
    this._unbindTarget();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "for") {
      this._unbindTarget();
      this._bindTarget();
    } else if (name === "container-color" || name === "content-color" || name === "max-width" || name === "variant") {
      this.render();
    }
    this._sync();
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "plain");
  }
  // 'plain' | 'rich'
  get text() {
    return this.getAttribute("text") || "";
  }
  get placement() {
    return sanitizeAttribute(this.getAttribute("placement") || "top");
  }
  // 'top' | 'bottom'
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    if (v) {
      this._position();
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
  }
  get headline() {
    return this.getAttribute("headline") || "";
  }
  set headline(v) {
    this.setAttribute("headline", v);
  }
  get caret() {
    return this.hasAttribute("caret");
  }
  set caret(v) {
    if (v) this.setAttribute("caret", "");
    else this.removeAttribute("caret");
  }
  get focusable() {
    return this.hasAttribute("focusable");
  }
  set focusable(v) {
    if (v) this.setAttribute("focusable", "");
    else this.removeAttribute("focusable");
  }
  get enableUserInput() {
    return this.getAttribute("enable-user-input") !== "false";
  }
  set enableUserInput(v) {
    if (v) this.setAttribute("enable-user-input", "true");
    else this.setAttribute("enable-user-input", "false");
  }
  get hasAction() {
    return this.hasAttribute("has-action");
  }
  set hasAction(v) {
    if (v) this.setAttribute("has-action", "");
    else this.removeAttribute("has-action");
  }
  get maxWidth() {
    return this.getAttribute("max-width") || "200px";
  }
  set maxWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("max-width");
    else this.setAttribute("max-width", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  _unbindTarget() {
    if (!this._target || !this._boundHandlers) return;
    this._target.removeEventListener("pointerenter", this._boundHandlers.show);
    this._target.removeEventListener("pointerleave", this._boundHandlers.hide);
    this._target.removeEventListener("mouseenter", this._boundHandlers.show);
    this._target.removeEventListener("mouseleave", this._boundHandlers.hide);
    this._target.removeEventListener("focusin", this._boundHandlers.show);
    this._target.removeEventListener("focusout", this._boundHandlers.hide);
    window.removeEventListener("keydown", this._boundHandlers.onKey);
    this._target = null;
  }
  _bindTarget() {
    const id = this.getAttribute("for");
    const rootNode = this.getRootNode();
    this._target = id ? rootNode.getElementById ? rootNode.getElementById(id) : document.getElementById(id) : this.previousElementSibling;
    if (!this._target) return;
    const show = () => {
      this.open = true;
    };
    const hide = () => {
      this.open = false;
    };
    const onKey = (e) => {
      if (e.key === "Escape" && this.open) {
        this.open = false;
      }
    };
    this._boundHandlers = { show, hide, onKey };
    this._target.addEventListener("pointerenter", show);
    this._target.addEventListener("pointerleave", hide);
    this._target.addEventListener("mouseenter", show);
    this._target.addEventListener("mouseleave", hide);
    this._target.addEventListener("focusin", show);
    this._target.addEventListener("focusout", hide);
    window.addEventListener("keydown", onKey);
    const tooltipId = this.id || (this.id = "tt-" + Math.random().toString(36).slice(2, 9));
    this._target.setAttribute("aria-describedby", tooltipId);
  }
  _position() {
    if (!this._target) return;
    const tip = this.shadowRoot.querySelector(".tip");
    if (!tip) return;
    const rect = this._target.getBoundingClientRect();
    const isBottom = this.placement === "bottom";
    const top = isBottom ? rect.bottom + 8 : rect.top - 8;
    const left = rect.left + rect.width / 2;
    tip.style.position = "fixed";
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }
  _sync() {
    const tip = this.shadowRoot.querySelector(".tip");
    const txt = this.shadowRoot.querySelector(".txt");
    const headEl = this.shadowRoot.querySelector(".headline");
    if (!tip) return;
    tip.className = `tip ${this.variant}${this.open ? " open" : ""}${this.caret ? " has-caret" : ""} ${this.placement}`;
    if (txt && this.text) txt.textContent = this.text;
    if (headEl && this.headline) headEl.textContent = this.headline;
    if (this.open) {
      this._position();
    }
  }
  render() {
    const hasHead = !!this.headline;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle16}</style>`}
      <div class="tip ${escapeHtml(this.variant)}" role="tooltip" id="${escapeHtml(this.id)}">
        ${hasHead ? `<div class="headline">${escapeHtml(this.headline)}</div>` : ""}
        <span class="txt">${escapeHtml(this.text)}</span>
        <slot></slot>
        <div class="actions"><slot name="action"></slot></div>
      </div>
    `;
    this._sync();
  }
};
if (!customElements.get("md-tooltip")) {
  customElements.define("md-tooltip", MdTooltip);
}

// src/components/md-badge.js
var defaultStyle17 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: inline-flex;
    outline: none;
    vertical-align: middle;
    position: relative;
    pointer-events: none;
  }

  .badge {
    box-sizing: border-box;
    background-color: var(--md-sys-color-error, #B3261E);
    color: var(--md-sys-color-on-error, #FFFFFF);
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 6px;
    height: 6px;
    padding: 0;
    pointer-events: none;
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-small-size, 11px);
    font-weight: var(--md-sys-typescale-label-small-weight, 500);
    line-height: 1;
    user-select: none;
  }

  .badge.numeric {
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
  }
`;
var badgeSheet = createComponentSheet(defaultStyle17);
var MdBadge = class extends HTMLElement {
  static get observedAttributes() {
    return ["label", "max", "container-color", "content-color"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, badgeSheet);
    this._rendered = false;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._sync();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }
  get label() {
    return this.getAttribute("label") || "";
  }
  set label(val) {
    if (val === null || val === void 0) this.removeAttribute("label");
    else this.setAttribute("label", val);
  }
  get max() {
    const m = parseInt(this.getAttribute("max"), 10);
    return isNaN(m) ? 99 : m;
  }
  set max(val) {
    if (val === null || val === void 0) this.removeAttribute("max");
    else this.setAttribute("max", String(val));
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(val) {
    if (val === null || val === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", val);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(val) {
    if (val === null || val === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", val);
  }
  _displayText() {
    if (!this.label) return "";
    const num = parseInt(this.label, 10);
    if (!isNaN(num) && num > this.max) {
      return `${this.max}+`;
    }
    return this.label;
  }
  _sync() {
    const b = this.shadowRoot.querySelector(".badge");
    const t = this.shadowRoot.querySelector(".txt");
    if (!b || !t) return;
    const isNumeric = Boolean(this.label);
    b.className = `badge ${isNumeric ? "numeric" : "dot"}`;
    t.textContent = this._displayText();
    b.setAttribute("aria-label", isNumeric ? `${this.label} notifications` : "New notification");
    if (this.containerColor) b.style.backgroundColor = this.containerColor;
    else b.style.backgroundColor = "";
    if (this.contentColor) b.style.color = this.contentColor;
    else b.style.color = "";
  }
  render() {
    const isNumeric = Boolean(this.label);
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle17}</style>`}
      <span class="badge ${isNumeric ? "numeric" : "dot"}" role="status" aria-label="${escapeHtml(isNumeric ? this.label + " notifications" : "New notification")}">
        <span class="txt">${escapeHtml(this._displayText())}</span>
      </span>
    `;
  }
};
if (!customElements.get("md-badge")) {
  customElements.define("md-badge", MdBadge);
}

// src/components/md-top-app-bar.js
var defaultStyle18 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; display: block; outline: none; width: 100%; }

  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    width: 100%;
    /* CornerNone(0) \u2014 AppBarTokens.ContainerShape */
    border-radius: 0;
    padding: 0 4px; /* Leading/Trailing space 4dp */
    background-color: var(--md-sys-color-surface, #FEF7FF);
    color: var(--md-sys-color-on-surface, #1D1B20);
    box-shadow: none;
    user-select: none;
    -webkit-user-select: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }

  /* Scrolled: surface -> surface-container + elevation L2 */
  :host([scrolled]) .bar {
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
  }

  /* Small (center-aligned) 64dp */
  .bar[data-variant="small"] { min-height: 64px; align-items: center; }
  .bar[data-variant="small"] .titles { text-align: center; }
  .bar[data-variant="small"] .headline {
    font: var(--md-sys-typescale-title-large, 400 22px/28px Roboto, sans-serif);
  }
  .bar[data-variant="small"] .subtitle {
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
  }

  /* Medium 112dp */
  .bar[data-variant="medium"] { min-height: 112px; }
  .bar[data-variant="medium"] .headline {
    font: var(--md-sys-typescale-headline-small, 400 24px/32px Roboto, sans-serif);
  }

  /* Medium flexible 112dp, HeadlineMedium(28) + LabelLarge(14) */
  .bar[data-variant="medium-flexible"] { min-height: 112px; }
  .bar[data-variant="medium-flexible"] .headline {
    font: var(--md-sys-typescale-headline-medium, 400 28px/36px Roboto, sans-serif);
  }
  .bar[data-variant="medium-flexible"] .subtitle {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
  }

  /* Large 152dp */
  .bar[data-variant="large"] { min-height: 152px; }
  .bar[data-variant="large"] .headline {
    font: var(--md-sys-typescale-headline-medium, 400 28px/36px Roboto, sans-serif);
  }

  /* Large flexible 152dp, DisplaySmall(36) + TitleMedium(16) */
  .bar[data-variant="large-flexible"] { min-height: 152px; }
  .bar[data-variant="large-flexible"] .headline {
    font: var(--md-sys-typescale-display-small, 400 36px/44px Roboto, sans-serif);
  }
  .bar[data-variant="large-flexible"] .subtitle {
    font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
  }

  .leading, .trailing {
    display: flex;
    align-items: center;
    gap: 0; /* IconButtonSpace 0dp */
    min-height: 48px; /* touch target */
    flex: 0 0 auto;
  }
  .bar:not([data-variant="small"]) .leading,
  .bar:not([data-variant="small"]) .trailing { padding-top: 8px; }

  .titles {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding: 8px;
  }
  .bar:not([data-variant="small"]) .titles {
    align-self: flex-end;
    padding-bottom: 12px;
  }
  .headline {
    color: var(--md-sys-color-on-surface, #1D1B20);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subtitle {
    color: var(--md-sys-color-on-surface-variant, #49454F);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subtitle:empty { display: none; }

  /* Icon slot wrappers: 48x48 hit area, hover = CSS only */
  .icon-wrap {
    width: 48px; height: 48px;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: transparent;
    cursor: pointer;
    outline: none;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .icon-wrap:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .icon-wrap.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .icon-wrap:focus { outline: none; }
  .icon-wrap:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }
  .mat-sym {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', system-ui, sans-serif;
    font-size: 24px;
    line-height: 1;
    display: inline-block;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  ::slotted([slot="leading"]) { color: var(--md-sys-color-on-surface, #1D1B20); }
  ::slotted([slot="trailing"]) { color: var(--md-sys-color-on-surface-variant, #49454F); }
`;
var topAppBarSheet = createComponentSheet(defaultStyle18);
var MdTopAppBar = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "variant",
      "headline",
      "subtitle",
      "scrolled",
      "expanded-height",
      "collapsed-height",
      "title-horizontal-alignment",
      "container-color",
      "content-color",
      "horizontal-arrangement"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, topAppBarSheet);
    this._rendered = false;
    this._abortController = null;
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "small");
  }
  get headline() {
    return this.getAttribute("headline") || "";
  }
  get subtitle() {
    return this.getAttribute("subtitle") || "";
  }
  get scrolled() {
    return this.hasAttribute("scrolled");
  }
  set scrolled(v) {
    v ? this.setAttribute("scrolled", "") : this.removeAttribute("scrolled");
  }
  get expandedHeight() {
    const h = parseFloat(this.getAttribute("expanded-height"));
    return isNaN(h) ? 152 : h;
  }
  set expandedHeight(v) {
    if (v === null || v === void 0) this.removeAttribute("expanded-height");
    else this.setAttribute("expanded-height", String(v));
  }
  get collapsedHeight() {
    const h = parseFloat(this.getAttribute("collapsed-height"));
    return isNaN(h) ? 64 : h;
  }
  set collapsedHeight(v) {
    if (v === null || v === void 0) this.removeAttribute("collapsed-height");
    else this.setAttribute("collapsed-height", String(v));
  }
  get titleHorizontalAlignment() {
    return this.getAttribute("title-horizontal-alignment") || "center";
  }
  set titleHorizontalAlignment(v) {
    if (v === null || v === void 0) this.removeAttribute("title-horizontal-alignment");
    else this.setAttribute("title-horizontal-alignment", v);
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get horizontalArrangement() {
    return this.getAttribute("horizontal-arrangement") || "start";
  }
  set horizontalArrangement(v) {
    if (v === null || v === void 0) this.removeAttribute("horizontal-arrangement");
    else this.setAttribute("horizontal-arrangement", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "headline") {
      const h = this.shadowRoot.querySelector(".headline");
      if (h) h.textContent = newV || "";
    } else if (name === "subtitle") {
      const s = this.shadowRoot.querySelector(".subtitle");
      if (s) s.textContent = newV || "";
    } else if (name === "variant" || name === "container-color" || name === "content-color" || name === "expanded-height" || name === "collapsed-height") {
      this.render();
      this.setupInteractions();
    }
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle18}</style>`}
      <header class="bar" data-variant="${escapeHtml(this.variant)}" role="banner">
        <div class="leading">
          <slot name="leading">
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Navigation">
              <span class="mat-sym">menu</span>
            </span>
          </slot>
        </div>
        <div class="titles">
          <span class="headline">${escapeHtml(this.headline)}</span>
          <span class="subtitle">${escapeHtml(this.subtitle)}</span>
        </div>
        <div class="trailing">
          <slot name="trailing">
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Search">
              <span class="mat-sym">search</span>
            </span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="More options">
              <span class="mat-sym">more_vert</span>
            </span>
          </slot>
        </div>
      </header>
    `;
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    this.shadowRoot.querySelectorAll(".icon-wrap").forEach((el) => {
      let pressed = false;
      el.addEventListener("pointerdown", (e) => {
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add("pressed");
        SpringPhysics.animateProperty(el, "scale", 1, 0.92, "expressiveSpatialFast");
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.92, 1, "expressiveSpatialMedium");
      };
      el.addEventListener("pointerup", release, { signal });
      el.addEventListener("pointercancel", release, { signal });
      el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        el.classList.add("pressed");
        SpringPhysics.animateProperty(el, "scale", 1, 0.92, "expressiveSpatialFast");
      }, { signal });
      el.addEventListener("keyup", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.92, 1, "expressiveSpatialMedium");
        el.click();
      }, { signal });
    });
  }
};
if (!customElements.get("md-top-app-bar")) {
  customElements.define("md-top-app-bar", MdTopAppBar);
}

// src/components/md-bottom-app-bar.js
var defaultStyle19 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    outline: none;
    width: 100%;
    user-select: none;
    -webkit-user-select: none;
  }

  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    height: 80px;                 /* ContainerHeight 80dp */
    border-radius: 0;             /* CornerNone */
    padding: 0 16px;
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    user-select: none;
    -webkit-user-select: none;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1 1 auto;
  }

  .fab {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 0 0 auto;
  }

  .mat-sym {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', system-ui, sans-serif;
    font-size: 24px;
    line-height: 1;
    display: inline-block;
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }

  .icon-wrap {
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    cursor: pointer;
    outline: none;
    user-select: none;
    -webkit-user-select: none;
    transition: background-color 150ms ease, color 150ms ease;
  }
  .icon-wrap:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .icon-wrap:active {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 16%, transparent);
  }
  .icon-wrap:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -2px;
  }

  .fab-btn {
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    user-select: none;
    -webkit-user-select: none;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px rgba(0,0,0,0.2));
    transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 150ms ease;
  }
  .fab-btn:hover {
    box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px rgba(0,0,0,0.25));
  }
  .fab-btn:focus-visible {
    outline: 2px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }
`;
var bottomAppBarSheet = createComponentSheet(defaultStyle19);
var MdBottomAppBar = class extends HTMLElement {
  static get observedAttributes() {
    return ["container-color", "content-color", "horizontal-arrangement"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, bottomAppBarSheet);
    this._rendered = false;
    this._abortController = null;
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get horizontalArrangement() {
    return this.getAttribute("horizontal-arrangement") || "space-between";
  }
  set horizontalArrangement(v) {
    if (v === null || v === void 0) this.removeAttribute("horizontal-arrangement");
    else this.setAttribute("horizontal-arrangement", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    this.render();
    this.setupInteractions();
  }
  render() {
    const justify = this.horizontalArrangement === "start" ? "flex-start" : this.horizontalArrangement === "center" ? "center" : "space-between";
    const hasAdopted = !this.containerColor && !this.contentColor && this.horizontalArrangement === "space-between" && !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>
        :host {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          display: block;
          outline: none;
          width: 100%;
          user-select: none;
          -webkit-user-select: none;
        }

        .bar {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: ${justify};
          gap: 8px;
          width: 100%;
          height: 80px;                 /* ContainerHeight 80dp */
          border-radius: 0;             /* CornerNone */
          padding: 0 16px;
          background-color: ${this.containerColor || "var(--md-sys-color-surface-container, #F3EDF7)"};
          color: ${this.contentColor || "var(--md-sys-color-on-surface-variant, #49454F)"};
          box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
          user-select: none;
          -webkit-user-select: none;
        }

        .actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1 1 auto;
        }

        .fab {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex: 0 0 auto;
        }

        .mat-sym {
          font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', system-ui, sans-serif;
          font-size: 24px;
          line-height: 1;
          display: inline-block;
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }

        .icon-wrap {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          background-color: transparent;
          color: var(--md-sys-color-on-surface-variant, #49454F);
          cursor: pointer;
          outline: none;
          user-select: none;
          -webkit-user-select: none;
          transition: background-color 150ms ease, color 150ms ease;
        }
        .icon-wrap:hover {
          background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent);
          color: var(--md-sys-color-on-surface, #1D1B20);
        }
        .icon-wrap:active {
          background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 16%, transparent);
        }
        .icon-wrap:focus-visible {
          outline: 2px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: -2px;
        }

        .fab-btn {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background-color: var(--md-sys-color-primary-container, #EADDFF);
          color: var(--md-sys-color-on-primary-container, #21005D);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          outline: none;
          user-select: none;
          -webkit-user-select: none;
          box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px rgba(0,0,0,0.2));
          transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 150ms ease;
        }
        .fab-btn:hover {
          box-shadow: var(--md-sys-elevation-level-2, 0 2px 6px rgba(0,0,0,0.25));
        }
        .fab-btn:focus-visible {
          outline: 2px solid var(--md-sys-color-primary, #6750A4);
          outline-offset: 2px;
        }
      </style>`}
      <footer class="bar" role="contentinfo">
        <div class="actions">
          <slot>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Menu"><span class="mat-sym">menu</span></span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Search"><span class="mat-sym">search</span></span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Edit"><span class="mat-sym">edit</span></span>
            <span class="icon-wrap" tabindex="0" role="button" aria-label="Attachment"><span class="mat-sym">attach_file</span></span>
          </slot>
        </div>
        <div class="fab">
          <slot name="fab">
            <span class="fab-btn" role="button" tabindex="0" aria-label="Add">
              <span class="mat-sym">add</span>
            </span>
          </slot>
        </div>
      </footer>
    `;
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    this.shadowRoot.querySelectorAll(".icon-wrap").forEach((btn) => {
      bindPress(btn, {
        onPress: () => pressScale(btn, 0.88, "expressiveSpatialFast"),
        onRelease: () => releaseScale(btn, 0.88, "expressiveSpatialMedium"),
        signal
      });
      btn.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("action", {
          detail: { action: btn.getAttribute("aria-label") },
          bubbles: true,
          composed: true
        }));
      }, { signal });
    });
    const fab = this.shadowRoot.querySelector(".fab-btn");
    if (fab) {
      bindPress(fab, {
        onPress: () => pressScale(fab, 0.9, "expressiveSpatialFast"),
        onRelease: () => releaseScale(fab, 0.9, "expressiveSpatialMedium"),
        signal
      });
      fab.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("fab-click", { bubbles: true, composed: true }));
      }, { signal });
    }
  }
};
if (!customElements.get("md-bottom-app-bar")) {
  customElements.define("md-bottom-app-bar", MdBottomAppBar);
}

// src/components/md-navigation-bar.js
var defaultStyle20 = `
  :host { display: block; outline: none; width: 100%; user-select: none; -webkit-user-select: none; }
  :host([vertical]) { width: auto; height: 100%; }

  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 100%;
    height: 64px;                 /* NavigationBarTokens.ContainerHeight */
    border-radius: 0;             /* CornerNone */
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    gap: 0;                       /* item between space 0dp */
    user-select: none;
    -webkit-user-select: none;
  }
  :host([tall]) .bar { height: 80px; }          /* Tall (expressive) */
  :host([vertical]) .bar {
    flex-direction: column;
    justify-content: flex-start;
    width: auto;
    height: 100%;
    gap: 6px;                     /* vertical container between space 6dp */
    padding: 6px 4px;
  }

  .item {
    position: relative;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;                     /* active indicator icon-label space 4dp */
    min-width: 48px;
    min-height: 48px;             /* touch target */
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
    transition: color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  :host([vertical]) .item { flex: 0 0 auto; width: 56px; }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .item[disabled] { opacity: 0.38; cursor: not-allowed; }

  /* Active indicator: PILL (CornerFull) \u2014 expressive signature */
  .indicator {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;                 /* horizontal active indicator height */
    padding: 0 16px;              /* leading/trailing 16dp */
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: transparent;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  :host([vertical]) .indicator { height: 32px; width: 56px; padding: 0; }

  /* Hover = CSS only (state layer 0.08) */
  .item:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }
  .item.pressed:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent);
  }
  .item[aria-current="page"] .indicator {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
  }
  .item[aria-current="page"]:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 8%,
      var(--md-sys-color-secondary-container, #E8DEF8));
  }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px;              /* IconSize 24dp */
    width: 24px; height: 24px;
    line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .item[aria-current="page"] .icon { color: var(--md-sys-color-on-secondary-container, #1D192B); }

  .label {
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    white-space: nowrap;
  }
  .item[aria-current="page"] .label {
    color: var(--md-sys-color-secondary, #625B71);
    font: var(--md-sys-typescale-label-medium-emphasized, 700 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-emphasized-tracking, 0.5px);
  }
`;
var navigationBarSheet = createComponentSheet(defaultStyle20);
var MdNavigationBar = class extends HTMLElement {
  static get observedAttributes() {
    return ["items", "selected", "tall", "vertical", "container-color", "content-color", "enabled", "always-show-label"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, navigationBarSheet);
    this._rendered = false;
    this._abortController = null;
  }
  get items() {
    const raw = this.getAttribute("items");
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  get selected() {
    return parseInt(this.getAttribute("selected") || "0", 10) || 0;
  }
  set selected(i) {
    this.setAttribute("selected", String(i));
  }
  get vertical() {
    return this.hasAttribute("vertical");
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get enabled() {
    if (this.hasAttribute("disabled")) return false;
    return this.getAttribute("enabled") !== "false";
  }
  set enabled(v) {
    if (v) {
      this.removeAttribute("disabled");
      this.setAttribute("enabled", "true");
    } else {
      this.setAttribute("disabled", "");
      this.setAttribute("enabled", "false");
    }
  }
  get alwaysShowLabel() {
    return this.hasAttribute("always-show-label");
  }
  set alwaysShowLabel(v) {
    if (v) this.setAttribute("always-show-label", "");
    else this.removeAttribute("always-show-label");
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "selected") this._applySelection(true);
    else if (name === "items" || name === "container-color" || name === "content-color" || name === "always-show-label") {
      this.render();
      this.setupInteractions();
    }
  }
  render() {
    const items = this.items;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle20}</style>`}
      <nav class="bar" role="navigation" aria-label="${escapeHtml(this.getAttribute("aria-label") || "Main navigation")}">
        ${items.map((it, i) => `
          <button class="item" type="button" role="link" data-index="${i}"
            ${i === this.selected ? 'aria-current="page"' : ""}
            aria-label="${escapeHtml(it.label || "")}">
            <span class="indicator"><span class="icon material-symbols-rounded">${escapeHtml(it.icon || "")}</span></span>
            <span class="label">${escapeHtml(it.label || "")}</span>
          </button>
        `).join("")}
      </nav>
    `;
  }
  _applySelection(animate) {
    const items = [...this.shadowRoot.querySelectorAll(".item")];
    items.forEach((el, i) => {
      const active = i === this.selected;
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
      if (active && animate) {
        const pill = el.querySelector(".indicator");
        if (pill) SpringPhysics.animateProperty(pill, "scale", 0.8, 1, "expressiveSpatialMedium");
      }
    });
  }
  _select(i) {
    if (this.selected === i) return;
    this.selected = i;
    this.dispatchEvent(new CustomEvent("change", { detail: { index: i }, bubbles: true, composed: true }));
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const items = [...this.shadowRoot.querySelectorAll(".item")];
    items.forEach((el, i) => {
      let pressed = false;
      el.addEventListener("pointerdown", (e) => {
        if (el.hasAttribute("disabled")) return;
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add("pressed");
        SpringPhysics.animateProperty(el, "scale", 1, 0.94, "expressiveSpatialFast");
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.94, 1, "expressiveSpatialMedium");
      };
      el.addEventListener("pointerup", release, { signal });
      el.addEventListener("pointercancel", release, { signal });
      el.addEventListener("click", () => this._select(i), { signal });
      el.addEventListener("keydown", (e) => {
        const last = items.length - 1;
        if (e.key === "Enter" || e.key === " ") {
          el.classList.add("pressed");
          SpringPhysics.animateProperty(el, "scale", 1, 0.94, "expressiveSpatialFast");
          return;
        }
        let next = -1;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = last;
        if (next >= 0) {
          e.preventDefault();
          items[next].focus();
        }
      }, { signal });
      el.addEventListener("keyup", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.94, 1, "expressiveSpatialMedium");
      }, { signal });
    });
  }
};
if (!customElements.get("md-navigation-bar")) {
  customElements.define("md-navigation-bar", MdNavigationBar);
}

// src/components/md-navigation-drawer.js
var defaultStyle21 = `
  :host { outline: none; display: block; width: 100%; max-width: 320px; user-select: none; -webkit-user-select: none; }
  :host(:not([open])[modal]) .scrim,
  :host(:not([open])[modal]) .drawer { display: none; }

  .scrim {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-scrim, #000);
    opacity: 0.32;
    z-index: 1000;
    border: none;
    padding: 0;
  }
  :host(:not([modal])) .scrim { display: none; }

  .drawer {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 100%;
    padding: 12px;
    border-radius: var(--md-sys-shape-corner-large, 16px);
    background-color: var(--md-sys-color-surface-container-low, #1D1B22);
    border: 1px solid var(--md-sys-color-outline-variant, #49454F);
    box-shadow: none;
    overflow-y: auto;
    user-select: none;
    -webkit-user-select: none;
  }
  :host([modal]) .drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-start: 0;
    width: 360px;
    max-width: 100vw;
    height: 100%;
    border-radius: 0 var(--md-sys-shape-corner-large, 16px) var(--md-sys-shape-corner-large, 16px) 0;
    border: none;
    z-index: 1001;
    background-color: var(--md-sys-color-surface-container-low, #1D1B22);
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15));
  }

  .headline {
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    padding: 16px 16px 16px;
  }
  .headline:empty { display: none; }

  .item {
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 336px;             /* active indicator width 336dp */
    height: 56px;                 /* active indicator height 56dp */
    min-height: 48px;
    padding: 0 16px;
    border: none;
    text-align: start;
    cursor: pointer;
    outline: none;
    /* Active indicator: pill (CornerFull) */
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .item:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .item.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .item[aria-current="page"] { background-color: var(--md-sys-color-secondary-container, #E8DEF8); }
  .item[aria-current="page"]:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 8%,
      var(--md-sys-color-secondary-container, #E8DEF8));
  }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }
  .item[disabled] { opacity: 0.38; cursor: not-allowed; }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }
  .item[aria-current="page"] .icon,
  .item[aria-current="page"] .label { color: var(--md-sys-color-on-secondary-container, #1D192B); }
  .label {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    color: inherit;
  }
  .badge {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
`;
var navigationDrawerSheet = createComponentSheet(defaultStyle21);
var MdNavigationDrawer = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "items",
      "selected",
      "open",
      "modal",
      "headline",
      "gestures-enabled",
      "scrim-color",
      "drawer-container-color",
      "drawer-content-color"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, navigationDrawerSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }
  get items() {
    const raw = this.getAttribute("items");
    if (raw) {
      const parsed = safeJsonParse(raw, null);
      if (Array.isArray(parsed)) return parsed;
    }
    return [
      { icon: "inbox", label: "Inbox", badge: "12" },
      { icon: "star", label: "Starred" },
      { icon: "send", label: "Sent" },
      { icon: "drafts", label: "Drafts" }
    ];
  }
  get selected() {
    return parseInt(this.getAttribute("selected") || "0", 10) || 0;
  }
  set selected(i) {
    this.setAttribute("selected", String(i));
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    v ? this.setAttribute("open", "") : this.removeAttribute("open");
  }
  get modal() {
    return this.hasAttribute("modal");
  }
  get gesturesEnabled() {
    return this.getAttribute("gestures-enabled") !== "false";
  }
  set gesturesEnabled(v) {
    if (v) this.setAttribute("gestures-enabled", "true");
    else this.setAttribute("gestures-enabled", "false");
  }
  get scrimColor() {
    return this.getAttribute("scrim-color") || "";
  }
  set scrimColor(v) {
    if (v === null || v === void 0) this.removeAttribute("scrim-color");
    else this.setAttribute("scrim-color", v);
  }
  get drawerContainerColor() {
    return this.getAttribute("drawer-container-color") || "";
  }
  set drawerContainerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("drawer-container-color");
    else this.setAttribute("drawer-container-color", v);
  }
  get drawerContentColor() {
    return this.getAttribute("drawer-content-color") || "";
  }
  set drawerContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("drawer-content-color");
    else this.setAttribute("drawer-content-color", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
    if (this.open) this._activate();
  }
  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown);
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "open") {
      this.open ? this._activate() : this._deactivate();
    } else if (name === "selected") this._applySelection(true);
    else if (name === "items" || name === "headline" || name === "scrim-color" || name === "drawer-container-color" || name === "drawer-content-color") {
      this.render();
      this.setupInteractions();
    }
  }
  show() {
    this.open = true;
  }
  close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }
  render() {
    const items = this.items;
    const headline = this.getAttribute("headline") || "";
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle21}</style>`}
      <div class="scrim" part="scrim"></div>
      <nav class="drawer" role="${this.modal ? "dialog" : "navigation"}"
        ${this.modal ? 'aria-modal="true"' : ""}
        aria-label="${escapeHtml(this.getAttribute("aria-label") || "Navigation drawer")}">
        <div class="headline">${escapeHtml(headline)}</div>
        ${items.map((it, i) => `
          <button class="item" type="button" role="link" data-index="${i}"
            ${i === this.selected ? 'aria-current="page"' : ""}>
            <span class="icon material-symbols-rounded">${escapeHtml(it.icon || "")}</span>
            <span class="label">${escapeHtml(it.label || "")}</span>
            ${it.badge ? `<span class="badge">${escapeHtml(it.badge)}</span>` : ""}
          </button>
        `).join("")}
        <slot></slot>
      </nav>
    `;
  }
  _focusable() {
    const drawer = this.shadowRoot.querySelector(".drawer");
    return [...drawer.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href],input,select,textarea')];
  }
  _activate() {
    if (!this.modal) return;
    document.removeEventListener("keydown", this._onKeydown);
    document.addEventListener("keydown", this._onKeydown);
    const f = this._focusable();
    if (f.length) f[0].focus();
    const drawer = this.shadowRoot.querySelector(".drawer");
    if (drawer) SpringPhysics.animateProperty(drawer, "scale", 0.96, 1, "expressiveSpatialMedium");
  }
  _deactivate() {
    document.removeEventListener("keydown", this._onKeydown);
  }
  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === "Tab") {
      const f = this._focusable();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const active = this.shadowRoot.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  _applySelection(animate) {
    [...this.shadowRoot.querySelectorAll(".item")].forEach((el, i) => {
      const active = i === this.selected;
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
  }
  _select(i) {
    if (this.selected === i) return;
    this.selected = i;
    this.dispatchEvent(new CustomEvent("change", { detail: { index: i }, bubbles: true, composed: true }));
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) scrim.addEventListener("click", () => this.close(), { signal });
    const items = [...this.shadowRoot.querySelectorAll(".item")];
    items.forEach((el, i) => {
      let pressed = false;
      el.addEventListener("pointerdown", (e) => {
        if (el.hasAttribute("disabled")) return;
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add("pressed");
        SpringPhysics.animateProperty(el, "scale", 1, 0.97, "expressiveSpatialFast");
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.97, 1, "expressiveSpatialMedium");
      };
      el.addEventListener("pointerup", release, { signal });
      el.addEventListener("pointercancel", release, { signal });
      el.addEventListener("click", () => this._select(i), { signal });
      el.addEventListener("keydown", (e) => {
        const last = items.length - 1;
        if (e.key === "Enter" || e.key === " ") {
          el.classList.add("pressed");
          SpringPhysics.animateProperty(el, "scale", 1, 0.97, "expressiveSpatialFast");
          return;
        }
        let next = -1;
        if (e.key === "ArrowDown") next = i === last ? 0 : i + 1;
        else if (e.key === "ArrowUp") next = i === 0 ? last : i - 1;
        if (next >= 0) {
          e.preventDefault();
          items[next].focus();
        }
      }, { signal });
      el.addEventListener("keyup", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.97, 1, "expressiveSpatialMedium");
      }, { signal });
    });
  }
};
if (!customElements.get("md-navigation-drawer")) {
  customElements.define("md-navigation-drawer", MdNavigationDrawer);
}

// src/components/md-navigation-rail.js
var defaultStyle22 = `
  :host { display: inline-block; outline: none; user-select: none; -webkit-user-select: none; }

  .rail {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 96px;                       /* Collapsed container width 96dp */
    padding: 16px 8px;
    gap: 12px;
    border-radius: var(--md-sys-shape-corner-large, 16px);
    background-color: var(--md-sys-color-surface-container-low, #1D1B22);
    border: 1px solid var(--md-sys-color-outline-variant, #49454F);
    box-shadow: none;                  /* Level0 */
    user-select: none;
    -webkit-user-select: none;
    transition:
      width var(--md-sys-motion-duration-medium2, 300ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9)),
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }
  :host([narrow]) .rail { width: 80px; }
  :host([expanded]) .rail {
    width: 360px;                      /* Expanded max (min 220dp) */
    min-width: 220px;
    border-radius: var(--md-sys-shape-corner-large, 16px); /* CornerLarge(16) modal */
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    gap: 6px;                          /* baseline item vertical space 6dp */
  }

  .header {
    min-height: 40px;                  /* Header space minimum 40dp */
    display: flex; align-items: center; justify-content: center;
    padding: 0 8px 4px;
  }
  .items { display: flex; flex-direction: column; gap: inherit; padding: 0 8px; }

  .item {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    gap: 8px;                          /* indicator icon-label space 8dp */
    min-height: 64px;                  /* item container height 64dp */
    min-width: 48px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    -webkit-tap-highlight-color: transparent;
  }
  .item.horizontal { flex-direction: row; justify-content: flex-start; }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .item[disabled] { opacity: 0.38; cursor: not-allowed; }

  /* Active indicator: pill (CornerFull) */
  .indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 32px;                      /* vertical item indicator 32dp */
    width: 56px;                       /* vertical item indicator width 56dp */
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: transparent;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .item.horizontal .indicator {
    height: 56px;                      /* horizontal item indicator 56dp */
    width: auto;
    flex: 1 1 auto;
    justify-content: flex-start;
    padding: 0 16px;                   /* leading/trailing 16dp */
  }

  /* Hover = CSS only; state layer = on-secondary-container */
  .item:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 8%, transparent);
  }
  .item.pressed:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 10%, transparent);
  }
  .item[aria-current="page"] .indicator {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
  }
  .item[aria-current="page"]:hover .indicator {
    background-color: color-mix(in srgb, var(--md-sys-color-on-secondary-container, #1D192B) 8%,
      var(--md-sys-color-secondary-container, #E8DEF8));
  }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .item[aria-current="page"] .icon { color: var(--md-sys-color-on-secondary-container, #1D192B); }

  .label {
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    white-space: nowrap;
  }
  .item.horizontal .label {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
  }
  .item[aria-current="page"] .label { color: var(--md-sys-color-on-secondary-container, #1D192B); }
`;
var navigationRailSheet = createComponentSheet(defaultStyle22);
var MdNavigationRail = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "items",
      "selected",
      "expanded",
      "narrow",
      "item-layout",
      "container-color",
      "content-color",
      "enabled",
      "always-show-label"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, navigationRailSheet);
    this._rendered = false;
    this._abortController = null;
  }
  get items() {
    const raw = this.getAttribute("items");
    if (raw) {
      const parsed = safeJsonParse(raw, null);
      if (Array.isArray(parsed)) return parsed;
    }
    return [
      { icon: "mail", label: "Mail" },
      { icon: "chat", label: "Chat" },
      { icon: "group", label: "Spaces" },
      { icon: "videocam", label: "Meet" }
    ];
  }
  get selected() {
    return parseInt(this.getAttribute("selected") || "0", 10) || 0;
  }
  set selected(i) {
    this.setAttribute("selected", String(i));
  }
  get expanded() {
    return this.hasAttribute("expanded");
  }
  set expanded(v) {
    v ? this.setAttribute("expanded", "") : this.removeAttribute("expanded");
  }
  get itemLayout() {
    return sanitizeAttribute(this.getAttribute("item-layout") || "vertical");
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get enabled() {
    if (this.hasAttribute("disabled")) return false;
    return this.getAttribute("enabled") !== "false";
  }
  set enabled(v) {
    if (v) {
      this.removeAttribute("disabled");
      this.setAttribute("enabled", "true");
    } else {
      this.setAttribute("disabled", "");
      this.setAttribute("enabled", "false");
    }
  }
  get alwaysShowLabel() {
    return this.hasAttribute("always-show-label");
  }
  set alwaysShowLabel(v) {
    if (v) this.setAttribute("always-show-label", "");
    else this.removeAttribute("always-show-label");
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "selected") this._applySelection(true);
    else if (name === "items" || name === "item-layout" || name === "container-color" || name === "content-color" || name === "always-show-label") {
      this.render();
      this.setupInteractions();
    }
  }
  render() {
    const items = this.items;
    const horizontal = this.itemLayout === "horizontal" || this.expanded;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle22}</style>`}
      <nav class="rail" role="navigation" aria-label="${escapeHtml(this.getAttribute("aria-label") || "Rail navigation")}">
        <div class="header"><slot name="header"></slot></div>
        <div class="items">
          ${items.map((it, i) => `
            <button class="item ${horizontal ? "horizontal" : ""}" type="button" role="link" data-index="${i}"
              ${i === this.selected ? 'aria-current="page"' : ""} aria-label="${escapeHtml(it.label || "")}">
              <span class="indicator">
                <span class="icon material-symbols-rounded">${escapeHtml(it.icon || "")}</span>
                ${horizontal ? `<span class="label">${escapeHtml(it.label || "")}</span>` : ""}
              </span>
              ${horizontal ? "" : `<span class="label">${escapeHtml(it.label || "")}</span>`}
            </button>
          `).join("")}
        </div>
        <slot></slot>
      </nav>
    `;
  }
  _applySelection(animate) {
    [...this.shadowRoot.querySelectorAll(".item")].forEach((el, i) => {
      const active = i === this.selected;
      if (active) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
      if (active && animate) {
        const pill = el.querySelector(".indicator");
        if (pill) SpringPhysics.animateProperty(pill, "scale", 0.85, 1, "expressiveSpatialMedium");
      }
    });
  }
  _select(i) {
    if (this.selected === i) return;
    this.selected = i;
    this.dispatchEvent(new CustomEvent("change", { detail: { index: i }, bubbles: true, composed: true }));
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const items = [...this.shadowRoot.querySelectorAll(".item")];
    items.forEach((el, i) => {
      let pressed = false;
      el.addEventListener("pointerdown", (e) => {
        if (el.hasAttribute("disabled")) return;
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add("pressed");
        SpringPhysics.animateProperty(el, "scale", 1, 0.94, "expressiveSpatialFast");
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.94, 1, "expressiveSpatialMedium");
      };
      el.addEventListener("pointerup", release, { signal });
      el.addEventListener("pointercancel", release, { signal });
      el.addEventListener("click", () => this._select(i), { signal });
      el.addEventListener("keydown", (e) => {
        const last = items.length - 1;
        if (e.key === "Enter" || e.key === " ") {
          el.classList.add("pressed");
          SpringPhysics.animateProperty(el, "scale", 1, 0.94, "expressiveSpatialFast");
          return;
        }
        let next = -1;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = i === last ? 0 : i + 1;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = last;
        if (next >= 0) {
          e.preventDefault();
          items[next].focus();
        }
      }, { signal });
      el.addEventListener("keyup", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.94, 1, "expressiveSpatialMedium");
      }, { signal });
    });
  }
};
if (!customElements.get("md-navigation-rail")) {
  customElements.define("md-navigation-rail", MdNavigationRail);
}

// src/components/md-segmented-button.js
var defaultStyle23 = `
  :host {
    display: inline-flex;
    outline: none;
    vertical-align: middle;
  }

  .container {
    display: inline-flex;
    align-items: center;
    height: 40px;
    min-height: 40px;
    border-radius: 9999px;
    border: 1px solid var(--md-sys-color-outline, #79747E);
    box-sizing: border-box;
    overflow: hidden;
    background-color: transparent;
  }

  .segment {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 16px;
    box-sizing: border-box;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-sys-typescale-label-large-weight, 500);
    line-height: var(--md-sys-typescale-label-large-line-height, 20px);
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    border-right: 1px solid var(--md-sys-color-outline, #79747E);
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
  }
  .segment:last-child {
    border-right: none;
  }
  .segment:focus { outline: none; }
  .segment:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -2px;
    z-index: 3;
  }

  .seg-content {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 100%;
    pointer-events: none;
    will-change: transform;
  }

  .segment::after {
    content: '';
    position: absolute;
    inset: calc((48px - 100%) / 2) 0;
    pointer-events: auto;
  }

  .segment::before {
    content: '';
    position: absolute;
    inset: 0;
    background: currentColor;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .segment:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .segment:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .segment.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  .segment.selected {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    color: var(--md-sys-color-on-secondary-container, #1D192B);
  }

  .segment.disabled {
    opacity: 0.38;
    cursor: not-allowed;
    pointer-events: none;
  }

  .ico {
    font-family: 'Material Symbols Outlined';
    font-size: 18px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
    pointer-events: none;
  }
`;
var segmentedButtonSheet = createComponentSheet(defaultStyle23);
var MdSegmentedButton = class extends HTMLElement {
  static get observedAttributes() {
    return ["selected-index", "selected-indices", "items", "multi-select", "disabled", "checked", "selected", "space"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, segmentedButtonSheet);
    this._rendered = false;
    this._selectedIndices = /* @__PURE__ */ new Set();
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this._parseInitialAttributes();
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "items" || name === "space") {
      this.render();
      this._setup();
    } else if (name === "selected-indices" && this.multiSelect) {
      this._parseSelectedIndices();
    } else if (name === "selected" || name === "checked") {
      const idx = parseInt(newVal, 10);
      if (!isNaN(idx)) this.selectedIndex = idx;
    }
    this._sync();
  }
  get selectedIndex() {
    const idx = parseInt(this.getAttribute("selected-index"), 10);
    return isNaN(idx) ? 0 : idx;
  }
  set selectedIndex(val) {
    this.setAttribute("selected-index", String(val));
  }
  get multiSelect() {
    return this.hasAttribute("multi-select");
  }
  set multiSelect(val) {
    if (val) this.setAttribute("multi-select", "");
    else this.removeAttribute("multi-select");
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get space() {
    const s = parseInt(this.getAttribute("space"), 10);
    return isNaN(s) ? 0 : s;
  }
  set space(val) {
    this.setAttribute("space", String(val));
  }
  get checked() {
    return this.selectedIndex;
  }
  set checked(val) {
    this.selectedIndex = val;
  }
  get selected() {
    return this.selectedIndex;
  }
  set selected(val) {
    this.selectedIndex = val;
  }
  get itemsList() {
    const raw = this.getAttribute("items");
    return safeJsonParse(raw, ["Segment 1", "Segment 2"]);
  }
  _parseInitialAttributes() {
    if (this.multiSelect) {
      this._parseSelectedIndices();
    } else {
      if (this.hasAttribute("selected") || this.hasAttribute("checked")) {
        const val = parseInt(this.getAttribute("selected") || this.getAttribute("checked"), 10);
        if (!isNaN(val)) this.selectedIndex = val;
      }
    }
  }
  _parseSelectedIndices() {
    const raw = this.getAttribute("selected-indices");
    const parsed = safeJsonParse(raw, []);
    this._selectedIndices = new Set(Array.isArray(parsed) ? parsed : []);
  }
  _sync() {
    const segments = this.shadowRoot.querySelectorAll(".segment");
    const isMulti = this.multiSelect;
    const currentIdx = this.selectedIndex;
    segments.forEach((seg, idx) => {
      let isSelected = false;
      if (isMulti) {
        isSelected = this._selectedIndices.has(idx);
      } else {
        isSelected = idx === currentIdx;
      }
      seg.setAttribute("aria-checked", isSelected ? "true" : "false");
      seg.setAttribute("aria-disabled", this.disabled ? "true" : "false");
      seg.tabIndex = this.disabled ? -1 : isSelected || !isMulti && currentIdx === 0 && idx === 0 ? 0 : -1;
      if (isSelected) seg.classList.add("selected");
      else seg.classList.remove("selected");
      if (this.disabled) seg.classList.add("disabled");
      else seg.classList.remove("disabled");
      const checkIco = seg.querySelector(".check-ico");
      const itemIco = seg.querySelector(".item-ico");
      if (checkIco) {
        checkIco.style.display = isSelected ? "inline-flex" : "none";
      }
      if (itemIco) {
        itemIco.style.display = isSelected ? "none" : "inline-flex";
      }
    });
  }
  _handleSegmentActivation(idx, seg) {
    if (this.multiSelect) {
      if (this._selectedIndices.has(idx)) {
        this._selectedIndices.delete(idx);
      } else {
        this._selectedIndices.add(idx);
      }
      this.setAttribute("selected-indices", JSON.stringify(Array.from(this._selectedIndices)));
      this._sync();
      this.dispatchEvent(new CustomEvent("change", {
        detail: { selectedIndices: Array.from(this._selectedIndices) },
        bubbles: true,
        composed: true
      }));
    } else {
      this.selectedIndex = idx;
      this._sync();
      const rawItem = this.itemsList[idx];
      const label = typeof rawItem === "object" && rawItem !== null ? rawItem.label || rawItem.text : rawItem;
      this.dispatchEvent(new CustomEvent("change", {
        detail: { selectedIndex: idx, label },
        bubbles: true,
        composed: true
      }));
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const segments = Array.from(this.shadowRoot.querySelectorAll(".segment"));
    segments.forEach((seg, idx) => {
      const content = seg.querySelector(".seg-content");
      const press = () => {
        if (content) pressScale(content, 0.92, "expressiveSpatialFast");
      };
      const release = () => {
        if (content) releaseScale(content, 0.92, "expressiveSpatialMedium");
      };
      seg.addEventListener("click", () => {
        if (this.disabled) return;
        this._handleSegmentActivation(idx, seg);
      }, { signal });
      bindPress(seg, {
        disabled: () => this.disabled,
        onPress: press,
        onRelease: release,
        signal
      });
      seg.addEventListener("keydown", (e) => {
        if (this.disabled) return;
        let targetIdx = idx;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          targetIdx = (idx + 1) % segments.length;
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          targetIdx = (idx - 1 + segments.length) % segments.length;
        } else {
          return;
        }
        e.preventDefault();
        segments[targetIdx]?.focus();
        if (!this.multiSelect) {
          this._handleSegmentActivation(targetIdx, segments[targetIdx]);
        }
      }, { signal });
    });
  }
  render() {
    const items = this.itemsList;
    const isMulti = this.multiSelect;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle23}</style>`}
      <div class="container" role="${isMulti ? "group" : "radiogroup"}" style="${this.space ? `gap: ${this.space}px;` : ""}">
        ${items.map((item) => {
      const icon = typeof item === "object" && item !== null ? item.icon : "";
      const label = typeof item === "object" && item !== null ? item.label || item.text || "" : String(item);
      return `
            <button class="segment" role="${isMulti ? "checkbox" : "radio"}" aria-checked="false" tabindex="-1">
              <span class="seg-content">
                <span class="ico check-ico" aria-hidden="true" style="display: none;">check</span>
                ${icon ? `<span class="ico item-ico" aria-hidden="true">${escapeHtml(icon)}</span>` : ""}
                <span class="label-text">${escapeHtml(label)}</span>
              </span>
            </button>
          `;
    }).join("")}
      </div>
    `;
  }
};
if (!customElements.get("md-segmented-button")) {
  customElements.define("md-segmented-button", MdSegmentedButton);
}

// src/components/md-dialog.js
var defaultStyle24 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; outline: none; display: contents; }
  :host(:not([open])) .scrim, :host(:not([open])) .dialog-container { display: none; }

  .scrim {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-scrim, #000);
    opacity: 0.32;
    z-index: 2000;
  }

  .dialog-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2001;
    pointer-events: none;
    padding: 24px;
    box-sizing: border-box;
  }

  .dialog {
    box-sizing: border-box;
    position: relative;
    pointer-events: auto;
    transform-origin: center center;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 280px;
    max-width: 560px;
    width: 100%;
    max-height: 80vh;
    padding: 24px;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
    overflow-y: auto;
  }

  .icon {
    align-self: center;
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    width: 24px;
    height: 24px;
    line-height: 24px;
    display: inline-block;
    color: var(--md-sys-color-secondary, #625B71);
  }
  .icon:empty { display: none; }

  .headline {
    font: var(--md-sys-typescale-headline-small, 400 24px/32px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #1D1B20);
    margin: 0;
  }
  .headline:empty { display: none; }

  .supporting {
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .supporting:empty { display: none; }

  .content { color: var(--md-sys-color-on-surface-variant, #49454F); }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 8px;
  }

  .action {
    min-width: 48px;
    min-height: 48px;
    padding: 0 12px;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-primary, #6750A4);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    cursor: pointer;
    outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .action:hover { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 8%, transparent); }
  .action.pressed { background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent); }
  .action:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }
`;
var dialogSheet = createComponentSheet(defaultStyle24);
var MdDialog = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "open",
      "headline",
      "supporting-text",
      "icon",
      "confirm-label",
      "cancel-label",
      "container-color",
      "icon-content-color",
      "title-content-color",
      "text-content-color"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, dialogSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    v ? this.setAttribute("open", "") : this.removeAttribute("open");
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get iconContentColor() {
    return this.getAttribute("icon-content-color") || "";
  }
  set iconContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("icon-content-color");
    else this.setAttribute("icon-content-color", v);
  }
  get titleContentColor() {
    return this.getAttribute("title-content-color") || "";
  }
  set titleContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("title-content-color");
    else this.setAttribute("title-content-color", v);
  }
  get textContentColor() {
    return this.getAttribute("text-content-color") || "";
  }
  set textContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("text-content-color");
    else this.setAttribute("text-content-color", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this.setupInteractions();
    if (this.open) this._activate();
  }
  disconnectedCallback() {
    this._deactivate();
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "open") {
      this.open ? this._activate() : this._deactivate();
    } else if (name === "headline") {
      const h = this.shadowRoot.querySelector(".headline");
      if (h) h.textContent = newV || "";
    } else if (name === "supporting-text") {
      const s = this.shadowRoot.querySelector(".supporting");
      if (s) s.textContent = newV || "";
    } else if (name === "icon") {
      const ico = this.shadowRoot.querySelector(".icon");
      if (ico) ico.textContent = newV || "";
    }
  }
  show() {
    this.open = true;
  }
  close(reason = "dismiss") {
    this.open = false;
    this.dispatchEvent(new CustomEvent("close", { detail: { reason }, bubbles: true, composed: true }));
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle24}</style>`}
      <div class="scrim" part="scrim"></div>
      <div class="dialog-container">
        <div class="dialog" role="dialog" aria-modal="true"
          aria-labelledby="dlg-headline" aria-describedby="dlg-supporting">
          <span class="icon material-symbols-rounded">${escapeHtml(this.getAttribute("icon"))}</span>
          <h2 class="headline" id="dlg-headline">${escapeHtml(this.getAttribute("headline"))}</h2>
          <div class="supporting" id="dlg-supporting">${escapeHtml(this.getAttribute("supporting-text"))}</div>
          <div class="content"><slot></slot></div>
          <div class="actions">
            <slot name="actions">
              <button class="action" type="button" data-action="cancel">${escapeHtml(this.getAttribute("cancel-label") || "Cancel")}</button>
              <button class="action" type="button" data-action="confirm">${escapeHtml(this.getAttribute("confirm-label") || "OK")}</button>
            </slot>
          </div>
        </div>
      </div>
    `;
  }
  _focusable() {
    const d = this.shadowRoot.querySelector(".dialog");
    if (!d) return [];
    const shadowFocusable = [...d.querySelectorAll(
      'button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    )];
    const slots = this.shadowRoot.querySelectorAll("slot");
    const slottedFocusable = [];
    slots.forEach((slot) => {
      slot.assignedElements({ flatten: true }).forEach((el) => {
        if (el.matches && el.matches("button, input, select, textarea, a[href], [tabindex]")) {
          slottedFocusable.push(el);
        }
        if (el.querySelectorAll) {
          slottedFocusable.push(...el.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), a[href]'));
        }
      });
    });
    return [...shadowFocusable, ...slottedFocusable];
  }
  _activate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.addEventListener("keydown", this._onKeydown);
    document.body.style.overflow = "hidden";
    const f = this._focusable();
    if (f.length) {
      setTimeout(() => f[f.length - 1]?.focus({ preventScroll: true }), 0);
    }
    const dialog = this.shadowRoot.querySelector(".dialog");
    if (dialog) SpringPhysics.animateProperty(dialog, "scale", 0.9, 1, "expressiveSpatialMedium");
  }
  _deactivate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.body.style.overflow = "";
  }
  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close("escape");
      return;
    }
    if (e.key === "Tab") {
      const f = this._focusable();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const active = this.shadowRoot.activeElement || document.activeElement;
      if (e.shiftKey && (active === first || active === this)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) {
      const onScrimDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close("scrim");
      };
      scrim.addEventListener("click", onScrimDismiss, { signal });
      scrim.addEventListener("pointerdown", onScrimDismiss, { signal });
      scrim.addEventListener("touchstart", onScrimDismiss, { signal, passive: false });
    }
    this.shadowRoot.querySelectorAll(".action").forEach((el) => {
      const press = () => {
        pressScale(el, 0.95, "expressiveSpatialFast");
      };
      const release = () => {
        releaseScale(el, 0.95, "expressiveSpatialMedium");
      };
      const activate = () => {
        const action = el.getAttribute("data-action") || "action";
        this.dispatchEvent(new CustomEvent(action, { bubbles: true, composed: true }));
        this.close(action);
      };
      bindPress(el, {
        onPress: press,
        onRelease: release,
        onActivate: activate,
        signal
      });
    });
  }
};
if (!customElements.get("md-dialog")) {
  customElements.define("md-dialog", MdDialog);
}

// src/components/md-divider.js
var defaultStyle25 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    outline: none;
  }
  :host([vertical]) {
    display: inline-block;
    height: 100%;
    align-self: stretch;
  }

  .line {
    height: 1px;
    width: 100%;
    border: 0;
    background-color: var(--md-sys-color-outline-variant, #CAC4D0);
    margin: 0;
    box-sizing: border-box;
  }

  .line.inset {
    margin-inline-start: 16px;
    margin-inline-end: 16px;
    width: auto;
  }

  .line.vertical {
    width: 1px;
    height: 100%;
    min-height: 24px;
  }
  .line.vertical.inset {
    margin-top: 8px;
    margin-bottom: 8px;
    margin-inline: 0;
    height: calc(100% - 16px);
  }
`;
var dividerSheet = createComponentSheet(defaultStyle25);
var MdDivider = class extends HTMLElement {
  static get observedAttributes() {
    return ["inset", "vertical", "thickness", "color"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, dividerSheet);
    this._rendered = false;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._sync();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }
  get inset() {
    return this.hasAttribute("inset");
  }
  set inset(val) {
    if (val) this.setAttribute("inset", "");
    else this.removeAttribute("inset");
  }
  get vertical() {
    return this.hasAttribute("vertical");
  }
  set vertical(val) {
    if (val) this.setAttribute("vertical", "");
    else this.removeAttribute("vertical");
  }
  get thickness() {
    const t = parseFloat(this.getAttribute("thickness"));
    return isNaN(t) || t <= 0 ? 1 : t;
  }
  set thickness(val) {
    if (val === null || val === void 0) this.removeAttribute("thickness");
    else this.setAttribute("thickness", String(val));
  }
  get color() {
    return this.getAttribute("color") || "";
  }
  set color(val) {
    if (val === null || val === void 0) this.removeAttribute("color");
    else this.setAttribute("color", val);
  }
  _sync() {
    const line = this.shadowRoot.querySelector(".line");
    if (!line) return;
    line.className = `line${this.inset ? " inset" : ""}${this.vertical ? " vertical" : ""}`;
    if (!this.vertical) {
      line.style.height = `${this.thickness}px`;
      line.style.width = "";
    } else {
      line.style.width = `${this.thickness}px`;
      line.style.height = "";
    }
    if (this.color) {
      line.style.backgroundColor = this.color;
    } else {
      line.style.backgroundColor = "";
    }
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle25}</style>`}
      <hr class="line${this.inset ? " inset" : ""}${this.vertical ? " vertical" : ""}" aria-hidden="true">
    `;
  }
};
if (!customElements.get("md-divider")) {
  customElements.define("md-divider", MdDivider);
}

// src/components/md-carousel.js
var defaultStyle26 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    width: 100%;
    outline: none;
    user-select: none;
    box-sizing: border-box;
  }

  .carousel-container {
    position: relative;
    width: 100%;
    overflow: hidden;
    padding: 8px 0;
  }

  .carousel-track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    padding: 8px 16px;
    align-items: center;
    -webkit-overflow-scrolling: touch;
  }
  .carousel-track::-webkit-scrollbar { display: none; }

  .carousel-card {
    position: relative;
    flex-shrink: 0;
    height: 280px;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    cursor: pointer;
    outline: none;
    overflow: hidden;
    scroll-snap-align: start;
    transition:
      width var(--md-sys-motion-duration-long3, 650ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.35, 1.2, 0.25, 1.0)),
      box-shadow var(--md-sys-motion-duration-medium1, 300ms) ease;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 24px;
    box-sizing: border-box;
    color: #FFFFFF;
  }
  .carousel-card:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  /* Responsive Focal Widths (Multi-Browse Spec \xA78) */
  .carousel-card.hero {
    width: 280px;
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.2));
  }
  .carousel-card.medium {
    width: 160px;
  }
  .carousel-card.small {
    width: 76px;
  }

  .card-bg {
    position: absolute;
    inset: 0;
    z-index: 1;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    transition: transform 600ms cubic-bezier(0.2, 0, 0, 1);
  }
  .carousel-card:hover .card-bg {
    transform: scale(1.06);
  }

  .card-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%);
    pointer-events: none;
    transition: opacity 500ms ease;
  }

  .card-content {
    position: relative;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition:
      opacity var(--md-sys-motion-duration-medium2, 400ms) ease,
      transform var(--md-sys-motion-duration-long3, 650ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.35, 1.2, 0.25, 1.0));
  }

  .tag {
    align-self: flex-start;
    font: var(--md-sys-typescale-label-small-emphasized, 700 11px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-small-emphasized-tracking, 0.5px);
    text-transform: uppercase;
    background: rgba(255,255,255,0.25);
    backdrop-filter: blur(8px);
    padding: 4px 8px;
    border-radius: 9999px;
    margin-bottom: 6px;
  }

  .title {
    font: var(--md-sys-typescale-title-large, 400 22px/28px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-large-tracking, 0px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle {
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
    opacity: 0.85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 300ms ease, max-height 400ms ease;
    max-height: 24px;
  }

  .carousel-card.small .card-content {
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
  }
  .carousel-card.medium .subtitle {
    opacity: 0;
    max-height: 0;
    pointer-events: none;
  }
`;
var carouselSheet = createComponentSheet(defaultStyle26);
var DEMO_ITEMS = [
  {
    id: 1,
    title: "La Familia",
    subtitle: "Summer trip 2026",
    bg: "#4A3B69",
    tag: "Featured",
    image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 2,
    title: "Festivals",
    subtitle: "Live music & art",
    bg: "#2D5B6B",
    tag: "Trending",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 3,
    title: "Plantas",
    subtitle: "Urban garden & green",
    bg: "#2E604A",
    tag: "Nature",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 4,
    title: "Architecture",
    subtitle: "Modern facades & lines",
    bg: "#5A4A35",
    tag: "Design",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 5,
    title: "Ocean View",
    subtitle: "Coastal sunsets & tides",
    bg: "#2A4D6E",
    tag: "Travel",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: 6,
    title: "Last Month",
    subtitle: "Memories archive 2026",
    bg: "#6B432D",
    tag: "Archive",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80"
  }
];
var MdCarousel = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "layout",
      "active-index",
      "items",
      "preferred-item-width",
      "item-spacing",
      "user-scroll-enabled",
      "min-small-item-width",
      "max-small-item-width",
      "item-width",
      "max-item-width"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, carouselSheet);
    this._activeIndex = 0;
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "active-index") {
      const idx = parseInt(newVal, 10);
      if (!isNaN(idx)) this.setActiveIndex(idx);
    } else if (name === "items" || name === "layout" || name === "item-spacing" || name === "preferred-item-width" || name === "item-width") {
      this.render();
      this._setup();
      this._sync();
    }
  }
  get itemsList() {
    const raw = this.getAttribute("items");
    if (!raw) return DEMO_ITEMS;
    const parsed = safeJsonParse(raw, null);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEMO_ITEMS;
  }
  get layout() {
    return this.getAttribute("layout") || "multi-browse";
  }
  get activeIndex() {
    return this._activeIndex;
  }
  get preferredItemWidth() {
    const w = parseFloat(this.getAttribute("preferred-item-width") || this.getAttribute("item-width"));
    return isNaN(w) ? 220 : w;
  }
  set preferredItemWidth(v) {
    if (v === null || v === void 0) {
      this.removeAttribute("preferred-item-width");
      this.removeAttribute("item-width");
    } else {
      this.setAttribute("preferred-item-width", String(v));
    }
  }
  get itemWidth() {
    return this.preferredItemWidth;
  }
  set itemWidth(v) {
    this.preferredItemWidth = v;
  }
  get itemSpacing() {
    const s = parseFloat(this.getAttribute("item-spacing"));
    return isNaN(s) ? 8 : s;
  }
  set itemSpacing(v) {
    if (v === null || v === void 0) this.removeAttribute("item-spacing");
    else this.setAttribute("item-spacing", String(v));
  }
  get userScrollEnabled() {
    return this.getAttribute("user-scroll-enabled") !== "false";
  }
  set userScrollEnabled(v) {
    if (v) this.setAttribute("user-scroll-enabled", "true");
    else this.setAttribute("user-scroll-enabled", "false");
  }
  get minSmallItemWidth() {
    const w = parseFloat(this.getAttribute("min-small-item-width"));
    return isNaN(w) ? 40 : w;
  }
  set minSmallItemWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("min-small-item-width");
    else this.setAttribute("min-small-item-width", String(v));
  }
  get maxSmallItemWidth() {
    const w = parseFloat(this.getAttribute("max-small-item-width"));
    return isNaN(w) ? 56 : w;
  }
  set maxSmallItemWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("max-small-item-width");
    else this.setAttribute("max-small-item-width", String(v));
  }
  get maxItemWidth() {
    const w = parseFloat(this.getAttribute("max-item-width"));
    return isNaN(w) ? 400 : w;
  }
  set maxItemWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("max-item-width");
    else this.setAttribute("max-item-width", String(v));
  }
  setActiveIndex(index) {
    const items = this.itemsList;
    if (index < 0 || index >= items.length) return;
    this._activeIndex = index;
    this._updateCards(true);
    this.dispatchEvent(new CustomEvent("change", {
      detail: { index, item: items[index] },
      bubbles: true,
      composed: true
    }));
  }
  _updateCards(isUserInteraction = false) {
    const items = this.itemsList;
    const cards = this.shadowRoot.querySelectorAll(".carousel-card");
    cards.forEach((card, idx) => {
      const isHero = idx === this._activeIndex;
      const isMedium = idx === this._activeIndex + 1 || this._activeIndex === items.length - 1 && idx === this._activeIndex - 1;
      card.classList.toggle("hero", isHero);
      card.classList.toggle("medium", isMedium && !isHero);
      card.classList.toggle("small", !isHero && !isMedium);
      card.setAttribute("aria-selected", isHero ? "true" : "false");
    });
    const track = this.shadowRoot.querySelector(".carousel-track");
    const activeCard = cards[this._activeIndex];
    if (track && activeCard && isUserInteraction) {
      const targetScrollLeft = activeCard.offsetLeft - (track.clientWidth - activeCard.clientWidth) / 2;
      track.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: "smooth" });
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const track = this.shadowRoot.querySelector(".carousel-track");
    if (!track) return;
    const items = this.itemsList;
    const cards = this.shadowRoot.querySelectorAll(".carousel-card");
    cards.forEach((card, idx) => {
      let isDragging = false;
      let startX = 0;
      card.addEventListener("pointerdown", (e) => {
        startX = e.clientX;
        isDragging = false;
      }, { signal });
      card.addEventListener("pointermove", (e) => {
        if (Math.abs(e.clientX - startX) > 8) isDragging = true;
      }, { signal });
      card.addEventListener("click", () => {
        if (!isDragging) {
          this.setActiveIndex(idx);
        }
      }, { signal });
      bindPress(card, {
        disabled: () => false,
        onPress: () => pressScale(card, 0.98, "expressiveSpatialFast"),
        onRelease: () => releaseScale(card, 0.98, "expressiveSpatialMedium"),
        signal
      });
    });
    this.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        this.setActiveIndex(Math.min(items.length - 1, this._activeIndex + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.setActiveIndex(Math.max(0, this._activeIndex - 1));
      }
    }, { signal });
  }
  _sync() {
    this._updateCards();
  }
  render() {
    const items = this.itemsList;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle26}</style>`}
      <div class="carousel-container" role="region" aria-label="Photo Carousel">
        <div class="carousel-track" role="listbox" tabindex="0" aria-label="Carousel items">
          ${items.map((it, idx) => `
            <div class="carousel-card ${idx === 0 ? "hero" : idx === 1 ? "medium" : "small"}"
              data-index="${idx}"
              role="option"
              aria-selected="${idx === 0 ? "true" : "false"}"
              tabindex="0"
              aria-label="${escapeHtml(it.title || "")} - ${escapeHtml(it.subtitle || "")}">
              <div class="card-bg" style="background-color: ${escapeHtml(it.bg || "#333")}; ${it.image ? `background-image: url('${escapeHtml(it.image)}');` : ""}"></div>
              <div class="card-overlay"></div>
              <div class="card-content">
                ${it.tag ? `<span class="tag">${escapeHtml(it.tag)}</span>` : ""}
                <span class="title">${escapeHtml(it.title || "")}</span>
                <span class="subtitle">${escapeHtml(it.subtitle || "")}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
};
if (!customElements.get("md-carousel")) {
  customElements.define("md-carousel", MdCarousel);
}

// src/components/md-date-picker.js
var defaultStyle27 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    outline: none;
    box-sizing: border-box;
    user-select: none;
    font-family: var(--md-sys-typescale-font-family, 'Roboto', 'Roboto Flex', system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
  :host([inline]) {
    display: inline-block;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 24px 16px;
    box-sizing: border-box;
  }

  /* 1. DOCKED STYLES */
  .docked-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 328px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .outlined-field-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    margin-top: 6px;
    width: 100%;
    box-sizing: border-box;
  }

  .field-label {
    position: absolute;
    top: -8px;
    left: 12px;
    background: var(--md-sys-color-surface, #FEF7FF);
    padding: 0 4px;
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
    color: var(--md-sys-color-primary, #6750A4);
    z-index: 2;
  }

  .outlined-input {
    box-sizing: border-box;
    width: 100%;
    height: 56px;
    border-radius: 4px;
    border: 2px solid var(--md-sys-color-primary, #6750A4);
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    padding: 0 16px;
    outline: none;
  }

  .helper-text {
    font: var(--md-sys-typescale-body-small, 400 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    margin-top: 4px;
    margin-left: 12px;
  }

  .docked-calendar {
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    border: 1px solid var(--md-sys-color-outline-variant, #CAC4D0);
    border-radius: 16px;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 3px rgba(0,0,0,0.12));
    box-sizing: border-box;
    width: 100%;
  }

  .docked-nav-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .nav-cluster {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .dropdown-pill-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .dropdown-pill-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  /* 2. MODAL & RANGE DIALOG STYLES */
  .picker-dialog {
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    padding: 24px;
    width: 328px;
    max-width: calc(100vw - 32px);
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.15));
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
    will-change: transform;
    margin: auto;
  }

  :host([inline]) .picker-dialog {
    width: 100%;
    max-width: 328px;
    box-shadow: none;
    margin: 0 auto;
  }

  .picker-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-title {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    text-transform: capitalize;
  }

  .formatted-date {
    font: var(--md-sys-typescale-headline-large, 400 32px/40px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-headline-large-tracking, 0px);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }

  .icon-toggle-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    width: 36px;
    height: 36px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .icon-toggle-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  .divider {
    height: 1px;
    background-color: var(--md-sys-color-outline-variant, #CAC4D0);
    margin: 0;
  }

  .calendar-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .month-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    padding: 0 4px;
  }

  .month-nav {
    display: flex;
    gap: 4px;
  }

  .nav-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    outline: none;
    transition: background-color 150ms ease;
  }
  .nav-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  .ico {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
    font-size: 22px;
    line-height: 1;
    display: inline-block;
    white-space: nowrap;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }
  .ico.arrow { font-size: 18px; }

  .weekdays-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    text-align: center;
    font: var(--md-sys-typescale-label-medium, 500 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-medium-tracking, 0.5px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    height: 32px;
    align-items: center;
    justify-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px 0;
    align-items: center;
    justify-items: center;
    width: 100%;
    box-sizing: border-box;
  }

  .day-cell {
    position: relative;
    width: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    cursor: pointer;
    outline: none;
    padding: 0;
    margin: 0;
    box-sizing: border-box;
  }
  .day-cell.empty {
    cursor: default;
    pointer-events: none;
  }
  .day-cell .day-text {
    position: relative;
    z-index: 2;
    width: 36px;
    height: 36px;
    min-width: 36px;
    min-height: 36px;
    max-width: 36px;
    max-height: 36px;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin: auto;
    line-height: 1;
    text-align: center;
    transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
    box-sizing: border-box;
  }
  .day-cell:hover:not(.empty):not(.selected):not(.in-range) .day-text {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 12%, transparent);
  }
  .day-cell.today .day-text {
    border: 1px solid var(--md-sys-color-primary, #6750A4);
  }
  .day-cell.selected .day-text {
    background-color: var(--md-sys-color-primary, #6750A4);
    color: var(--md-sys-color-on-primary, #FFFFFF);
    font-weight: var(--md-sys-typescale-body-medium-emphasized-weight, 500);
  }

  /* Seamless Continuous Range Selection Highlighting (1:1 AndroidX Compose DateRangePicker Parity) */
  .day-cell.in-range {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    color: var(--md-sys-color-on-secondary-container, #1D192B);
    border-radius: 0;
  }
  .day-cell.range-start::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 50%;
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    z-index: 1;
  }
  .day-cell.range-end::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 50%;
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    z-index: 1;
  }
  .day-cell.range-start.range-end::before {
    display: none;
  }

  .range-input-pane, .modal-input-pane {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    width: 100%;
    box-sizing: border-box;
  }
  .range-input-pane .outlined-field-wrap { flex: 1; }

  .actions-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .text-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-primary, #6750A4);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    height: 40px;
    padding: 0 16px;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .text-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 8%, transparent);
  }

  @media (max-width: 600px) {
    .picker-dialog {
      width: 328px !important;
      max-width: calc(100vw - 32px) !important;
      padding: 20px 16px !important;
      border-radius: var(--md-sys-shape-corner-extra-large, 28px) !important;
      box-sizing: border-box !important;
      margin: auto !important;
    }
    .docked-container {
      width: 100% !important;
      max-width: 328px !important;
      margin: 0 auto !important;
    }
    .docked-calendar {
      padding: 16px 12px !important;
    }
  }
`;
var datePickerSheet = createComponentSheet(defaultStyle27);
var MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function formatDateMMDDYYYY(d) {
  if (!d || isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}
function parseDateMMDDYYYY(str) {
  if (!str) return null;
  if (str.includes("-")) {
    const parts2 = str.split("-");
    if (parts2.length === 3) {
      const d = new Date(parseInt(parts2[0], 10), parseInt(parts2[1], 10) - 1, parseInt(parts2[2], 10));
      return isNaN(d.getTime()) ? null : d;
    }
  }
  const parts = str.split("/");
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
var MdDatePicker = class extends HTMLElement {
  static get observedAttributes() {
    return ["open", "variant", "value", "range", "start-date", "end-date", "show-mode-toggle", "inline", "date-formatter"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, datePickerSheet);
    const now = /* @__PURE__ */ new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3);
    this.state = {
      selectedDate: now,
      startDate: now,
      endDate: futureDate,
      viewYear: now.getFullYear(),
      viewMonth: now.getMonth(),
      displayMode: "picker",
      // 'picker' | 'input'
      selectingRangeEnd: false
    };
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this._parseInitialAttributes();
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "open") {
      this._sync();
      if (this.open && !this.inline) this._animateOpen();
    }
    if (name === "value" && this.value) {
      const parsed = parseDateMMDDYYYY(this.value);
      if (parsed) {
        this.state.selectedDate = parsed;
        this.state.viewYear = parsed.getFullYear();
        this.state.viewMonth = parsed.getMonth();
        this._updateUI();
      }
    }
    if (name === "variant" || name === "inline" || name === "range") {
      this.render();
      this._setup();
      this._sync();
    }
  }
  _parseInitialAttributes() {
    if (this.hasAttribute("value")) {
      const parsed = parseDateMMDDYYYY(this.getAttribute("value"));
      if (parsed) {
        this.state.selectedDate = parsed;
        this.state.viewYear = parsed.getFullYear();
        this.state.viewMonth = parsed.getMonth();
      }
    }
    if (this.hasAttribute("start-date")) {
      const s = parseDateMMDDYYYY(this.getAttribute("start-date"));
      if (s) this.state.startDate = s;
    }
    if (this.hasAttribute("end-date")) {
      const e = parseDateMMDDYYYY(this.getAttribute("end-date"));
      if (e) this.state.endDate = e;
    }
    if (this.variant === "modal-input" || this.range && this.getAttribute("mode") === "input") {
      this.state.displayMode = "input";
    }
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    if (v) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }
  get inline() {
    return this.hasAttribute("inline") || this.variant === "docked";
  }
  set inline(v) {
    if (v) this.setAttribute("inline", "");
    else this.removeAttribute("inline");
  }
  get variant() {
    return this.getAttribute("variant") || "modal";
  }
  // 'docked' | 'modal' | 'range' | 'modal-input'
  set variant(v) {
    this.setAttribute("variant", v);
  }
  get value() {
    return this.getAttribute("value") || formatDateMMDDYYYY(this.state.selectedDate);
  }
  set value(v) {
    this.setAttribute("value", v);
  }
  get range() {
    return this.hasAttribute("range") || this.variant === "range";
  }
  set range(v) {
    if (v) this.setAttribute("range", "");
    else this.removeAttribute("range");
  }
  get startDate() {
    return this.getAttribute("start-date") || formatDateMMDDYYYY(this.state.startDate);
  }
  set startDate(v) {
    this.setAttribute("start-date", v);
  }
  get showModeToggle() {
    return this.getAttribute("show-mode-toggle") !== "false";
  }
  set showModeToggle(v) {
    if (v) this.setAttribute("show-mode-toggle", "true");
    else this.setAttribute("show-mode-toggle", "false");
  }
  get dateFormatter() {
    return this.getAttribute("date-formatter") || "";
  }
  set dateFormatter(v) {
    if (v === null || v === void 0) this.removeAttribute("date-formatter");
    else this.setAttribute("date-formatter", v);
  }
  get endDate() {
    return this.getAttribute("end-date") || formatDateMMDDYYYY(this.state.endDate);
  }
  set endDate(v) {
    this.setAttribute("end-date", v);
  }
  show() {
    this.open = true;
    if (!this.inline) document.body.style.overflow = "hidden";
  }
  close() {
    this.open = false;
    if (!this.inline) document.body.style.overflow = "";
  }
  _animateOpen() {
    const dialog = this.shadowRoot.querySelector(".picker-dialog");
    if (dialog) {
      SpringPhysics.animateProperty(dialog, "scale", 0.9, 1, "expressiveSpatialFast");
    }
  }
  _sync() {
    if (this.inline) {
      this.style.display = "inline-block";
    } else {
      this.style.display = this.open ? "block" : "none";
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) {
      const onScrimDismiss = (e) => {
        if (e.target === scrim) {
          e.preventDefault();
          this.close();
        }
      };
      scrim.addEventListener("click", onScrimDismiss, { signal });
      scrim.addEventListener("pointerdown", onScrimDismiss, { signal });
      scrim.addEventListener("touchstart", onScrimDismiss, { signal, passive: false });
    }
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open && !this.inline) {
        this.close();
      }
    }, { signal });
    const prevBtn = this.shadowRoot.querySelector("#prev-month");
    const nextBtn = this.shadowRoot.querySelector("#next-month");
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener("click", () => {
        this.state.viewMonth--;
        if (this.state.viewMonth < 0) {
          this.state.viewMonth = 11;
          this.state.viewYear--;
        }
        this._updateUI();
      }, { signal });
      nextBtn.addEventListener("click", () => {
        this.state.viewMonth++;
        if (this.state.viewMonth > 11) {
          this.state.viewMonth = 0;
          this.state.viewYear++;
        }
        this._updateUI();
      }, { signal });
    }
    const modeToggle = this.shadowRoot.querySelector("#mode-toggle-btn");
    if (modeToggle) {
      modeToggle.addEventListener("click", () => {
        this.state.displayMode = this.state.displayMode === "picker" ? "input" : "picker";
        this.render();
        this._setup();
      }, { signal });
    }
    const cancelBtn = this.shadowRoot.querySelector("#cancel-btn");
    const okBtn = this.shadowRoot.querySelector("#ok-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => this.close(), { signal });
    if (okBtn) {
      okBtn.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("confirm", {
          detail: {
            date: this.state.selectedDate,
            startDate: this.state.startDate,
            endDate: this.state.endDate,
            value: this.value
          },
          bubbles: true,
          composed: true
        }));
        if (!this.inline) this.close();
      }, { signal });
    }
    const dockedInput = this.shadowRoot.querySelector("#docked-text-input");
    if (dockedInput) {
      dockedInput.addEventListener("input", (e) => {
        const parsed = parseDateMMDDYYYY(e.target.value);
        if (parsed) {
          this.state.selectedDate = parsed;
          this.state.viewYear = parsed.getFullYear();
          this.state.viewMonth = parsed.getMonth();
          this.value = formatDateMMDDYYYY(parsed);
          this._updateCalendarGrid();
        }
      });
    }
    const rangeStartInput = this.shadowRoot.querySelector("#range-start-input");
    const rangeEndInput = this.shadowRoot.querySelector("#range-end-input");
    if (rangeStartInput && rangeEndInput) {
      rangeStartInput.addEventListener("input", (e) => {
        const s = parseDateMMDDYYYY(e.target.value);
        if (s) {
          this.state.startDate = s;
          this.startDate = formatDateMMDDYYYY(s);
          this._updateHeader();
        }
      });
      rangeEndInput.addEventListener("input", (e) => {
        const endD = parseDateMMDDYYYY(e.target.value);
        if (endD) {
          this.state.endDate = endD;
          this.endDate = formatDateMMDDYYYY(endD);
          this._updateHeader();
        }
      });
    }
    this._updateUI();
  }
  _updateUI() {
    this._updateHeader();
    this._updateCalendarGrid();
  }
  _updateHeader() {
    const isRange = this.range;
    const headerEl = this.shadowRoot.querySelector(".formatted-date");
    if (!headerEl) return;
    if (isRange) {
      if (this.state.displayMode === "input") {
        headerEl.textContent = "Enter dates";
      } else if (this.state.startDate && this.state.endDate) {
        const s = this.state.startDate;
        const e = this.state.endDate;
        headerEl.textContent = `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} \u2013 ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
      } else {
        headerEl.textContent = "Select range";
      }
    } else {
      const sel = this.state.selectedDate;
      headerEl.textContent = `${DAY_NAMES[sel.getDay()]}, ${MONTH_SHORT[sel.getMonth()]} ${sel.getDate()}`;
    }
  }
  _updateCalendarGrid() {
    const monthLabelEl = this.shadowRoot.querySelector(".month-label");
    if (monthLabelEl) {
      if (this.variant === "docked") {
        monthLabelEl.textContent = `${MONTH_SHORT[this.state.viewMonth]}`;
        const yearLabelEl = this.shadowRoot.querySelector(".year-label");
        if (yearLabelEl) yearLabelEl.textContent = `${this.state.viewYear}`;
      } else {
        monthLabelEl.textContent = `${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}`;
      }
    }
    const daysGrid = this.shadowRoot.querySelector(".days-grid");
    if (!daysGrid) return;
    const isRange = this.range;
    const firstDayIndex = new Date(this.state.viewYear, this.state.viewMonth, 1).getDay();
    const daysInMonth = new Date(this.state.viewYear, this.state.viewMonth + 1, 0).getDate();
    const today = /* @__PURE__ */ new Date();
    const startTime = this.state.startDate ? new Date(this.state.startDate.getFullYear(), this.state.startDate.getMonth(), this.state.startDate.getDate()).getTime() : null;
    const endTime = this.state.endDate ? new Date(this.state.endDate.getFullYear(), this.state.endDate.getMonth(), this.state.endDate.getDate()).getTime() : null;
    let gridHtml = "";
    for (let i = 0; i < firstDayIndex; i++) {
      gridHtml += `<div class="day-cell empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const currentCellDate = new Date(this.state.viewYear, this.state.viewMonth, day);
      const currentTime = currentCellDate.getTime();
      const isToday = today.getFullYear() === this.state.viewYear && today.getMonth() === this.state.viewMonth && today.getDate() === day;
      let cellClasses = "day-cell";
      if (isToday) cellClasses += " today";
      if (isRange) {
        const isStart = startTime && currentTime === startTime;
        const isEnd = endTime && currentTime === endTime;
        const inRange = startTime && endTime && currentTime > startTime && currentTime < endTime;
        if (isStart) cellClasses += " range-start selected";
        else if (isEnd) cellClasses += " range-end selected";
        else if (inRange) cellClasses += " in-range";
      } else {
        const isSelected = this.state.selectedDate.getFullYear() === this.state.viewYear && this.state.selectedDate.getMonth() === this.state.viewMonth && this.state.selectedDate.getDate() === day;
        if (isSelected) cellClasses += " selected";
      }
      gridHtml += `
        <button class="${cellClasses}" data-day="${day}" tabindex="0" type="button" aria-label="${day} ${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}">
          <span class="day-text">${day}</span>
        </button>
      `;
    }
    daysGrid.innerHTML = gridHtml;
    const dayCells = daysGrid.querySelectorAll(".day-cell:not(.empty)");
    dayCells.forEach((cell) => {
      cell.addEventListener("click", () => {
        const dayNum = parseInt(cell.getAttribute("data-day"), 10);
        const pickedDate = new Date(this.state.viewYear, this.state.viewMonth, dayNum);
        if (isRange) {
          if (!this.state.startDate || this.state.startDate && this.state.endDate) {
            this.state.startDate = pickedDate;
            this.state.endDate = null;
            this.startDate = formatDateMMDDYYYY(pickedDate);
            this.endDate = "";
          } else {
            if (pickedDate < this.state.startDate) {
              this.state.endDate = this.state.startDate;
              this.state.startDate = pickedDate;
            } else {
              this.state.endDate = pickedDate;
            }
            this.startDate = formatDateMMDDYYYY(this.state.startDate);
            this.endDate = formatDateMMDDYYYY(this.state.endDate);
          }
        } else {
          this.state.selectedDate = pickedDate;
          this.value = formatDateMMDDYYYY(pickedDate);
          const dockedInput = this.shadowRoot.querySelector("#docked-text-input");
          if (dockedInput) dockedInput.value = this.value;
        }
        this._updateUI();
        this.dispatchEvent(new CustomEvent("change", {
          detail: {
            date: this.state.selectedDate,
            startDate: this.state.startDate,
            endDate: this.state.endDate,
            value: this.value
          },
          bubbles: true,
          composed: true
        }));
      });
    });
  }
  render() {
    const isDocked = this.variant === "docked";
    const isRange = this.range;
    const isInputMode = this.state.displayMode === "input";
    const currentFormattedValue = formatDateMMDDYYYY(this.state.selectedDate);
    const startFormattedValue = formatDateMMDDYYYY(this.state.startDate);
    const endFormattedValue = formatDateMMDDYYYY(this.state.endDate);
    let cardContentHtml = "";
    if (isDocked) {
      cardContentHtml = `
        <div class="docked-container">
          <div class="outlined-field-wrap">
            <label class="field-label">Date</label>
            <input type="text" id="docked-text-input" class="outlined-input" value="${currentFormattedValue}" placeholder="MM/DD/YYYY" />
            <span class="helper-text">MM/DD/YYYY</span>
          </div>

          <div class="docked-calendar">
            <div class="docked-nav-row">
              <div class="nav-cluster">
                <button class="nav-btn" id="prev-month" type="button" aria-label="Previous month"><span class="ico">chevron_left</span></button>
                <button class="dropdown-pill-btn" type="button"><span class="month-label">${MONTH_SHORT[this.state.viewMonth]}</span> <span class="ico arrow">arrow_drop_down</span></button>
                <button class="nav-btn" id="next-month" type="button" aria-label="Next month"><span class="ico">chevron_right</span></button>
              </div>
              <div class="nav-cluster">
                <button class="dropdown-pill-btn" type="button"><span class="year-label">${this.state.viewYear}</span> <span class="ico arrow">arrow_drop_down</span></button>
              </div>
            </div>

            <div class="weekdays-row">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>

            <div class="days-grid"></div>
          </div>
        </div>
      `;
    } else if (isRange) {
      cardContentHtml = `
        <div class="picker-dialog range" part="dialog">
          <div class="picker-header">
            <div class="header-top">
              <span class="header-title">Select date</span>
              <button class="icon-toggle-btn" id="mode-toggle-btn" type="button" aria-label="Toggle input mode">
                <span class="ico">${isInputMode ? "calendar_month" : "edit"}</span>
              </button>
            </div>
            <div class="formatted-date">${isInputMode ? "Enter dates" : this.state.startDate && this.state.endDate ? `${MONTH_SHORT[this.state.startDate.getMonth()]} ${this.state.startDate.getDate()} \u2013 ${MONTH_SHORT[this.state.endDate.getMonth()]} ${this.state.endDate.getDate()}` : "Select range"}</div>
          </div>

          <div class="divider"></div>

          ${isInputMode ? `
            <div class="range-input-pane">
              <div class="outlined-field-wrap">
                <label class="field-label">Date</label>
                <input type="text" id="range-start-input" class="outlined-input" value="${startFormattedValue}" placeholder="mm/dd/yyyy" />
              </div>
              <div class="outlined-field-wrap">
                <label class="field-label">End date</label>
                <input type="text" id="range-end-input" class="outlined-input" value="${endFormattedValue}" placeholder="mm/dd/yyyy" />
              </div>
            </div>
          ` : `
            <div class="calendar-body">
              <div class="month-header">
                <button class="dropdown-pill-btn" type="button">
                  <span class="month-label">${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}</span>
                  <span class="ico arrow">arrow_drop_down</span>
                </button>
                <div class="month-nav">
                  <button class="nav-btn" id="prev-month" type="button" aria-label="Previous month"><span class="ico">chevron_left</span></button>
                  <button class="nav-btn" id="next-month" type="button" aria-label="Next month"><span class="ico">chevron_right</span></button>
                </div>
              </div>

              <div class="weekdays-row">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
              </div>

              <div class="days-grid range-grid"></div>
            </div>
          `}

          <div class="actions-row">
            <button class="text-btn" id="cancel-btn" type="button">Cancel</button>
            <button class="text-btn primary" id="ok-btn" type="button">Save</button>
          </div>
        </div>
      `;
    } else {
      cardContentHtml = `
        <div class="picker-dialog modal" part="dialog">
          <div class="picker-header">
            <div class="header-top">
              <span class="header-title">Select date</span>
              <button class="icon-toggle-btn" id="mode-toggle-btn" type="button" aria-label="Toggle input mode">
                <span class="ico">${isInputMode ? "calendar_month" : "edit"}</span>
              </button>
            </div>
            <div class="formatted-date">${DAY_NAMES[this.state.selectedDate.getDay()]}, ${MONTH_SHORT[this.state.selectedDate.getMonth()]} ${this.state.selectedDate.getDate()}</div>
          </div>

          <div class="divider"></div>

          ${isInputMode ? `
            <div class="modal-input-pane">
              <div class="outlined-field-wrap">
                <label class="field-label">Date</label>
                <input type="text" id="docked-text-input" class="outlined-input" value="${currentFormattedValue}" placeholder="MM/DD/YYYY" />
                <span class="helper-text">MM/DD/YYYY</span>
              </div>
            </div>
          ` : `
            <div class="calendar-body">
              <div class="month-header">
                <button class="dropdown-pill-btn" type="button">
                  <span class="month-label">${MONTH_NAMES[this.state.viewMonth]} ${this.state.viewYear}</span>
                  <span class="ico arrow">arrow_drop_down</span>
                </button>
                <div class="month-nav">
                  <button class="nav-btn" id="prev-month" type="button" aria-label="Previous month"><span class="ico">chevron_left</span></button>
                  <button class="nav-btn" id="next-month" type="button" aria-label="Next month"><span class="ico">chevron_right</span></button>
                </div>
              </div>

              <div class="weekdays-row">
                <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
              </div>

              <div class="days-grid"></div>
            </div>
          `}

          <div class="actions-row">
            <button class="text-btn" id="cancel-btn" type="button">Cancel</button>
            <button class="text-btn primary" id="ok-btn" type="button">OK</button>
          </div>
        </div>
      `;
    }
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle27}</style>`}
      ${this.inline ? cardContentHtml : `<div class="scrim" role="dialog" aria-modal="true">${cardContentHtml}</div>`}
    `;
  }
};
if (!customElements.get("md-date-picker")) {
  customElements.define("md-date-picker", MdDatePicker);
}

// src/components/md-time-picker.js
var defaultStyle28 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: block;
    outline: none;
    box-sizing: border-box;
    user-select: none;
    font-family: var(--md-sys-typescale-font-family, 'Roboto', 'Roboto Flex', system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
  :host([inline]) {
    display: inline-block;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 24px 16px;
    box-sizing: border-box;
  }

  .picker-dialog {
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    color: var(--md-sys-color-on-surface, #1D1B20);
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    padding: 24px;
    box-shadow: var(--md-sys-elevation-level-3, 0 4px 8px 3px rgba(0,0,0,0.15));
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
    will-change: transform;
    width: 328px;
    max-width: calc(100vw - 32px);
    margin: auto;
  }

  :host([inline]) .picker-dialog {
    width: 100%;
    max-width: 328px;
    box-shadow: none;
    margin: 0 auto;
  }

  .picker-dialog.horizontal,
  :host([inline]) .picker-dialog.horizontal {
    width: 580px;
    max-width: calc(100vw - 32px);
  }
  .picker-dialog.input-mode {
    width: 328px;
    max-width: calc(100vw - 32px);
  }

  /* Rich Color Scheme (Expressive Palette) */
  .picker-dialog.rich {
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
  }
  .picker-dialog.rich .time-card.active,
  .picker-dialog.rich .time-input-field:focus {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
    border-color: var(--md-sys-color-primary, #6750A4);
  }
  .picker-dialog.rich .clock-face {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 10%, var(--md-sys-color-surface-container, #F3EDF7));
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .header-title {
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    text-transform: capitalize;
  }

  .main-layout-wrap.vertical {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  .main-layout-wrap.horizontal {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  /* Time Cards Section */
  .time-display-section {
    display: flex;
    justify-content: center;
  }

  .time-display-section.horizontal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .time-cards-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .time-card {
    width: 96px;
    height: 80px;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    border: none;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    color: var(--md-sys-color-on-surface, #1D1B20);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    transition: background-color 180ms ease, color 180ms ease;
  }
  .time-card.active {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
  }

  .time-val {
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
  }

  .time-separator {
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    line-height: 80px;
    user-select: none;
  }

  /* Keyboard Input Mode Textfields */
  .input-card-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .time-input-field {
    box-sizing: border-box;
    width: 96px;
    height: 80px;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    border: 2px solid transparent;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-display-large, 400 57px/64px Roboto Flex, sans-serif);
    letter-spacing: var(--md-sys-typescale-display-large-tracking, -0.2px);
    text-align: center;
    outline: none;
    transition: border-color 150ms ease, background-color 150ms ease;
  }
  .time-input-field:focus {
    border-color: var(--md-sys-color-primary, #6750A4);
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
  }

  .input-sublabel {
    font: var(--md-sys-typescale-body-small, 400 12px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-small-tracking, 0.4px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }

  /* AM / PM Segmented Column (Vertical layout) */
  .period-toggle-column {
    display: flex;
    flex-direction: column;
    height: 80px;
    width: 52px;
    border: 1px solid var(--md-sys-color-outline, #79747E);
    border-radius: var(--md-sys-shape-corner-small, 8px);
    overflow: hidden;
  }

  .period-toggle-column .period-btn {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease, color 150ms ease;
  }
  .period-toggle-column .period-btn:first-child {
    border-bottom: 1px solid var(--md-sys-color-outline, #79747E);
  }
  .period-toggle-column .period-btn.active {
    background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
    color: var(--md-sys-color-on-tertiary-container, #31111D);
    font-weight: var(--md-sys-typescale-label-large-emphasized-weight, 700);
  }

  /* AM / PM Segmented Row (Horizontal landscape layout - Android Compose Parity) */
  .period-toggle-row {
    display: flex;
    flex-direction: row;
    height: 38px;
    width: 216px;
    border: 1px solid var(--md-sys-color-outline, #79747E);
    border-radius: var(--md-sys-shape-corner-small, 8px);
    overflow: hidden;
  }

  .period-toggle-row .period-btn {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease, color 150ms ease;
  }
  .period-toggle-row .period-btn:first-child {
    border-right: 1px solid var(--md-sys-color-outline, #79747E);
  }
  .period-toggle-row .period-btn.active {
    background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
    color: var(--md-sys-color-on-tertiary-container, #31111D);
    font-weight: var(--md-sys-typescale-label-large-emphasized-weight, 700);
  }

  /* 256dp Clock Dial */
  .dial-section {
    display: flex;
    justify-content: center;
    width: 256px;
    height: 256px;
    flex-shrink: 0;
  }

  .clock-face {
    position: relative;
    width: 256px;
    height: 256px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-surface-container-highest, #E6E0E9);
    touch-action: none;
    cursor: pointer;
    flex-shrink: 0;
  }

  .dial-center-dot {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: var(--md-sys-color-primary, #6750A4);
    border-radius: 9999px;
    top: 124px;
    left: 124px;
    z-index: 4;
  }

  .clock-arm {
    position: absolute;
    top: 0;
    left: 0;
    width: 256px;
    height: 256px;
    pointer-events: none;
    transform-origin: 128px 128px;
    transition: transform 180ms cubic-bezier(0.2, 0, 0, 1);
    z-index: 2;
  }

  .clock-hand-line {
    position: absolute;
    width: 2px;
    height: 100px;
    background-color: var(--md-sys-color-primary, #6750A4);
    left: 127px;
    top: 28px;
  }

  .clock-selector-head {
    position: absolute;
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-primary, #6750A4);
    left: 104px;
    top: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .selector-dot {
    display: none;
    width: 8px;
    height: 8px;
    background-color: var(--md-sys-color-on-primary, #FFFFFF);
    border-radius: 9999px;
  }

  .dial-number {
    position: absolute;
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    color: var(--md-sys-color-on-surface, #1D1B20);
    transform: translate(-50%, -50%);
    user-select: none;
    cursor: pointer;
    z-index: 3;
    transition: color 150ms ease;
  }
  .dial-number.selected {
    color: var(--md-sys-color-on-primary, #FFFFFF) !important;
    font-weight: var(--md-sys-typescale-body-large-emphasized-weight, 500);
  }

  /* Footer Actions */
  .picker-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
  }

  .icon-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .icon-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent);
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .text-btn {
    border: none;
    background: transparent;
    color: var(--md-sys-color-primary, #6750A4);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
    height: 40px;
    padding: 0 16px;
    border-radius: 9999px;
    cursor: pointer;
    outline: none;
    transition: background-color 150ms ease;
  }
  .text-btn:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-primary, #6750A4) 8%, transparent);
  }

  .ico {
    font-family: 'Material Symbols Outlined', 'Material Symbols Rounded', sans-serif;
    font-size: 24px;
    line-height: 1;
    font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
  }

  @media (max-width: 600px) {
    .picker-dialog {
      width: 328px !important;
      max-width: calc(100vw - 32px) !important;
      padding: 24px 16px !important;
      border-radius: var(--md-sys-shape-corner-extra-large, 28px) !important;
      box-sizing: border-box !important;
      margin: auto !important;
    }
    .picker-dialog.horizontal {
      width: 328px !important;
      max-width: calc(100vw - 32px) !important;
    }
    .main-layout-wrap.horizontal {
      flex-direction: column !important;
      gap: 16px !important;
    }
  }
`;
var timePickerSheet = createComponentSheet(defaultStyle28);
var MdTimePicker = class extends HTMLElement {
  static get observedAttributes() {
    return ["open", "value", "mode", "is-24-hour", "rich-colors", "layout-type", "inline", "hour", "minute", "variant"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, timePickerSheet);
    this.state = {
      hours: 7,
      minutes: 30,
      period: "AM",
      activeUnit: "hours",
      // 'hours' | 'minutes'
      mode: "dial",
      // 'dial' | 'input'
      is24Hour: false,
      richColors: false,
      layoutType: "vertical"
      // 'vertical' | 'horizontal'
    };
    this._isDragging = false;
    this._rendered = false;
    this._abortController = null;
    this._currentArmAngle = this.state.hours % 12 * 30;
  }
  connectedCallback() {
    if (!this._rendered) {
      this._parseInitialAttributes();
      this.render();
      this._setup();
      this._rendered = true;
    }
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "open") {
      this._sync();
      if (this.open && !this.inline) this._animateOpen();
    }
    if (name === "value" && this.value) {
      this._parseValue(this.value);
      this._updateDisplay(true);
    }
    if (name === "hour") {
      const h = parseInt(newVal, 10);
      if (!isNaN(h)) {
        this.state.hours = h;
        this._updateDisplay(true);
      }
    }
    if (name === "minute") {
      const m = parseInt(newVal, 10);
      if (!isNaN(m)) {
        this.state.minutes = m;
        this._updateDisplay(true);
      }
    }
    if (name === "layout-type" || name === "mode" || name === "rich-colors" || name === "inline" || name === "variant") {
      this._parseInitialAttributes();
      this.render();
      this._setup();
      this._sync();
    }
  }
  _parseInitialAttributes() {
    if (this.hasAttribute("value")) this._parseValue(this.getAttribute("value"));
    if (this.hasAttribute("hour")) {
      const h = parseInt(this.getAttribute("hour"), 10);
      if (!isNaN(h)) this.state.hours = h;
    }
    if (this.hasAttribute("minute")) {
      const m = parseInt(this.getAttribute("minute"), 10);
      if (!isNaN(m)) this.state.minutes = m;
    }
    if (this.hasAttribute("is-24-hour")) this.state.is24Hour = true;
    if (this.hasAttribute("rich-colors")) this.state.richColors = true;
    if (this.hasAttribute("mode")) this.state.mode = this.getAttribute("mode");
    if (this.hasAttribute("layout-type")) this.state.layoutType = this.getAttribute("layout-type");
    if (this.hasAttribute("variant")) {
      const v = this.getAttribute("variant");
      if (v === "horizontal") this.state.layoutType = "horizontal";
      else if (v === "input") this.state.mode = "input";
      else if (v === "dial") this.state.mode = "dial";
    }
    this._currentArmAngle = this.state.hours % 12 * 30;
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    if (v) this.setAttribute("open", "");
    else this.removeAttribute("open");
  }
  get inline() {
    return this.hasAttribute("inline");
  }
  set inline(v) {
    if (v) this.setAttribute("inline", "");
    else this.removeAttribute("inline");
  }
  get value() {
    const hh = String(this.state.hours).padStart(2, "0");
    const mm = String(this.state.minutes).padStart(2, "0");
    return this.state.is24Hour ? `${hh}:${mm}` : `${hh}:${mm} ${this.state.period}`;
  }
  set value(v) {
    this.setAttribute("value", v);
  }
  get hour() {
    return this.state.hours;
  }
  set hour(v) {
    this.setAttribute("hour", String(v));
  }
  get minute() {
    return this.state.minutes;
  }
  set minute(v) {
    this.setAttribute("minute", String(v));
  }
  get is24Hour() {
    return this.hasAttribute("is-24-hour");
  }
  set is24Hour(v) {
    if (v) this.setAttribute("is-24-hour", "");
    else this.removeAttribute("is-24-hour");
  }
  get richColors() {
    return this.hasAttribute("rich-colors");
  }
  set richColors(v) {
    if (v) this.setAttribute("rich-colors", "");
    else this.removeAttribute("rich-colors");
  }
  get layoutType() {
    return this.getAttribute("layout-type") || this.state.layoutType;
  }
  set layoutType(v) {
    this.setAttribute("layout-type", v);
  }
  get mode() {
    return this.getAttribute("mode") || this.state.mode;
  }
  set mode(v) {
    this.setAttribute("mode", v);
  }
  show() {
    this.open = true;
    if (!this.inline) document.body.style.overflow = "hidden";
  }
  close() {
    this.open = false;
    if (!this.inline) document.body.style.overflow = "";
  }
  _parseValue(valStr) {
    if (!valStr) return;
    const match = valStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (match) {
      this.state.hours = parseInt(match[1], 10);
      this.state.minutes = parseInt(match[2], 10);
      if (match[3]) this.state.period = match[3].toUpperCase();
      this._currentArmAngle = this.state.hours % 12 * 30;
    }
  }
  _animateOpen() {
    const dialog = this.shadowRoot.querySelector(".picker-dialog");
    if (dialog) {
      SpringPhysics.animateProperty(dialog, "scale", 0.9, 1, "expressiveSpatialFast");
    }
  }
  _sync() {
    if (this.inline) {
      this.style.display = "inline-block";
    } else {
      this.style.display = this.open ? "block" : "none";
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) {
      const onScrimDismiss = (e) => {
        if (e.target === scrim) {
          e.preventDefault();
          this.close();
        }
      };
      scrim.addEventListener("click", onScrimDismiss, { signal });
      scrim.addEventListener("pointerdown", onScrimDismiss, { signal });
      scrim.addEventListener("touchstart", onScrimDismiss, { signal, passive: false });
    }
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open && !this.inline) {
        this.close();
      }
    }, { signal });
    const hourCard = this.shadowRoot.querySelector("#hour-card");
    const minCard = this.shadowRoot.querySelector("#min-card");
    if (hourCard && minCard) {
      hourCard.addEventListener("click", () => {
        this.state.activeUnit = "hours";
        this._updateDisplay(true);
      }, { signal });
      minCard.addEventListener("click", () => {
        this.state.activeUnit = "minutes";
        this._updateDisplay(true);
      }, { signal });
    }
    const hourInput = this.shadowRoot.querySelector("#hour-input");
    const minInput = this.shadowRoot.querySelector("#min-input");
    if (hourInput && minInput) {
      hourInput.addEventListener("input", (e) => {
        let val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          if (this.state.is24Hour) val = Math.max(0, Math.min(23, val));
          else val = Math.max(1, Math.min(12, val));
          this.state.hours = val;
          this._emitChange();
        }
      });
      minInput.addEventListener("input", (e) => {
        let val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          val = Math.max(0, Math.min(59, val));
          this.state.minutes = val;
          this._emitChange();
        }
      });
    }
    const amBtn = this.shadowRoot.querySelector("#am-btn");
    const pmBtn = this.shadowRoot.querySelector("#pm-btn");
    if (amBtn && pmBtn) {
      amBtn.addEventListener("click", () => {
        this.state.period = "AM";
        amBtn.classList.add("active");
        pmBtn.classList.remove("active");
        this._emitChange();
      });
      pmBtn.addEventListener("click", () => {
        this.state.period = "PM";
        pmBtn.classList.add("active");
        amBtn.classList.remove("active");
        this._emitChange();
      });
    }
    const modeToggle = this.shadowRoot.querySelector("#mode-toggle-btn");
    if (modeToggle) {
      modeToggle.addEventListener("click", () => {
        this.state.mode = this.state.mode === "dial" ? "input" : "dial";
        this.render();
        this._setup();
      });
    }
    const cancelBtn = this.shadowRoot.querySelector("#cancel-btn");
    const okBtn = this.shadowRoot.querySelector("#ok-btn");
    if (cancelBtn) cancelBtn.addEventListener("click", () => this.close());
    if (okBtn) {
      okBtn.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("confirm", {
          detail: {
            hours: this.state.hours,
            minutes: this.state.minutes,
            period: this.state.period,
            value: this.value
          },
          bubbles: true,
          composed: true
        }));
        if (!this.inline) this.close();
      });
    }
    const clockFace = this.shadowRoot.querySelector(".clock-face");
    if (clockFace) {
      const updateFromAngle = (e) => {
        const rect = clockFace.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        let rad = Math.atan2(dy, dx) + Math.PI / 2;
        if (rad < 0) rad += Math.PI * 2;
        let deg = rad * (180 / Math.PI);
        const norm = (deg % 360 + 360) % 360;
        if (this.state.activeUnit === "hours") {
          let h = Math.round(norm / 30);
          if (h === 0 || h === 12) h = 12;
          this.state.hours = h;
        } else {
          let m = Math.round(norm / 6);
          if (m === 60) m = 0;
          this.state.minutes = m;
        }
        this._updateDisplay();
      };
      clockFace.addEventListener("pointerdown", (e) => {
        this._isDragging = true;
        clockFace.setPointerCapture?.(e.pointerId);
        updateFromAngle(e);
      });
      clockFace.addEventListener("pointermove", (e) => {
        if (this._isDragging) updateFromAngle(e);
      });
      const onEnd = () => {
        if (!this._isDragging) return;
        this._isDragging = false;
        this._emitChange();
        if (this.state.activeUnit === "hours") {
          setTimeout(() => {
            this.state.activeUnit = "minutes";
            this._updateDisplay(true);
          }, 200);
        }
      };
      clockFace.addEventListener("pointerup", onEnd);
      clockFace.addEventListener("pointercancel", onEnd);
    }
    this._updateDisplay(true);
  }
  _emitChange() {
    this.dispatchEvent(new CustomEvent("change", {
      detail: {
        hours: this.state.hours,
        minutes: this.state.minutes,
        period: this.state.period,
        value: this.value
      },
      bubbles: true,
      composed: true
    }));
  }
  _calcShortestRotation(currentAngle, targetAngle) {
    let diff = (targetAngle - currentAngle) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return currentAngle + diff;
  }
  _updateDisplay(rebuildNumbers = false) {
    const isHours = this.state.activeUnit === "hours";
    const hourCard = this.shadowRoot.querySelector("#hour-card");
    const minCard = this.shadowRoot.querySelector("#min-card");
    const hourValEl = this.shadowRoot.querySelector("#hour-val");
    const minValEl = this.shadowRoot.querySelector("#min-val");
    if (hourCard && minCard) {
      hourCard.classList.toggle("active", isHours);
      minCard.classList.toggle("active", !isHours);
    }
    if (hourValEl) hourValEl.textContent = String(this.state.hours).padStart(2, "0");
    if (minValEl) minValEl.textContent = String(this.state.minutes).padStart(2, "0");
    const hourInput = this.shadowRoot.querySelector("#hour-input");
    const minInput = this.shadowRoot.querySelector("#min-input");
    if (hourInput && hourInput !== this.shadowRoot.activeElement) {
      hourInput.value = String(this.state.hours).padStart(2, "0");
    }
    if (minInput && minInput !== this.shadowRoot.activeElement) {
      minInput.value = String(this.state.minutes).padStart(2, "0");
    }
    const clockArm = this.shadowRoot.querySelector("#clock-arm");
    const targetDeg = isHours ? this.state.hours % 12 * 30 : this.state.minutes * 6;
    if (clockArm) {
      this._currentArmAngle = this._calcShortestRotation(this._currentArmAngle, targetDeg);
      clockArm.style.transform = `rotate(${this._currentArmAngle}deg)`;
    }
    const selectorDot = this.shadowRoot.querySelector(".selector-dot");
    if (selectorDot) {
      const isOffGrid = !isHours && this.state.minutes % 5 !== 0;
      selectorDot.style.display = isOffGrid ? "block" : "none";
    }
    if (rebuildNumbers) this._buildDialNumbers();
    this._highlightSelectedNumber();
  }
  _buildDialNumbers() {
    const clockFace = this.shadowRoot.querySelector(".clock-face");
    if (!clockFace) return;
    clockFace.querySelectorAll(".dial-number").forEach((el) => el.remove());
    const isHours = this.state.activeUnit === "hours";
    const total = 12;
    const radius = 100;
    for (let i = 1; i <= total; i++) {
      const val = isHours ? i : i === 12 ? 0 : i * 5;
      const label = isHours ? String(val) : String(val).padStart(2, "0");
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const cx = 128 + radius * Math.cos(angle);
      const cy = 128 + radius * Math.sin(angle);
      const numEl = document.createElement("div");
      numEl.className = "dial-number";
      numEl.setAttribute("data-val", String(val));
      numEl.style.left = `${cx}px`;
      numEl.style.top = `${cy}px`;
      numEl.textContent = label;
      numEl.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.state.activeUnit === "hours") {
          this.state.hours = val;
          this._updateDisplay();
          this._emitChange();
          setTimeout(() => {
            this.state.activeUnit = "minutes";
            this._updateDisplay(true);
          }, 250);
        } else {
          this.state.minutes = val;
          this._updateDisplay();
          this._emitChange();
        }
      });
      clockFace.appendChild(numEl);
    }
  }
  _highlightSelectedNumber() {
    const isHours = this.state.activeUnit === "hours";
    const targetVal = isHours ? this.state.hours : this.state.minutes;
    this.shadowRoot.querySelectorAll(".dial-number").forEach((el) => {
      const val = parseInt(el.getAttribute("data-val"), 10);
      const isMatch = isHours ? val === targetVal || val === 12 && targetVal === 0 : val === targetVal;
      el.classList.toggle("selected", isMatch);
    });
  }
  render() {
    const isHorizontal = this.state.layoutType === "horizontal";
    const isInputMode = this.state.mode === "input";
    const isRich = this.state.richColors;
    const hh = String(this.state.hours).padStart(2, "0");
    const mm = String(this.state.minutes).padStart(2, "0");
    const dialogContent = `
      <div class="picker-dialog ${this.state.layoutType} ${isRich ? "rich" : ""} ${isInputMode ? "input-mode" : ""}" part="dialog">
        <div class="picker-header">
          <span class="header-title">${isInputMode ? "Enter time" : "Select time"}</span>
        </div>

        <div class="main-layout-wrap ${isHorizontal ? "horizontal" : "vertical"}">
          <!-- Time Display Cards (HH : MM + AM/PM) -->
          <div class="time-display-section ${isHorizontal ? "horizontal" : ""}">
            <div class="time-cards-row">
              ${isInputMode ? `
                <div class="input-card-wrap">
                  <input type="text" id="hour-input" class="time-input-field" maxlength="2" value="${hh}" aria-label="Hour" />
                  <span class="input-sublabel">Hour</span>
                </div>
                <div class="time-separator">:</div>
                <div class="input-card-wrap">
                  <input type="text" id="min-input" class="time-input-field" maxlength="2" value="${mm}" aria-label="Minute" />
                  <span class="input-sublabel">Minute</span>
                </div>
              ` : `
                <button class="time-card active" id="hour-card" type="button" aria-label="Select hour">
                  <span class="time-val" id="hour-val">${hh}</span>
                </button>
                <div class="time-separator">:</div>
                <button class="time-card" id="min-card" type="button" aria-label="Select minute">
                  <span class="time-val" id="min-val">${mm}</span>
                </button>
              `}

              ${!this.state.is24Hour && !isHorizontal ? `
                <div class="period-toggle-column">
                  <button class="period-btn ${this.state.period === "AM" ? "active" : ""}" id="am-btn" type="button">AM</button>
                  <button class="period-btn ${this.state.period === "PM" ? "active" : ""}" id="pm-btn" type="button">PM</button>
                </div>
              ` : ""}
            </div>

            ${!this.state.is24Hour && isHorizontal ? `
              <div class="period-toggle-row">
                <button class="period-btn ${this.state.period === "AM" ? "active" : ""}" id="am-btn" type="button">AM</button>
                <button class="period-btn ${this.state.period === "PM" ? "active" : ""}" id="pm-btn" type="button">PM</button>
              </div>
            ` : ""}
          </div>

          <!-- Clock Dial (Rendered in Dial Mode) -->
          ${!isInputMode ? `
            <div class="dial-section">
              <div class="clock-face" role="slider" aria-label="Clock Dial" aria-valuemin="0" aria-valuemax="59">
                <div class="dial-center-dot"></div>
                <div class="clock-arm" id="clock-arm">
                  <div class="clock-hand-line"></div>
                  <div class="clock-selector-head">
                    <div class="selector-dot"></div>
                  </div>
                </div>
              </div>
            </div>
          ` : ""}
        </div>

        <!-- Footer Actions Bar -->
        <div class="picker-footer">
          <button class="icon-btn mode-switch" id="mode-toggle-btn" type="button" aria-label="Toggle input mode">
            <span class="ico">${isInputMode ? "schedule" : "keyboard"}</span>
          </button>
          <div class="action-buttons">
            <button class="text-btn" id="cancel-btn" type="button">Cancel</button>
            <button class="text-btn primary" id="ok-btn" type="button">OK</button>
          </div>
        </div>
      </div>
    `;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle28}</style>`}
      ${this.inline ? dialogContent : `<div class="scrim" role="dialog" aria-modal="true">${dialogContent}</div>`}
    `;
  }
};
if (!customElements.get("md-time-picker")) {
  customElements.define("md-time-picker", MdTimePicker);
}

// src/components/md-list.js
var listDefaultStyle = `
  :host {
    display: flex;
    flex-direction: column;
    width: 100%;
    outline: none;
  }

  .list {
    display: flex;
    flex-direction: column;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 0;
    margin: 0;
    list-style: none;
  }

  .list.segmented {
    gap: 8px;
    padding: 8px;
  }
`;
var listSheet = createComponentSheet(listDefaultStyle);
var MdList = class extends HTMLElement {
  static get observedAttributes() {
    return ["variant"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, listSheet);
    this._rendered = false;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._sync();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    this._sync();
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "standard");
  }
  // 'standard' | 'segmented'
  _sync() {
    const list = this.shadowRoot.querySelector(".list");
    if (!list) return;
    list.className = `list ${this.variant}`;
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${listDefaultStyle}</style>`}
      <div class="list ${escapeHtml(this.variant)}" role="list">
        <slot></slot>
      </div>
    `;
  }
};
var listItemDefaultStyle = `
  :host {
    display: block;
    width: 100%;
    outline: none;
  }

  .item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 56px;
    padding: 8px 16px;
    box-sizing: border-box;
    color: var(--md-sys-color-on-surface, #E6E0E9);
    font-family: var(--md-sys-typescale-font-family, system-ui, sans-serif);
    background-color: transparent;
    border-radius: var(--md-sys-shape-corner-medium, 12px);
    transition:
      background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease),
      border-radius var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-spatial, ease),
      color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
    outline: none;
    will-change: transform;
    -webkit-tap-highlight-color: transparent;
  }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -2px;
    z-index: 2;
  }

  .item.segmented {
    border-radius: var(--md-sys-shape-corner-large, 16px);
    background-color: var(--md-sys-color-surface-container-low, #F7F2FA);
  }

  .item.selected {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8) !important;
    color: var(--md-sys-color-on-secondary-container, #1D192B) !important;
    border-radius: var(--md-sys-shape-corner-large, 16px);
  }

  .item.interactive {
    cursor: pointer;
    user-select: none;
  }

  /* State layer */
  .item.interactive::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, ease);
  }
  .item.interactive:hover:not(.disabled)::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .item.interactive:focus-visible:not(.disabled)::before {
    opacity: var(--md-sys-state-focus-state-layer-opacity, 0.12);
  }
  .item.interactive.pressed:not(.disabled)::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }

  .item.disabled {
    opacity: 0.38;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Leading Elements */
  .leading-slot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .ico {
    font-family: 'Material Symbols Outlined';
    font-size: 24px;
    line-height: 1;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
  .item.selected .ico {
    color: var(--md-sys-color-on-secondary-container, #1D192B);
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
    display: flex;
    align-items: center;
    justify-content: center;
    font: var(--md-sys-typescale-title-medium, 500 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-medium-tracking, 0.2px);
    object-fit: cover;
  }

  .image-thumb {
    width: 56px;
    height: 56px;
    border-radius: var(--md-sys-shape-corner-small, 8px);
    object-fit: cover;
  }

  /* Content */
  .content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    min-width: 0;
  }

  .overline {
    font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    text-transform: uppercase;
  }

  .headline {
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-large-tracking, 0.5px);
    color: inherit;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .supporting-text {
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-body-medium-tracking, 0.2px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item.selected .supporting-text,
  .item.selected .overline {
    color: var(--md-sys-color-on-secondary-container, #1D192B);
    opacity: 0.8;
  }

  /* Trailing Elements */
  .trailing {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
`;
var listItemSheet = createComponentSheet(listItemDefaultStyle);
var MdListItem = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "headline",
      "supporting-text",
      "overline",
      "trailing-text",
      "icon",
      "trailing-icon",
      "avatar",
      "image",
      "selected",
      "interactive",
      "disabled",
      "variant",
      "href",
      "shape",
      "enabled",
      "vertical-alignment",
      "checked"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, listItemSheet);
    this._rendered = false;
    this._abortController = null;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._setup();
    this._sync();
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === "selected" || name === "checked") {
      if (name === "checked") {
        if (this.hasAttribute("checked") && !this.hasAttribute("selected")) this.setAttribute("selected", "");
        else if (!this.hasAttribute("checked") && this.hasAttribute("selected")) this.removeAttribute("selected");
      }
    }
    this._sync();
  }
  get headline() {
    return this.getAttribute("headline") || "";
  }
  get supportingText() {
    return this.getAttribute("supporting-text") || "";
  }
  get overline() {
    return this.getAttribute("overline") || "";
  }
  get trailingText() {
    return this.getAttribute("trailing-text") || "";
  }
  get icon() {
    return this.getAttribute("icon") || "";
  }
  get trailingIcon() {
    return this.getAttribute("trailing-icon") || "";
  }
  get avatar() {
    return this.getAttribute("avatar") || "";
  }
  get image() {
    return this.getAttribute("image") || "";
  }
  get selected() {
    return this.hasAttribute("selected") || this.hasAttribute("checked");
  }
  set selected(val) {
    if (val) {
      this.setAttribute("selected", "");
    } else {
      this.removeAttribute("selected");
      this.removeAttribute("checked");
    }
  }
  get checked() {
    return this.selected;
  }
  set checked(val) {
    this.selected = val;
  }
  get verticalAlignment() {
    return this.getAttribute("vertical-alignment") || "center";
  }
  set verticalAlignment(val) {
    if (val === null || val === void 0) this.removeAttribute("vertical-alignment");
    else this.setAttribute("vertical-alignment", val);
  }
  get enabled() {
    if (this.hasAttribute("disabled")) return false;
    return this.getAttribute("enabled") !== "false";
  }
  set enabled(val) {
    if (val) {
      this.removeAttribute("disabled");
      this.setAttribute("enabled", "true");
    } else {
      this.setAttribute("disabled", "");
      this.setAttribute("enabled", "false");
    }
  }
  get interactive() {
    return this.hasAttribute("interactive") || this.hasAttribute("href");
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(val) {
    if (val) this.setAttribute("disabled", "");
    else this.removeAttribute("disabled");
  }
  get variant() {
    if (this.hasAttribute("variant")) return sanitizeAttribute(this.getAttribute("variant"));
    const parentList = this.closest("md-list");
    return parentList ? parentList.variant : "standard";
  }
  get href() {
    return this.getAttribute("href") || "";
  }
  _sync() {
    const item = this.shadowRoot.querySelector(".item");
    if (!item) return;
    const isInteractive = this.interactive && !this.disabled;
    const v = this.variant;
    item.className = `item ${v}${this.selected ? " selected" : ""}${isInteractive ? " interactive" : ""}${this.disabled ? " disabled" : ""}`;
    item.setAttribute("tabindex", isInteractive ? "0" : "-1");
    item.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    if (isInteractive) {
      item.setAttribute("role", this.href ? "link" : this.hasAttribute("selected") ? "option" : "button");
      if (this.hasAttribute("selected")) {
        item.setAttribute("aria-selected", this.selected ? "true" : "false");
      }
    } else {
      item.setAttribute("role", "listitem");
    }
  }
  _setup() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const item = this.shadowRoot.querySelector(".item");
    if (!item) return;
    const press = () => {
      if (!this.interactive || this.disabled) return;
      pressScale(item, 0.98, "expressiveSpatialFast");
    };
    const release = () => {
      if (!this.interactive || this.disabled) return;
      releaseScale(item, 0.98, "expressiveSpatialMedium");
    };
    const activate = () => {
      if (!this.interactive || this.disabled) return;
      if (this.href) {
        window.open(this.href, "_self");
      }
      this.dispatchEvent(new CustomEvent("action", {
        detail: { href: this.href },
        bubbles: true,
        composed: true
      }));
    };
    item.addEventListener("click", activate, { signal });
    bindPress(item, {
      disabled: () => !this.interactive || this.disabled,
      onPress: press,
      onRelease: release,
      signal
    });
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${listItemDefaultStyle}</style>`}
      <div class="item ${escapeHtml(this.variant)}" part="item">
        <div class="leading-slot">
          ${this.avatar ? `<img class="avatar" src="${escapeHtml(this.avatar)}" alt="Avatar">` : ""}
          ${this.image ? `<img class="image-thumb" src="${escapeHtml(this.image)}" alt="Thumbnail">` : ""}
          ${this.icon && !this.avatar && !this.image ? `<span class="ico" aria-hidden="true">${escapeHtml(this.icon)}</span>` : ""}
          <slot name="start"></slot>
        </div>

        <div class="content">
          ${this.overline ? `<span class="overline">${escapeHtml(this.overline)}</span>` : ""}
          <div class="headline">${escapeHtml(this.headline)}<slot></slot></div>
          ${this.supportingText ? `<span class="supporting-text">${escapeHtml(this.supportingText)}</span>` : ""}
        </div>

        <div class="trailing">
          ${this.trailingText ? `<span class="trailing-text">${escapeHtml(this.trailingText)}</span>` : ""}
          ${this.trailingIcon ? `<span class="ico" aria-hidden="true">${escapeHtml(this.trailingIcon)}</span>` : ""}
          <slot name="end"></slot>
        </div>
      </div>
    `;
    this._sync();
  }
};
if (!customElements.get("md-list")) {
  customElements.define("md-list", MdList);
}
if (!customElements.get("md-list-item")) {
  customElements.define("md-list-item", MdListItem);
}

// src/components/md-menu.js
var defaultStyle29 = `
  :host { display: inline-block; outline: none; position: relative; }

  .trigger {
    min-width: 48px; min-height: 48px;   /* touch target */
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 0 12px;
    border: none;
    background-color: transparent;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    cursor: pointer;
    outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .trigger:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .trigger.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .trigger:focus { outline: none; }
  .trigger:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  .scrim { position: fixed; inset: 0; background: transparent; z-index: 999; }
  :host(:not([open])) .scrim, :host(:not([open])) .menu { display: none; }

  .menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 1000;
    min-width: 112px;
    max-width: 280px;
    margin: 0;
    padding: 8px 0;
    list-style: none;
    /* Base: CornerExtraSmall(4), elevation Level2 */
    border-radius: var(--md-sys-shape-corner-extra-small, 4px);
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    box-shadow: var(--md-sys-elevation-level-2, 0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15));
    outline: none;
  }

  /* Vibrant: tertiary-container */
  :host([variant="vibrant"]) .menu {
    background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
    color: var(--md-sys-color-on-tertiary-container, #31111D);
  }

  /* Segmented: CornerLarge(16), 44dp item height */
  :host([variant="segmented"]) .menu {
    border-radius: var(--md-sys-shape-corner-large, 16px);
    padding: 8px;
    gap: 4px;
    display: flex;
    flex-direction: column;
  }

  .item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;                 /* touch target */
    padding: 0 16px;                  /* leading/trailing 16dp */
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    color: var(--md-sys-color-on-surface, #1D1B20);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    text-align: start;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  :host([variant="segmented"]) .item {
    min-height: 44px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
  }
  .item:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .item.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, transparent); }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -3px;
  }
  .item[aria-disabled="true"] { opacity: 0.38; cursor: not-allowed; }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    color: var(--md-sys-color-on-surface-variant, #49454F);
    flex: 0 0 auto;
  }

  .label { flex: 1 1 auto; color: inherit; }

  .trailing {
    font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    flex: 0 0 auto;
  }
`;
var menuSheet = createComponentSheet(defaultStyle29);
var MdMenu = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "items",
      "open",
      "variant",
      "label",
      "selected",
      "expanded",
      "offset-x",
      "offset-y",
      "container-color",
      "enabled",
      "horizontal-arrangement"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, menuSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._onDocClick = this._onDocClick.bind(this);
  }
  get items() {
    const raw = this.getAttribute("items");
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    v ? this.setAttribute("open", "") : this.removeAttribute("open");
  }
  get expanded() {
    return this.open;
  }
  set expanded(v) {
    this.open = Boolean(v);
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "standard");
  }
  get selected() {
    return parseInt(this.getAttribute("selected") ?? "-1", 10);
  }
  set selected(i) {
    this.setAttribute("selected", String(i));
  }
  get offsetX() {
    const v = parseFloat(this.getAttribute("offset-x"));
    return isNaN(v) ? 0 : v;
  }
  set offsetX(v) {
    if (v === null || v === void 0) this.removeAttribute("offset-x");
    else this.setAttribute("offset-x", String(v));
  }
  get offsetY() {
    const v = parseFloat(this.getAttribute("offset-y"));
    return isNaN(v) ? 0 : v;
  }
  set offsetY(v) {
    if (v === null || v === void 0) this.removeAttribute("offset-y");
    else this.setAttribute("offset-y", String(v));
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get enabled() {
    if (this.hasAttribute("disabled")) return false;
    return this.getAttribute("enabled") !== "false";
  }
  set enabled(v) {
    if (v) {
      this.removeAttribute("disabled");
      this.setAttribute("enabled", "true");
    } else {
      this.setAttribute("disabled", "");
      this.setAttribute("enabled", "false");
    }
  }
  get horizontalArrangement() {
    return this.getAttribute("horizontal-arrangement") || "start";
  }
  set horizontalArrangement(v) {
    if (v === null || v === void 0) this.removeAttribute("horizontal-arrangement");
    else this.setAttribute("horizontal-arrangement", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
    if (this.open) this._activate();
  }
  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown);
    document.removeEventListener("click", this._onDocClick);
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "open") {
      const trigger = this.shadowRoot.querySelector(".trigger");
      if (trigger) trigger.setAttribute("aria-expanded", this.open ? "true" : "false");
      this.open ? this._activate() : this._deactivate();
    } else if (name === "items" || name === "variant" || name === "label") {
      this.render();
      this.setupInteractions();
    } else if (name === "selected") {
      this._applySelection();
    }
  }
  show() {
    this.open = true;
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }
  toggle() {
    this.open ? this.close() : this.show();
  }
  render() {
    const items = this.items;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle29}</style>`}
      <div class="scrim" part="scrim"></div>
      <button class="trigger" type="button" aria-haspopup="menu"
        aria-expanded="${this.open ? "true" : "false"}">
        <slot name="trigger"><span>${escapeHtml(this.getAttribute("label") || "Menu")}</span></slot>
      </button>

      <ul class="menu" role="menu" aria-label="${escapeHtml(this.getAttribute("label") || "Menu")}">
        ${items.map((it, i) => `
          <li role="none" style="list-style: none;">
            <button class="item" type="button" role="menuitem"
              tabindex="-1" data-index="${i}"
              ${it.disabled ? 'aria-disabled="true"' : ""}>
              ${it.icon ? `<span class="icon material-symbols-rounded">${escapeHtml(it.icon)}</span>` : ""}
              <span class="label">${escapeHtml(it.label || "")}</span>
              ${it.trailing ? `<span class="trailing">${escapeHtml(it.trailing)}</span>` : ""}
            </button>
          </li>
        `).join("")}
        <slot></slot>
      </ul>
    `;
  }
  _menuItems() {
    return [...this.shadowRoot.querySelectorAll('.item:not([aria-disabled="true"])')];
  }
  _activate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.removeEventListener("click", this._onDocClick);
    document.addEventListener("keydown", this._onKeydown);
    document.addEventListener("click", this._onDocClick);
    const menu = this.shadowRoot.querySelector(".menu");
    if (menu) SpringPhysics.animateProperty(menu, "scale", 0.9, 1, "expressiveSpatialMedium");
    const items = this._menuItems();
    if (items.length) items[0].focus({ preventScroll: true });
  }
  _deactivate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.removeEventListener("click", this._onDocClick);
    const trigger = this.shadowRoot.querySelector(".trigger");
    if (trigger) trigger.focus({ preventScroll: true });
  }
  _onDocClick(e) {
    if (!this.open) return;
    if (!e.composedPath().includes(this)) this.close();
  }
  _onKeydown(e) {
    if (!this.open) return;
    const items = this._menuItems();
    const active = this.shadowRoot.activeElement;
    const i = items.indexOf(active);
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1 + items.length) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  }
  _applySelection() {
    this.shadowRoot.querySelectorAll(".item").forEach((el, i) => {
      el.setAttribute("data-selected", i === this.selected ? "true" : "false");
    });
  }
  _pressSpring(el) {
    let pressed = false;
    el.addEventListener("pointerdown", (e) => {
      if (el.getAttribute("aria-disabled") === "true") return;
      el.setPointerCapture?.(e.pointerId);
      pressed = true;
      el.classList.add("pressed");
      SpringPhysics.animateProperty(el, "scale", 1, 0.96, "expressiveSpatialFast");
    });
    const release = () => {
      if (!pressed) return;
      pressed = false;
      el.classList.remove("pressed");
      SpringPhysics.animateProperty(el, "scale", 0.96, 1, "expressiveSpatialMedium");
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      el.classList.add("pressed");
      SpringPhysics.animateProperty(el, "scale", 1, 0.96, "expressiveSpatialFast");
    });
    el.addEventListener("keyup", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      el.classList.remove("pressed");
      SpringPhysics.animateProperty(el, "scale", 0.96, 1, "expressiveSpatialMedium");
    });
  }
  setupInteractions() {
    const trigger = this.shadowRoot.querySelector(".trigger");
    if (trigger) {
      this._pressSpring(trigger);
      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) scrim.addEventListener("click", () => this.close());
    this.shadowRoot.querySelectorAll(".item").forEach((el, i) => {
      this._pressSpring(el);
      el.addEventListener("click", () => {
        if (el.getAttribute("aria-disabled") === "true") return;
        this.selected = i;
        this.dispatchEvent(new CustomEvent("select", {
          detail: { index: i, item: this.items[i] },
          bubbles: true,
          composed: true
        }));
        this.close();
      });
    });
  }
};
if (!customElements.get("md-menu")) {
  customElements.define("md-menu", MdMenu);
}
var MdMenuItem = class extends HTMLElement {
  static get observedAttributes() {
    return ["icon", "label", "trailing-text", "selected", "checked", "disabled"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
    }
    this._sync();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered) return;
    if (name === "checked") {
      if (this.hasAttribute("checked") && !this.hasAttribute("selected")) this.setAttribute("selected", "");
      else if (!this.hasAttribute("checked") && this.hasAttribute("selected")) this.removeAttribute("selected");
    }
    this._sync();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(v) {
    v ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
  }
  get selected() {
    return this.hasAttribute("selected") || this.hasAttribute("checked");
  }
  set selected(v) {
    if (v) {
      this.setAttribute("selected", "");
    } else {
      this.removeAttribute("selected");
      this.removeAttribute("checked");
    }
  }
  get checked() {
    return this.selected;
  }
  set checked(v) {
    this.selected = v;
  }
  _sync() {
    const el = this.shadowRoot.querySelector(".item");
    if (!el) return;
    el.className = `item ${this.selected ? "selected" : ""} ${this.disabled ? "disabled" : ""}`;
    el.setAttribute("role", "menuitem");
    el.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    el.setAttribute("tabindex", this.disabled ? "-1" : "0");
  }
  setupInteractions() {
    const el = this.shadowRoot.querySelector(".item");
    if (!el) return;
    el.addEventListener("click", () => {
      if (this.disabled) return;
      this.dispatchEvent(new CustomEvent("select", { bubbles: true, composed: true }));
    });
    el.addEventListener("keydown", (e) => {
      if (this.disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        el.click();
      }
    });
  }
  render() {
    const icon = this.getAttribute("icon");
    const label = this.getAttribute("label") || "";
    const trailingText = this.getAttribute("trailing-text");
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; outline: none; }
        .item {
          display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 16px;
          color: var(--md-sys-color-on-surface, #1D1B20); cursor: pointer; user-select: none;
          font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-label-large-tracking, 0.1px);
          outline: none;
          transition: background-color var(--md-sys-motion-duration-short2, 200ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2,0,0,1));
        }
        .item:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
        .item.selected { background-color: var(--md-sys-color-secondary-container, #E8DEF8); color: var(--md-sys-color-on-secondary-container, #1D192B); }
        .item.disabled { opacity: 0.38; cursor: not-allowed; pointer-events: none; }
        .item:focus-visible { outline: 3px solid var(--md-sys-color-primary, #6750A4); outline-offset: -3px; }
        .ico { font-family: 'Material Symbols Outlined'; font-size: 24px; color: var(--md-sys-color-on-surface-variant, #49454F); flex-shrink: 0; }
        .item.selected .ico { color: var(--md-sys-color-on-secondary-container, #1D192B); }
        .trailing {
          margin-left: auto;
          font: var(--md-sys-typescale-label-small, 500 11px/16px Roboto, sans-serif);
          letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
          color: var(--md-sys-color-on-surface-variant, #49454F);
        }
      </style>
      <div class="item" role="menuitem">
        ${icon ? `<span class="ico" aria-hidden="true">${escapeHtml(icon)}</span>` : ""}
        <span class="label"><slot>${escapeHtml(label)}</slot></span>
        ${trailingText ? `<span class="trailing">${escapeHtml(trailingText)}</span>` : ""}
      </div>
    `;
    this.setupInteractions();
    this._sync();
  }
};
if (!customElements.get("md-menu-item")) {
  customElements.define("md-menu-item", MdMenuItem);
}

// src/components/md-search-bar.js
var defaultStyle30 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; display: block; outline: none; position: relative; }
  :host([disabled]) .bar { opacity: 0.38; cursor: not-allowed; }

  .bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 16px;
    height: 56px;                    /* ContainerHeight 56dp */
    min-height: 48px;
    padding: 0 16px;
    border-radius: var(--md-sys-shape-corner-full, 9999px);  /* CornerFull */
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
    cursor: text;
    transition:
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }
  .bar:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, var(--md-sys-color-surface-container-high, #ECE6F0)); }
  .bar.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 10%, var(--md-sys-color-surface-container-high, #ECE6F0)); }

  .leading, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    color: var(--md-sys-color-on-surface, #1D1B20);
    flex: 0 0 auto;
  }
  .trailing {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 48px; min-height: 48px;
    border: none; background: transparent; cursor: pointer; outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    color: var(--md-sys-color-on-surface-variant, #49454F);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .trailing:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 8%, transparent); }
  .trailing.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface-variant, #49454F) 10%, transparent); }
  .trailing:focus { outline: none; }
  .trailing:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  .input {
    flex: 1 1 auto;
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #1D1B20);
  }
  .input:focus { outline: none; }
  .input:focus-visible { outline: none; } /* ring lives on .bar */
  .input::placeholder { color: var(--md-sys-color-on-surface-variant, #49454F); }
  .input::-webkit-search-decoration,
  .input::-webkit-search-cancel-button,
  .input::-webkit-search-results-button,
  .input::-webkit-search-results-decoration {
    -webkit-appearance: none;
    appearance: none;
    display: none;
  }
  .bar:focus-within {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  /* Suggestions: listbox/option */
  .suggestions {
    position: absolute;
    inset-inline: 0;
    margin-top: 4px;
    padding: 8px 0;
    list-style: none;
    border-radius: var(--md-sys-shape-corner-extra-large, 28px);
    background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
    box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
    z-index: 10;
  }
  .suggestions[hidden] { display: none; }
  .option {
    display: flex; align-items: center;
    min-height: 48px;
    padding: 0 16px;
    font: var(--md-sys-typescale-body-large, 400 16px/24px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #1D1B20);
    cursor: pointer;
    outline: none;
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }
  .option:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #1D1B20) 8%, transparent); }
  .option:focus { outline: none; }
  .option:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -3px;
  }
`;
var searchBarSheet = createComponentSheet(defaultStyle30);
var MdSearchBar = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "placeholder",
      "value",
      "query",
      "suggestions",
      "disabled",
      "active",
      "expanded",
      "dropdown-gap-size",
      "dropdown-gap",
      "dropdown-scrim-color"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, searchBarSheet);
    this._rendered = false;
    this._abortController = null;
  }
  get value() {
    return this.getAttribute("value") || this.getAttribute("query") || "";
  }
  set value(v) {
    if (v === null || v === void 0) {
      this.removeAttribute("value");
      this.removeAttribute("query");
    } else {
      this.setAttribute("value", v);
    }
  }
  get query() {
    return this.value;
  }
  set query(v) {
    this.value = v;
  }
  get dropdownGapSize() {
    const g = parseFloat(this.getAttribute("dropdown-gap-size") || this.getAttribute("dropdown-gap"));
    return isNaN(g) ? 8 : g;
  }
  set dropdownGapSize(v) {
    if (v === null || v === void 0) {
      this.removeAttribute("dropdown-gap-size");
      this.removeAttribute("dropdown-gap");
    } else {
      this.setAttribute("dropdown-gap-size", String(v));
    }
  }
  get dropdownScrimColor() {
    return this.getAttribute("dropdown-scrim-color") || "";
  }
  set dropdownScrimColor(v) {
    if (v === null || v === void 0) this.removeAttribute("dropdown-scrim-color");
    else this.setAttribute("dropdown-scrim-color", v);
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  get active() {
    return this.hasAttribute("active") || this.hasAttribute("expanded");
  }
  set active(v) {
    if (v) this.setAttribute("active", "");
    else this.removeAttribute("active");
  }
  get expanded() {
    return this.active;
  }
  set expanded(v) {
    this.active = v;
  }
  get suggestions() {
    const raw = this.getAttribute("suggestions");
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    const input = this.shadowRoot.querySelector(".input");
    if (name === "value" && input && input.value !== newV) input.value = newV || "";
    else if (name === "placeholder" && input) input.placeholder = newV || "";
    else if (name === "disabled" && input) input.disabled = this.disabled;
    else if (name === "suggestions") this._renderSuggestions();
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle30}</style>`}
      <div class="wrapper" role="search">
        <div class="bar">
          <span class="leading material-symbols-rounded">search</span>
          <input class="input" type="search" role="searchbox"
            aria-label="${escapeHtml(this.getAttribute("aria-label") || "Search")}"
            placeholder="${escapeHtml(this.getAttribute("placeholder") || "Search")}"
            value="${escapeHtml(this.value)}"
            ${this.disabled ? "disabled" : ""}
            autocomplete="off" />
          <button class="trailing" type="button" aria-label="Clear search">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <ul class="suggestions" role="listbox" hidden></ul>
      </div>
    `;
    this._renderSuggestions();
  }
  _renderSuggestions() {
    const list = this.shadowRoot.querySelector(".suggestions");
    if (!list) return;
    const items = this.suggestions;
    list.innerHTML = items.map(
      (s, i) => `<li class="option" role="option" tabindex="-1" data-index="${i}" aria-selected="false">${escapeHtml(s)}</li>`
    ).join("");
    list.hidden = true;
    list.querySelectorAll(".option").forEach((opt) => {
      opt.addEventListener("click", () => this._choose(opt.textContent));
      opt.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this._choose(opt.textContent);
        }
      });
    });
  }
  _choose(text) {
    this.value = text;
    const input = this.shadowRoot.querySelector(".input");
    if (input) input.value = text;
    const list = this.shadowRoot.querySelector(".suggestions");
    if (list) list.hidden = true;
    this.dispatchEvent(new CustomEvent("search", { detail: { value: text }, bubbles: true, composed: true }));
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const input = this.shadowRoot.querySelector(".input");
    const bar = this.shadowRoot.querySelector(".bar");
    const list = this.shadowRoot.querySelector(".suggestions");
    const trailing = this.shadowRoot.querySelector(".trailing");
    if (input && bar) {
      input.addEventListener("focus", () => {
        if (this.suggestions.length) list.hidden = false;
      }, { signal });
      input.addEventListener("input", (e) => {
        this.value = e.target.value;
        this.dispatchEvent(new CustomEvent("input", { detail: { value: this.value }, bubbles: true, composed: true }));
      }, { signal });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (!list.hidden) {
            list.hidden = true;
          } else {
            this.value = "";
            input.value = "";
          }
        } else if (e.key === "ArrowDown" && !list.hidden) {
          const first = list.querySelector(".option");
          first?.focus();
          e.preventDefault();
        } else if (e.key === "Enter") {
          this.dispatchEvent(new CustomEvent("search", { detail: { value: this.value }, bubbles: true, composed: true }));
        }
      }, { signal });
    }
    if (trailing && input) {
      trailing.addEventListener("click", () => {
        this.value = "";
        input.value = "";
        if (list) list.hidden = true;
        input.focus();
        this.dispatchEvent(new CustomEvent("clear", { bubbles: true, composed: true }));
      }, { signal });
    }
    document.addEventListener("click", (e) => {
      if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
        if (list) list.hidden = true;
      }
    }, { signal });
  }
};
if (!customElements.get("md-search-bar")) {
  customElements.define("md-search-bar", MdSearchBar);
}

// src/components/md-side-sheet.js
var defaultStyle31 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; outline: none; display: contents; }
  :host(:not([open])) .scrim,
  :host(:not([open])) .sheet { display: none !important; }
  :host([open]) .scrim { display: block !important; }

  .scrim {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-scrim, #000);
    opacity: 0.4;
    z-index: 2000;
    touch-action: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .sheet {
    box-sizing: border-box;
    position: fixed;
    inset-block: 0;
    z-index: 2001;
    display: flex;
    flex-direction: column;
    width: 360px;                 /* ContainerWidth 360dp (drawer token) */
    max-width: 100vw;
    padding: 16px;
    background-color: var(--md-sys-color-surface-container-low, #F7F2FA);
    box-shadow: var(--md-sys-elevation-level-1, 0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15));
    overflow-y: auto;
  }
  /* Right-side: CornerLargeStart 16/0/0/16 */
  :host([position="right"]) .sheet,
  :host(:not([position])) .sheet {
    inset-inline-end: 0;
    border-radius: var(--md-sys-shape-corner-large, 16px) 0 0 var(--md-sys-shape-corner-large, 16px);
  }
  /* Left-side: CornerLargeEnd 0/16/16/0 */
  :host([position="left"]) .sheet {
    inset-inline-start: 0;
    border-radius: 0 var(--md-sys-shape-corner-large, 16px) var(--md-sys-shape-corner-large, 16px) 0;
  }

  .header {
    display: flex; align-items: center; gap: 8px;
    min-height: 48px;
  }
  .headline {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface-variant, #49454F);
  }
  .close {
    width: 40px; height: 40px;      /* touch target */
    display: inline-flex; align-items: center; justify-content: center;
    border: none; background: transparent; cursor: pointer; outline: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    transition: background-color var(--md-sys-motion-duration-short2, 100ms)
      var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      color var(--md-sys-motion-duration-short2, 100ms) ease;
  }
  .close:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 10%, transparent);
    color: var(--md-sys-color-on-surface, #E6E0E9);
  }
  .close.pressed:hover { background-color: color-mix(in srgb, var(--md-sys-color-on-surface, #E6E0E9) 15%, transparent); }
  .close:focus { outline: none; }
  .close:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #D0BCFF);
    outline-offset: 2px;
  }

  .material-symbols-rounded, .mat-sym {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    display: inline-block;
    text-transform: none;
    letter-spacing: normal;
    word-wrap: normal;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .content {
    flex: 1 1 auto;
    font: var(--md-sys-typescale-body-medium, 400 14px/20px Roboto, sans-serif);
    color: var(--md-sys-color-on-surface, #E6E0E9);
  }
`;
var sideSheetSheet = createComponentSheet(defaultStyle31);
var MdSideSheet = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "open",
      "modal",
      "headline",
      "position",
      "gestures-enabled",
      "scrim-color",
      "drawer-container-color",
      "drawer-content-color",
      "selected"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, sideSheetSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._abortController = null;
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    v ? this.setAttribute("open", "") : this.removeAttribute("open");
  }
  get modal() {
    return this.hasAttribute("modal");
  }
  get position() {
    return sanitizeAttribute(this.getAttribute("position") || "right");
  }
  get gesturesEnabled() {
    return this.getAttribute("gestures-enabled") !== "false";
  }
  set gesturesEnabled(v) {
    if (v) this.setAttribute("gestures-enabled", "true");
    else this.setAttribute("gestures-enabled", "false");
  }
  get scrimColor() {
    return this.getAttribute("scrim-color") || "";
  }
  set scrimColor(v) {
    if (v === null || v === void 0) this.removeAttribute("scrim-color");
    else this.setAttribute("scrim-color", v);
  }
  get drawerContainerColor() {
    return this.getAttribute("drawer-container-color") || "";
  }
  set drawerContainerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("drawer-container-color");
    else this.setAttribute("drawer-container-color", v);
  }
  get drawerContentColor() {
    return this.getAttribute("drawer-content-color") || "";
  }
  set drawerContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("drawer-content-color");
    else this.setAttribute("drawer-content-color", v);
  }
  get selected() {
    return this.hasAttribute("selected");
  }
  set selected(v) {
    if (v) this.setAttribute("selected", "");
    else this.removeAttribute("selected");
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
    if (this.open) this._activate();
  }
  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown);
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "open") this.open ? this._activate() : this._deactivate();
    else if (name === "headline") {
      const h = this.shadowRoot.querySelector(".headline");
      if (h) h.textContent = newV || "";
    } else if (name === "scrim-color" || name === "drawer-container-color" || name === "drawer-content-color" || name === "position") {
      this.render();
      this.setupInteractions();
    }
  }
  show() {
    this.open = true;
  }
  render() {
    const headline = this.getAttribute("headline") || "";
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle31}</style>`}
      <div class="scrim" part="scrim"></div>
      <aside class="sheet" role="dialog" aria-modal="${this.modal ? "true" : "false"}"
        aria-label="${escapeHtml(this.getAttribute("aria-label") || headline || "Side sheet")}">
        <div class="header">
          <span class="headline">${escapeHtml(headline)}</span>
          <button class="close" type="button" aria-label="Close">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>
        <div class="content"><slot></slot></div>
      </aside>
    `;
  }
  _focusable() {
    const s = this.shadowRoot.querySelector(".sheet");
    return [...s.querySelectorAll('button:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href],input,select,textarea')];
  }
  close() {
    this.open = false;
    this._deactivate();
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }
  _activate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.addEventListener("keydown", this._onKeydown);
    document.body.style.overflow = "hidden";
    const f = this._focusable();
    if (f.length) f[0].focus({ preventScroll: true });
    const sheet = this.shadowRoot.querySelector(".sheet");
    if (sheet) SpringPhysics.animateProperty(sheet, "scale", 0.97, 1, "expressiveSpatialMedium");
  }
  _deactivate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.body.style.overflow = "";
  }
  _onKeydown(e) {
    if (!this.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
      return;
    }
    if (e.key === "Tab") {
      const f = this._focusable();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      const active = this.shadowRoot.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) {
      const onScrimDismiss = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      };
      scrim.addEventListener("click", onScrimDismiss, { signal });
      scrim.addEventListener("pointerdown", onScrimDismiss, { signal });
      scrim.addEventListener("touchstart", onScrimDismiss, { signal, passive: false });
    }
    const el = this.shadowRoot.querySelector(".close");
    if (!el) return;
    let pressed = false;
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture?.(e.pointerId);
      pressed = true;
      el.classList.add("pressed");
      SpringPhysics.animateProperty(el, "scale", 1, 0.92, "expressiveSpatialFast");
    }, { signal });
    const release = () => {
      if (!pressed) return;
      pressed = false;
      el.classList.remove("pressed");
      SpringPhysics.animateProperty(el, "scale", 0.92, 1, "expressiveSpatialMedium");
    };
    el.addEventListener("pointerup", release, { signal });
    el.addEventListener("pointercancel", release, { signal });
    el.addEventListener("click", () => this.close(), { signal });
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      el.classList.add("pressed");
      SpringPhysics.animateProperty(el, "scale", 1, 0.92, "expressiveSpatialFast");
    }, { signal });
    el.addEventListener("keyup", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      el.classList.remove("pressed");
      SpringPhysics.animateProperty(el, "scale", 0.92, 1, "expressiveSpatialMedium");
    }, { signal });
  }
};
if (!customElements.get("md-side-sheet")) {
  customElements.define("md-side-sheet", MdSideSheet);
}

// src/components/md-tabs.js
var defaultStyle32 = `
  :host { display: block; outline: none; width: 100%; user-select: none; -webkit-user-select: none; }

  .tablist {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    min-height: 48px;                  /* ContainerHeight 48dp */
    border-radius: 0;
    background-color: transparent;     /* Transparent so it adopts parent card/surface seamlessly */
    box-shadow: none;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
  }
  /* Secondary: bottom divider surface-variant 1dp */
  :host([variant="secondary"]) .tablist {
    border-bottom: 1px solid var(--md-sys-color-surface-variant, rgba(255, 255, 255, 0.12));
  }

  .tab {
    position: relative;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 48px;
    min-height: 48px;                  /* touch target */
    user-select: none;
    -webkit-user-select: none;
    padding: 8px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    outline: none;
    color: var(--md-sys-color-on-surface-variant, #CAC4D0);
    -webkit-tap-highlight-color: transparent;
    border-radius: var(--md-sys-shape-corner-small, 8px) var(--md-sys-shape-corner-small, 8px) 0 0;
    transition: color var(--md-sys-motion-duration-short2, 200ms) cubic-bezier(0.2, 0, 0, 1);
  }
  .tab.with-icon { min-height: 64px; }  /* icon+label container height 64dp */

  /* M3 State Layer (Hover & Pressed) */
  .tab::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-color: var(--md-sys-color-on-surface, #FFFFFF);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--md-sys-motion-duration-short2, 200ms) cubic-bezier(0.2, 0, 0, 1);
  }
  .tab:hover:not([disabled])::before {
    opacity: var(--md-sys-state-hover-state-layer-opacity, 0.08);
  }
  .tab.pressed:not([disabled])::before {
    opacity: var(--md-sys-state-pressed-state-layer-opacity, 0.12);
  }
  .tab:focus { outline: none; }
  .tab:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: -3px;
  }
  .tab[disabled] { opacity: 0.38; cursor: not-allowed; }

  /* Active colors */
  :host([variant="primary"]) .tab[aria-selected="true"] {
    color: var(--md-sys-color-primary, #D0BCFF);
  }
  :host([variant="primary"]) .tab[aria-selected="true"]::before {
    background-color: var(--md-sys-color-primary, #D0BCFF);
  }

  :host([variant="secondary"]) .tab[aria-selected="true"] {
    color: var(--md-sys-color-on-surface, #E6E1E5);
    font-weight: var(--md-sys-typescale-title-small-emphasized-weight, 700);
  }
  :host([variant="secondary"]) .tab[aria-selected="true"]::before {
    background-color: var(--md-sys-color-on-surface, #E6E1E5);
  }

  /* Inner Content Wrapper for spring scale without box clipping */
  .tab-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    pointer-events: none;
    will-change: transform;
  }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }
  .label {
    font: var(--md-sys-typescale-title-small, 500 14px/20px Roboto, sans-serif);
    letter-spacing: var(--md-sys-typescale-title-small-tracking, 0.1px);
    color: inherit;
    white-space: nowrap;
  }
  .tab[aria-selected="true"] .label {
    font-weight: var(--md-sys-typescale-title-small-emphasized-weight, 700);
  }

  /* Active indicator: 3dp underline (primary) \u2014 token spec */
  .indicator {
    position: absolute;
    bottom: 0;
    height: 3px;                       /* ActiveIndicatorHeight 3dp */
    background-color: var(--md-sys-color-primary, #D0BCFF);
    border-radius: 3px 3px 0 0;
    transition: transform var(--md-sys-motion-duration-medium2, 300ms)
      var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }
  :host([variant="secondary"]) .indicator {
    height: 2px;
    background-color: var(--md-sys-color-primary, #D0BCFF);
  }

  /* Expressive opt-in: pill active indicator */
  :host([pill]) .indicator { display: none; }
  :host([pill]) .tab[aria-selected="true"] {
    background-color: var(--md-sys-color-secondary-container, #4A4458);
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    color: var(--md-sys-color-on-secondary-container, #E8DEF8);
  }
`;
var tabsSheet = createComponentSheet(defaultStyle32);
var MdTabs = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "tabs",
      "selected",
      "selected-tab-index",
      "variant",
      "pill",
      "container-color",
      "content-color",
      "min-tab-width",
      "enabled",
      "selected-content-color",
      "unselected-content-color"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, tabsSheet);
    this._rendered = false;
    this._abortController = null;
  }
  get tabs() {
    const raw = this.getAttribute("tabs");
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  get selected() {
    const s = parseInt(this.getAttribute("selected") || this.getAttribute("selected-tab-index") || "0", 10);
    return isNaN(s) ? 0 : s;
  }
  set selected(i) {
    this.setAttribute("selected", String(i));
    this.setAttribute("selected-tab-index", String(i));
  }
  get selectedTabIndex() {
    return this.selected;
  }
  set selectedTabIndex(i) {
    this.selected = i;
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "primary");
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get selectedContentColor() {
    return this.getAttribute("selected-content-color") || "";
  }
  set selectedContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("selected-content-color");
    else this.setAttribute("selected-content-color", v);
  }
  get unselectedContentColor() {
    return this.getAttribute("unselected-content-color") || "";
  }
  set unselectedContentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("unselected-content-color");
    else this.setAttribute("unselected-content-color", v);
  }
  get minTabWidth() {
    const w = parseFloat(this.getAttribute("min-tab-width"));
    return isNaN(w) || w <= 0 ? 48 : w;
  }
  set minTabWidth(v) {
    if (v === null || v === void 0) this.removeAttribute("min-tab-width");
    else this.setAttribute("min-tab-width", String(v));
  }
  get enabled() {
    if (this.hasAttribute("disabled")) return false;
    return this.getAttribute("enabled") !== "false";
  }
  set enabled(v) {
    if (v) {
      this.removeAttribute("disabled");
      this.setAttribute("enabled", "true");
    } else {
      this.setAttribute("disabled", "");
      this.setAttribute("enabled", "false");
    }
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "selected" || name === "selected-tab-index") this._applySelection(true);
    else if (name === "tabs" || name === "variant" || name === "container-color" || name === "content-color" || name === "min-tab-width") {
      this.render();
      this.setupInteractions();
    }
  }
  render() {
    const tabs = this.tabs;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle32}</style>`}
      <div class="tablist" role="tablist" aria-label="${escapeHtml(this.getAttribute("aria-label") || "Tabs")}">
        ${tabs.map((t, i) => `
          <button class="tab ${t.icon ? "with-icon" : ""}" type="button" role="tab"
            id="tab-${i}" data-index="${i}"
            aria-selected="${i === this.selected ? "true" : "false"}"
            tabindex="${i === this.selected ? "0" : "-1"}"
            ${t.panel ? `aria-controls="${escapeHtml(t.panel)}"` : ""}>
            <div class="tab-content">
              ${t.icon ? `<span class="icon material-symbols-rounded">${escapeHtml(t.icon)}</span>` : ""}
              <span class="label">${escapeHtml(t.label || "")}</span>
            </div>
          </button>
        `).join("")}
        <div class="indicator" hidden></div>
      </div>
      <slot></slot>
    `;
  }
  _applySelection(animate) {
    const tabs = [...this.shadowRoot.querySelectorAll(".tab")];
    tabs.forEach((el, i) => {
      const active = i === this.selected;
      el.setAttribute("aria-selected", active ? "true" : "false");
      el.setAttribute("tabindex", active ? "0" : "-1");
    });
    this._moveIndicator(animate);
  }
  _moveIndicator(animate) {
    const ind = this.shadowRoot.querySelector(".indicator");
    const tab = this.shadowRoot.querySelector(`.tab[data-index="${this.selected}"]`);
    if (!ind || !tab) return;
    ind.hidden = false;
    ind.style.width = `${tab.offsetWidth}px`;
    ind.style.transform = `translateX(${tab.offsetLeft}px)`;
  }
  _select(i) {
    if (this.selected === i) return;
    this.selected = i;
    this.dispatchEvent(new CustomEvent("change", { detail: { index: i }, bubbles: true, composed: true }));
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    const tabs = [...this.shadowRoot.querySelectorAll(".tab")];
    requestAnimationFrame(() => this._moveIndicator(false));
    tabs.forEach((el, i) => {
      let pressed = false;
      const content = el.querySelector(".tab-content") || el;
      el.addEventListener("pointerdown", (e) => {
        if (el.hasAttribute("disabled")) return;
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add("pressed");
        SpringPhysics.animateProperty(content, "scale", 1, 0.94, "expressiveSpatialFast");
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(content, "scale", 0.94, 1, "expressiveSpatialMedium");
      };
      el.addEventListener("pointerup", release, { signal });
      el.addEventListener("pointercancel", release, { signal });
      el.addEventListener("click", () => this._select(i), { signal });
      el.addEventListener("keydown", (e) => {
        const last = tabs.length - 1;
        if (e.key === "Enter" || e.key === " ") {
          el.classList.add("pressed");
          SpringPhysics.animateProperty(content, "scale", 1, 0.94, "expressiveSpatialFast");
          return;
        }
        let next = -1;
        if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
        else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = last;
        if (next >= 0) {
          e.preventDefault();
          tabs[next].focus();
          this._select(next);
        }
      }, { signal });
      el.addEventListener("keyup", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(content, "scale", 0.94, 1, "expressiveSpatialMedium");
      }, { signal });
    });
  }
};
if (!customElements.get("md-tabs")) {
  customElements.define("md-tabs", MdTabs);
}

// src/components/md-toolbar.js
var defaultStyle33 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none; display: inline-block; outline: none; user-select: none; -webkit-user-select: none; }

  .toolbar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    background-color: var(--md-sys-color-surface-container, #F3EDF7);
    color: var(--md-sys-color-on-surface, #1D1B20);
    user-select: none;
    -webkit-user-select: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      box-shadow var(--md-sys-motion-duration-medium1, 250ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9)),
      border-radius var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-spatial, cubic-bezier(0.42, 1.67, 0.21, 0.9));
  }

  .toolbar[aria-orientation="horizontal"] {
    flex-direction: row;
    height: 64px;
  }

  .toolbar[aria-orientation="vertical"] {
    flex-direction: column;
    width: 64px;
    height: auto;
  }

  /* Docked: CornerNone, leading/trailing 16dp, between min 4dp */
  .toolbar[data-variant="docked"] {
    border-radius: 0;
    padding: 0 16px;
    gap: 8px;
    width: 100%;
    box-shadow: none;
  }

  /* Floating: CornerFull (50% capsule), leading/trailing 8dp, between 4dp */
  .toolbar[data-variant="floating"] {
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    padding: 8px;
    gap: 8px;
    width: fit-content;
    box-shadow: var(--md-sys-elevation-level-3, 0 1px 3px rgba(0,0,0,.3), 0 4px 8px 3px rgba(0,0,0,.15));
  }

  /* Vibrant color style (floating): primary-container */
  .toolbar[data-variant="floating"][data-color="vibrant"] {
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
  }

  ::slotted(*) {
    flex-shrink: 0;
  }
`;
var toolbarSheet = createComponentSheet(defaultStyle33);
var MdToolbar = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "variant",
      "color",
      "orientation",
      "expanded",
      "fab-position",
      "animation-spec",
      "expanded-height",
      "collapsed-height",
      "container-color",
      "content-color",
      "horizontal-arrangement"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, toolbarSheet);
    this._rendered = false;
    this._abortController = null;
  }
  get variant() {
    return sanitizeAttribute(this.getAttribute("variant") || "docked");
  }
  // 'docked' | 'floating'
  get color() {
    return sanitizeAttribute(this.getAttribute("color") || "standard");
  }
  // 'standard' | 'vibrant'
  get orientation() {
    return sanitizeAttribute(this.getAttribute("orientation") || "horizontal");
  }
  // 'horizontal' | 'vertical'
  get expanded() {
    return this.hasAttribute("expanded");
  }
  set expanded(v) {
    if (v) this.setAttribute("expanded", "");
    else this.removeAttribute("expanded");
  }
  get fabPosition() {
    return this.getAttribute("fab-position") || "end";
  }
  set fabPosition(v) {
    if (v === null || v === void 0) this.removeAttribute("fab-position");
    else this.setAttribute("fab-position", v);
  }
  get animationSpec() {
    return this.getAttribute("animation-spec") || "";
  }
  set animationSpec(v) {
    if (v === null || v === void 0) this.removeAttribute("animation-spec");
    else this.setAttribute("animation-spec", v);
  }
  get expandedHeight() {
    const h = parseFloat(this.getAttribute("expanded-height"));
    return isNaN(h) ? 112 : h;
  }
  set expandedHeight(v) {
    if (v === null || v === void 0) this.removeAttribute("expanded-height");
    else this.setAttribute("expanded-height", String(v));
  }
  get collapsedHeight() {
    const h = parseFloat(this.getAttribute("collapsed-height"));
    return isNaN(h) ? 64 : h;
  }
  set collapsedHeight(v) {
    if (v === null || v === void 0) this.removeAttribute("collapsed-height");
    else this.setAttribute("collapsed-height", String(v));
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get horizontalArrangement() {
    return this.getAttribute("horizontal-arrangement") || "start";
  }
  set horizontalArrangement(v) {
    if (v === null || v === void 0) this.removeAttribute("horizontal-arrangement");
    else this.setAttribute("horizontal-arrangement", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
  }
  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "variant" || name === "color" || name === "orientation" || name === "container-color" || name === "content-color" || name === "horizontal-arrangement") {
      this.render();
      this.setupInteractions();
    }
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle33}</style>`}
      <div class="toolbar" role="toolbar" data-variant="${escapeHtml(this.variant)}" data-color="${escapeHtml(this.color)}"
        aria-label="${escapeHtml(this.getAttribute("aria-label") || "Toolbar")}" aria-orientation="${escapeHtml(this.orientation)}">
        <slot></slot>
      </div>
    `;
  }
  setupInteractions() {
    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;
    this.shadowRoot.querySelectorAll(".icon-wrap").forEach((el) => {
      let pressed = false;
      el.addEventListener("pointerdown", (e) => {
        el.setPointerCapture?.(e.pointerId);
        pressed = true;
        el.classList.add("pressed");
        SpringPhysics.animateProperty(el, "scale", 1, 0.92, "expressiveSpatialFast");
      }, { signal });
      const release = () => {
        if (!pressed) return;
        pressed = false;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.92, 1, "expressiveSpatialMedium");
      };
      el.addEventListener("pointerup", release, { signal });
      el.addEventListener("pointercancel", release, { signal });
      el.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        el.classList.add("pressed");
        SpringPhysics.animateProperty(el, "scale", 1, 0.92, "expressiveSpatialFast");
      }, { signal });
      el.addEventListener("keyup", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        el.classList.remove("pressed");
        SpringPhysics.animateProperty(el, "scale", 0.92, 1, "expressiveSpatialMedium");
      }, { signal });
    });
  }
};
if (!customElements.get("md-toolbar")) {
  customElements.define("md-toolbar", MdToolbar);
}

// src/components/md-fab-menu.js
var defaultStyle34 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    outline: none;
    display: inline-block;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
  }

  :host([open]) {
    z-index: 1000;
  }

  :host([fixed]) {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 1000;
  }

  .scrim {
    position: fixed;
    inset: 0;
    background-color: var(--md-sys-color-scrim, #000);
    opacity: 0.32;
    z-index: 999;
    display: none;
  }
  :host([fixed][open]) .scrim {
    display: block;
  }

  .anchor {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    z-index: 1000;
  }

  :host([fixed]) .anchor {
    align-items: flex-end;
    flex-direction: column-reverse;
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    position: absolute;
    left: 0;
    z-index: 1001;
    pointer-events: auto;
  }

  .list.placement-top {
    bottom: calc(100% + 8px);
    top: auto;
  }

  .list.placement-bottom {
    top: calc(100% + 8px);
    bottom: auto;
  }

  :host([fixed]) .list {
    align-items: flex-end;
    left: auto;
    right: 0;
    bottom: calc(100% + 8px);
    top: auto;
  }

  :host(:not([open])) .list {
    display: none;
  }

  .item {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    height: 56px;
    min-height: 48px;
    padding: 0 20px;
    border: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: var(--md-sys-color-primary-container, #EADDFF);
    color: var(--md-sys-color-on-primary-container, #21005D);
    font: var(--md-sys-typescale-label-large, 500 14px/20px Roboto, sans-serif);
    cursor: pointer;
    outline: none;
    white-space: nowrap;
    user-select: none;
    -webkit-user-select: none;
    box-shadow: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1));
  }

  :host([color="secondary"]) .item {
    background-color: var(--md-sys-color-secondary-container, #E8DEF8);
    color: var(--md-sys-color-on-secondary-container, #1D192B);
  }
  :host([color="tertiary"]) .item {
    background-color: var(--md-sys-color-tertiary-container, #FFD8E4);
    color: var(--md-sys-color-on-tertiary-container, #31111D);
  }
  .item:hover { background-color: color-mix(in srgb, currentColor 8%, var(--md-sys-color-primary-container, #EADDFF)); }
  .item.pressed:hover { background-color: color-mix(in srgb, currentColor 10%, var(--md-sys-color-primary-container, #EADDFF)); }
  .item:focus { outline: none; }
  .item:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }

  .icon, .material-symbols-rounded, .material-symbols-outlined {
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif;
    font-weight: normal;
    font-style: normal;
    font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }

  /* Trigger / close FAB: 56x56dp CornerFull */
  .fab {
    box-sizing: border-box;
    width: 56px; height: 56px;
    display: inline-flex; align-items: center; justify-content: center;
    border: none;
    border-radius: var(--md-sys-shape-corner-full, 9999px);
    background-color: var(--md-sys-color-primary, #6750A4);
    color: var(--md-sys-color-on-primary, #FFFFFF);
    cursor: pointer;
    outline: none;
    box-shadow: none;
    transition:
      background-color var(--md-sys-motion-duration-short2, 100ms) var(--md-sys-motion-easing-expressive-effects, cubic-bezier(0.2, 0, 0, 1)),
      transform var(--md-sys-motion-duration-short2, 150ms) ease;
  }

  :host([color="secondary"]) .fab {
    background-color: var(--md-sys-color-secondary, #625B71);
    color: var(--md-sys-color-on-secondary, #FFFFFF);
  }
  :host([color="tertiary"]) .fab {
    background-color: var(--md-sys-color-tertiary, #7D5260);
    color: var(--md-sys-color-on-tertiary, #FFFFFF);
  }
  .fab:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-primary, #FFF) 8%, var(--md-sys-color-primary, #6750A4));
    box-shadow: none;
  }
  .fab.pressed:hover {
    background-color: color-mix(in srgb, var(--md-sys-color-on-primary, #FFF) 10%, var(--md-sys-color-primary, #6750A4));
  }
  .fab:focus { outline: none; }
  .fab:focus-visible {
    outline: 3px solid var(--md-sys-color-primary, #6750A4);
    outline-offset: 2px;
  }
  .fab .icon { font-size: 24px; width: 24px; height: 24px; line-height: 24px; }
`;
var fabMenuSheet = createComponentSheet(defaultStyle34);
var MdFabMenu = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "items",
      "open",
      "color",
      "icon",
      "fixed",
      "label",
      "placement",
      "container-color",
      "content-color",
      "expanded",
      "fab-position",
      "animation-spec"
    ];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, fabMenuSheet);
    this._rendered = false;
    this._onKeydown = this._onKeydown.bind(this);
    this._onDocClick = this._onDocClick.bind(this);
  }
  get items() {
    const raw = this.getAttribute("items");
    const parsed = safeJsonParse(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  get open() {
    return this.hasAttribute("open");
  }
  set open(v) {
    v ? this.setAttribute("open", "") : this.removeAttribute("open");
  }
  get color() {
    return sanitizeAttribute(this.getAttribute("color") || "primary");
  }
  get fixed() {
    return this.hasAttribute("fixed");
  }
  set fixed(v) {
    if (v) this.setAttribute("fixed", "");
    else this.removeAttribute("fixed");
  }
  get placement() {
    return sanitizeAttribute(this.getAttribute("placement") || (this.fixed ? "top" : "bottom"));
  }
  set placement(v) {
    this.setAttribute("placement", v);
  }
  get containerColor() {
    return this.getAttribute("container-color") || "";
  }
  set containerColor(v) {
    if (v === null || v === void 0) this.removeAttribute("container-color");
    else this.setAttribute("container-color", v);
  }
  get contentColor() {
    return this.getAttribute("content-color") || "";
  }
  set contentColor(v) {
    if (v === null || v === void 0) this.removeAttribute("content-color");
    else this.setAttribute("content-color", v);
  }
  get expanded() {
    return this.open;
  }
  set expanded(v) {
    this.open = Boolean(v);
  }
  get fabPosition() {
    return this.getAttribute("fab-position") || "end";
  }
  set fabPosition(v) {
    if (v === null || v === void 0) this.removeAttribute("fab-position");
    else this.setAttribute("fab-position", v);
  }
  get animationSpec() {
    return this.getAttribute("animation-spec") || "";
  }
  set animationSpec(v) {
    if (v === null || v === void 0) this.removeAttribute("animation-spec");
    else this.setAttribute("animation-spec", v);
  }
  connectedCallback() {
    if (!this._rendered) {
      this.render();
      this._rendered = true;
      this.setupInteractions();
    }
    if (this.open) {
      this.style.zIndex = "1000";
      const parentCell = this.closest(".live-showcase-cell, .live-showcase-grid-row, .comp-card, .comp-preview");
      if (parentCell) parentCell.style.zIndex = "100";
      this._activate(false);
    }
  }
  disconnectedCallback() {
    document.removeEventListener("keydown", this._onKeydown);
    document.removeEventListener("click", this._onDocClick);
  }
  attributeChangedCallback(name, oldV, newV) {
    if (!this._rendered || oldV === newV) return;
    if (name === "open") {
      const parentCell = this.closest(".live-showcase-cell, .live-showcase-grid-row, .comp-card, .comp-preview");
      if (this.open) {
        this.style.zIndex = "1000";
        if (parentCell) parentCell.style.zIndex = "100";
      } else {
        this.style.zIndex = "";
        if (parentCell) parentCell.style.zIndex = "";
      }
      const t = this.shadowRoot.querySelector(".fab");
      const iconSpan = this.shadowRoot.querySelector(".fab .icon");
      if (t) {
        t.setAttribute("aria-expanded", this.open ? "true" : "false");
        t.setAttribute("aria-label", this.open ? "Close menu" : "Open menu");
      }
      if (iconSpan) {
        iconSpan.textContent = this.open ? "close" : this.getAttribute("icon") || "add";
      }
      this.open ? this._activate(true) : this._deactivate();
    } else if (name === "items" || name === "color" || name === "icon" || name === "fixed" || name === "placement") {
      this.render();
      this.setupInteractions();
    }
  }
  show() {
    this.open = true;
  }
  close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
  }
  toggle() {
    this.open ? this.close() : this.show();
  }
  _onDocClick(e) {
    if (!this.open) return;
    if (!this.contains(e.target) && !this.shadowRoot.contains(e.target)) {
      this.close();
    }
  }
  render() {
    const items = this.items;
    const isFixed = this.fixed;
    const isBottom = this.placement === "bottom";
    const rawIcon = this.getAttribute("icon") || "add";
    const iconName = this.open ? "close" : rawIcon;
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle34}</style>`}
      <div class="scrim" part="scrim"></div>
      <div class="anchor">
        <button class="fab" type="button" aria-haspopup="true" aria-expanded="${this.open ? "true" : "false"}"
          aria-label="${this.open ? "Close menu" : "Open menu"}">
          <span class="icon material-symbols-rounded">${escapeHtml(iconName)}</span>
        </button>
        <ul class="list placement-${isBottom ? "bottom" : "top"}" role="menu" aria-label="${escapeHtml(this.getAttribute("aria-label") || "FAB menu")}">
          ${items.map((it, i) => `
            <li role="none" style="list-style: none;">
              <button class="item" type="button" role="menuitem" tabindex="-1" data-index="${i}">
                <span class="icon material-symbols-rounded">${escapeHtml(it.icon || "")}</span>
                <span class="label">${escapeHtml(it.label || "")}</span>
              </button>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }
  _menuItems() {
    return [...this.shadowRoot.querySelectorAll(".item")];
  }
  _activate(fromUserInteraction = false) {
    document.removeEventListener("keydown", this._onKeydown);
    document.removeEventListener("click", this._onDocClick);
    document.addEventListener("keydown", this._onKeydown);
    setTimeout(() => document.addEventListener("click", this._onDocClick), 0);
    const fab = this.shadowRoot.querySelector(".fab");
    if (fab) fab.setAttribute("aria-label", "Close menu");
    const items = this._menuItems();
    items.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px) scale(0.96)";
      el.style.transition = `opacity 130ms ease ${i * 25}ms, transform 160ms cubic-bezier(0.2, 0, 0, 1) ${i * 25}ms`;
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    });
    if (fromUserInteraction && items.length) {
      items[items.length - 1].focus({ preventScroll: true });
    }
  }
  _deactivate() {
    document.removeEventListener("keydown", this._onKeydown);
    document.removeEventListener("click", this._onDocClick);
    const fab = this.shadowRoot.querySelector(".fab");
    if (fab) {
      fab.setAttribute("aria-label", "Open menu");
    }
  }
  _onKeydown(e) {
    if (!this.open) return;
    const items = this._menuItems();
    const i = items.indexOf(this.shadowRoot.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1 + items.length) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  }
  _wire(el, onActivate, downScale = 0.94) {
    let pressed = false;
    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture?.(e.pointerId);
      pressed = true;
      el.classList.add("pressed");
      SpringPhysics.animateProperty(el, "scale", 1, downScale, "expressiveSpatialFast");
    });
    const release = () => {
      if (!pressed) return;
      pressed = false;
      el.classList.remove("pressed");
      SpringPhysics.animateProperty(el, "scale", downScale, 1, "expressiveSpatialMedium");
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("click", onActivate);
    el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      el.classList.add("pressed");
      SpringPhysics.animateProperty(el, "scale", 1, downScale, "expressiveSpatialFast");
    });
    el.addEventListener("keyup", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      el.classList.remove("pressed");
      SpringPhysics.animateProperty(el, "scale", downScale, 1, "expressiveSpatialMedium");
    });
  }
  setupInteractions() {
    const scrim = this.shadowRoot.querySelector(".scrim");
    if (scrim) scrim.addEventListener("click", () => this.close());
    const fab = this.shadowRoot.querySelector(".fab");
    if (fab) this._wire(fab, () => this.toggle(), 0.92);
    this._menuItems().forEach((el, i) => {
      this._wire(el, () => {
        this.dispatchEvent(new CustomEvent("select", {
          detail: { index: i, item: this.items[i] },
          bubbles: true,
          composed: true
        }));
        this.close();
      }, 0.96);
    });
  }
};
if (!customElements.get("md-fab-menu")) {
  customElements.define("md-fab-menu", MdFabMenu);
}

// src/theme/hct-color-engine.js
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}
function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c) {
  const v = c <= 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return clamp(Math.round(v * 255), 0, 255);
}
function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return { r: 103, g: 80, b: 164 };
  hex = hex.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const intVal = parseInt(hex, 16);
  if (isNaN(intVal)) return { r: 103, g: 80, b: 164 };
  return {
    r: intVal >> 16 & 255,
    g: intVal >> 8 & 255,
    b: intVal & 255
  };
}
function rgbToHex(r, g, b) {
  const toHex = (c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function rgbToHct(r, g, b) {
  const rL = srgbToLinear(r);
  const gL = srgbToLinear(g);
  const bL = srgbToLinear(b);
  const x = 0.4124564 * rL + 0.3575761 * gL + 0.1804375 * bL;
  const y = 0.2126729 * rL + 0.7151522 * gL + 0.072175 * bL;
  const z = 0.0193339 * rL + 0.119192 * gL + 0.9503041 * bL;
  const xn = 0.95047;
  const yn = 1;
  const zn = 1.08883;
  const f = (t) => t > 216 / 24389 ? Math.cbrt(t) : 24389 / 27 * t / 116 + 16 / 116;
  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  if (r === g && g === b) {
    return {
      hue: 0,
      chroma: 0,
      tone: Math.round(L * 10) / 10
    };
  }
  let chroma = Math.sqrt(a * a + bVal * bVal);
  if (chroma < 0.2) chroma = 0;
  let hue = Math.atan2(bVal, a) * (180 / Math.PI);
  if (hue < 0) hue += 360;
  return {
    hue: Math.round(hue * 10) / 10,
    chroma: Math.round(chroma * 10) / 10,
    tone: Math.round(L * 10) / 10
  };
}
function hctToRgb(hue, chroma, tone) {
  tone = clamp(tone, 0, 100);
  chroma = Math.max(0, chroma);
  if (tone <= 1e-3) return { r: 0, g: 0, b: 0 };
  if (tone >= 99.999) return { r: 255, g: 255, b: 255 };
  if (chroma <= 0.01) {
    const fy2 = (tone + 16) / 116;
    const fInv2 = (t) => {
      const t3 = t * t * t;
      return t3 > 216 / 24389 ? t3 : (t - 16 / 116) * 116 / (24389 / 27);
    };
    const y2 = fInv2(fy2) * 1;
    const gray = linearToSrgb(y2);
    return { r: gray, g: gray, b: gray };
  }
  const hRad = hue * Math.PI / 180;
  const L = tone;
  const a = chroma * Math.cos(hRad);
  const bVal = chroma * Math.sin(hRad);
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - bVal / 200;
  const fInv = (t) => {
    const t3 = t * t * t;
    return t3 > 216 / 24389 ? t3 : (t - 16 / 116) * 116 / (24389 / 27);
  };
  const xn = 0.95047;
  const yn = 1;
  const zn = 1.08883;
  const x = fInv(fx) * xn;
  const y = fInv(fy) * yn;
  const z = fInv(fz) * zn;
  const rL = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const gL = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const bL = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return {
    r: linearToSrgb(rL),
    g: linearToSrgb(gL),
    b: linearToSrgb(bL)
  };
}
function hctToHex(hue, chroma, tone) {
  const { r, g, b } = hctToRgb(hue, chroma, tone);
  return rgbToHex(r, g, b);
}
var TonalPalette = class {
  constructor(hue, chroma) {
    this.hue = hue;
    this.chroma = chroma;
    this._cache = /* @__PURE__ */ new Map();
  }
  tone(tone) {
    tone = Math.round(tone);
    if (!this._cache.has(tone)) {
      this._cache.set(tone, hctToHex(this.hue, this.chroma, tone));
    }
    return this._cache.get(tone);
  }
};
function createTonalPalettes(source, schemeType = "expressive") {
  let hct;
  if (typeof source === "object" && source !== null && "hue" in source) {
    hct = {
      hue: (source.hue % 360 + 360) % 360,
      chroma: Math.max(0, source.chroma !== void 0 ? source.chroma : 48),
      tone: source.tone !== void 0 ? source.tone : 40
    };
  } else {
    const rgb = hexToRgb(String(source));
    hct = rgbToHct(rgb.r, rgb.g, rgb.b);
  }
  const isExpressive = schemeType === "expressive";
  const userChroma = hct.chroma;
  const primaryHue = hct.hue;
  const primaryChroma = userChroma;
  const secondaryHue = isExpressive ? (primaryHue + 15) % 360 : primaryHue;
  const secondaryChroma = userChroma * 0.45;
  const tertiaryHue = isExpressive ? (primaryHue + 120) % 360 : (primaryHue + 60) % 360;
  const tertiaryChroma = userChroma * 0.65;
  const neutralHue = isExpressive ? (primaryHue + 15) % 360 : primaryHue;
  const neutralChroma = Math.min(userChroma * 0.15, 8);
  const neutralVariantHue = isExpressive ? (primaryHue + 15) % 360 : primaryHue;
  const neutralVariantChroma = Math.min(userChroma * 0.25, 12);
  const errorHue = 25;
  const errorChroma = Math.min(userChroma * 1.2 + 20, 84);
  return {
    primary: new TonalPalette(primaryHue, primaryChroma),
    secondary: new TonalPalette(secondaryHue, secondaryChroma),
    tertiary: new TonalPalette(tertiaryHue, tertiaryChroma),
    neutral: new TonalPalette(neutralHue, neutralChroma),
    neutralVariant: new TonalPalette(neutralVariantHue, neutralVariantChroma),
    error: new TonalPalette(errorHue, errorChroma),
    hct,
    schemeType
  };
}
function generateM3Scheme(source, isDark = false, schemeType = "expressive") {
  const palettes = createTonalPalettes(source, schemeType);
  const { primary, secondary, tertiary, neutral, neutralVariant, error, hct } = palettes;
  const delta = (hct.tone !== void 0 ? hct.tone : 40) - 40;
  if (isDark) {
    const pTone = clamp(80 + delta * 0.25, 60, 95);
    const onPTone = clamp(20 + delta * 0.15, 10, 30);
    const pContTone = clamp(30 + delta * 0.35, 15, 52);
    const onPContTone = clamp(90 + delta * 0.15, 80, 98);
    const sTone = clamp(80 + delta * 0.25, 60, 95);
    const onSTone = clamp(20 + delta * 0.15, 10, 30);
    const sContTone = clamp(30 + delta * 0.35, 15, 52);
    const onSContTone = clamp(90 + delta * 0.15, 80, 98);
    const tTone = clamp(80 + delta * 0.25, 60, 95);
    const onTTone = clamp(20 + delta * 0.15, 10, 30);
    const tContTone = clamp(30 + delta * 0.35, 15, 52);
    const onTContTone = clamp(90 + delta * 0.15, 80, 98);
    const errTone = clamp(80 + delta * 0.25, 60, 95);
    const onErrTone = clamp(20 + delta * 0.15, 10, 30);
    const errContTone = clamp(30 + delta * 0.35, 15, 52);
    const onErrContTone = clamp(90 + delta * 0.15, 80, 98);
    const bgTone = clamp(6 + delta * 0.12, 3, 14);
    const onBgTone = clamp(90 + delta * 0.15, 80, 98);
    const surfTone = clamp(6 + delta * 0.12, 3, 14);
    const onSurfTone = clamp(90 + delta * 0.15, 80, 98);
    const surfVarTone = clamp(30 + delta * 0.25, 18, 45);
    const onSurfVarTone = clamp(80 + delta * 0.2, 70, 92);
    const surfDimTone = clamp(6 + delta * 0.12, 3, 14);
    const surfBrightTone = clamp(24 + delta * 0.25, 14, 36);
    const surfLowestTone = clamp(4 + delta * 0.1, 2, 10);
    const surfLowTone = clamp(10 + delta * 0.15, 5, 18);
    const surfContTone = clamp(12 + delta * 0.18, 6, 22);
    const surfHighTone = clamp(17 + delta * 0.2, 9, 28);
    const surfHighestTone = clamp(22 + delta * 0.22, 12, 34);
    const outlineTone = clamp(60 + delta * 0.25, 45, 75);
    const outlineVarTone = clamp(30 + delta * 0.2, 18, 45);
    return {
      "--md-sys-color-primary": primary.tone(pTone),
      "--md-sys-color-on-primary": primary.tone(onPTone),
      "--md-sys-color-primary-container": primary.tone(pContTone),
      "--md-sys-color-on-primary-container": primary.tone(onPContTone),
      "--md-sys-color-secondary": secondary.tone(sTone),
      "--md-sys-color-on-secondary": secondary.tone(onSTone),
      "--md-sys-color-secondary-container": secondary.tone(sContTone),
      "--md-sys-color-on-secondary-container": secondary.tone(onSContTone),
      "--md-sys-color-tertiary": tertiary.tone(tTone),
      "--md-sys-color-on-tertiary": tertiary.tone(onTTone),
      "--md-sys-color-tertiary-container": tertiary.tone(tContTone),
      "--md-sys-color-on-tertiary-container": tertiary.tone(onTContTone),
      "--md-sys-color-error": error.tone(errTone),
      "--md-sys-color-on-error": error.tone(onErrTone),
      "--md-sys-color-error-container": error.tone(errContTone),
      "--md-sys-color-on-error-container": error.tone(onErrContTone),
      "--md-sys-color-background": neutral.tone(bgTone),
      "--md-sys-color-on-background": neutral.tone(onBgTone),
      "--md-sys-color-surface": neutral.tone(surfTone),
      "--md-sys-color-on-surface": neutral.tone(onSurfTone),
      "--md-sys-color-surface-variant": neutralVariant.tone(surfVarTone),
      "--md-sys-color-on-surface-variant": neutralVariant.tone(onSurfVarTone),
      "--md-sys-color-surface-dim": neutral.tone(surfDimTone),
      "--md-sys-color-surface-bright": neutral.tone(surfBrightTone),
      "--md-sys-color-surface-container-lowest": neutral.tone(surfLowestTone),
      "--md-sys-color-surface-container-low": neutral.tone(surfLowTone),
      "--md-sys-color-surface-container": neutral.tone(surfContTone),
      "--md-sys-color-surface-container-high": neutral.tone(surfHighTone),
      "--md-sys-color-surface-container-highest": neutral.tone(surfHighestTone),
      "--md-sys-color-outline": neutralVariant.tone(outlineTone),
      "--md-sys-color-outline-variant": neutralVariant.tone(outlineVarTone),
      "--md-sys-color-inverse-surface": neutral.tone(90),
      "--md-sys-color-inverse-on-surface": neutral.tone(20),
      "--md-sys-color-inverse-primary": primary.tone(40),
      // Preview Background & Surfaces
      "--preview-bg": neutral.tone(bgTone),
      "--preview-surface": neutral.tone(surfContTone),
      "--preview-border": neutralVariant.tone(outlineVarTone)
    };
  } else {
    const pTone = clamp(40 + delta * 0.35, 20, 65);
    const onPTone = 100;
    const pContTone = clamp(90 + delta * 0.15, 75, 96);
    const onPContTone = clamp(10 + delta * 0.15, 5, 25);
    const sTone = clamp(40 + delta * 0.35, 20, 65);
    const onSTone = 100;
    const sContTone = clamp(90 + delta * 0.15, 75, 96);
    const onSContTone = clamp(10 + delta * 0.15, 5, 25);
    const tTone = clamp(40 + delta * 0.35, 20, 65);
    const onTTone = 100;
    const tContTone = clamp(90 + delta * 0.15, 75, 96);
    const onTContTone = clamp(10 + delta * 0.15, 5, 25);
    const errTone = clamp(40 + delta * 0.35, 20, 65);
    const onErrTone = 100;
    const errContTone = clamp(90 + delta * 0.15, 75, 96);
    const onErrContTone = clamp(10 + delta * 0.15, 5, 25);
    const bgTone = clamp(98 + delta * 0.05, 92, 100);
    const onBgTone = clamp(10 + delta * 0.15, 5, 25);
    const surfTone = clamp(98 + delta * 0.05, 92, 100);
    const onSurfTone = clamp(10 + delta * 0.15, 5, 25);
    const surfVarTone = clamp(90 + delta * 0.15, 75, 96);
    const onSurfVarTone = clamp(30 + delta * 0.25, 18, 45);
    const surfDimTone = clamp(87 + delta * 0.15, 75, 94);
    const surfBrightTone = clamp(98 + delta * 0.05, 92, 100);
    const surfLowestTone = 100;
    const surfLowTone = clamp(96 + delta * 0.1, 88, 99);
    const surfContTone = clamp(94 + delta * 0.12, 85, 98);
    const surfHighTone = clamp(92 + delta * 0.15, 82, 96);
    const surfHighestTone = clamp(90 + delta * 0.15, 80, 95);
    const outlineTone = clamp(50 + delta * 0.25, 35, 68);
    const outlineVarTone = clamp(80 + delta * 0.2, 65, 90);
    return {
      "--md-sys-color-primary": primary.tone(pTone),
      "--md-sys-color-on-primary": primary.tone(onPTone),
      "--md-sys-color-primary-container": primary.tone(pContTone),
      "--md-sys-color-on-primary-container": primary.tone(onPContTone),
      "--md-sys-color-secondary": secondary.tone(sTone),
      "--md-sys-color-on-secondary": secondary.tone(onSTone),
      "--md-sys-color-secondary-container": secondary.tone(sContTone),
      "--md-sys-color-on-secondary-container": secondary.tone(onSContTone),
      "--md-sys-color-tertiary": tertiary.tone(tTone),
      "--md-sys-color-on-tertiary": tertiary.tone(onTTone),
      "--md-sys-color-tertiary-container": tertiary.tone(tContTone),
      "--md-sys-color-on-tertiary-container": tertiary.tone(onTContTone),
      "--md-sys-color-error": error.tone(errTone),
      "--md-sys-color-on-error": error.tone(onErrTone),
      "--md-sys-color-error-container": error.tone(errContTone),
      "--md-sys-color-on-error-container": error.tone(onErrContTone),
      "--md-sys-color-background": neutral.tone(bgTone),
      "--md-sys-color-on-background": neutral.tone(onBgTone),
      "--md-sys-color-surface": neutral.tone(surfTone),
      "--md-sys-color-on-surface": neutral.tone(onSurfTone),
      "--md-sys-color-surface-variant": neutralVariant.tone(surfVarTone),
      "--md-sys-color-on-surface-variant": neutralVariant.tone(onSurfVarTone),
      "--md-sys-color-surface-dim": neutral.tone(surfDimTone),
      "--md-sys-color-surface-bright": neutral.tone(surfBrightTone),
      "--md-sys-color-surface-container-lowest": neutral.tone(surfLowestTone),
      "--md-sys-color-surface-container-low": neutral.tone(surfLowTone),
      "--md-sys-color-surface-container": neutral.tone(surfContTone),
      "--md-sys-color-surface-container-high": neutral.tone(surfHighTone),
      "--md-sys-color-surface-container-highest": neutral.tone(surfHighestTone),
      "--md-sys-color-outline": neutralVariant.tone(outlineTone),
      "--md-sys-color-outline-variant": neutralVariant.tone(outlineVarTone),
      "--md-sys-color-inverse-surface": neutral.tone(20),
      "--md-sys-color-inverse-on-surface": neutral.tone(95),
      "--md-sys-color-inverse-primary": primary.tone(80),
      // Preview Background & Surfaces
      "--preview-bg": neutral.tone(bgTone),
      "--preview-surface": neutral.tone(surfContTone),
      "--preview-border": neutralVariant.tone(outlineVarTone)
    };
  }
}
var MD3_PRESETS = [
  { id: "baseline", name: "Baseline Purple", hex: "#6750A4", hue: 305, chroma: 52 },
  { id: "ocean", name: "Expressive Ocean", hex: "#00639B", hue: 266, chroma: 37 },
  { id: "emerald", name: "Forest Green", hex: "#386A20", hue: 132, chroma: 47 },
  { id: "sunset", name: "Warm Amber", hex: "#7D5700", hue: 79, chroma: 49 },
  { id: "rose", name: "Vibrant Coral", hex: "#9C4146", hue: 23, chroma: 42 }
];
var globalActiveHct = { hue: 305, chroma: 52, tone: 40 };
function applyDynamicTheme(source, isDark = null, schemeType = null, target = null) {
  if (!target && typeof document !== "undefined") {
    target = document.documentElement;
  }
  if (!target) return {};
  if (isDark === null) {
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    isDark = target.getAttribute("data-theme") === "dark" || doc && doc.getAttribute("data-theme") === "dark";
  }
  if (schemeType === null) {
    const doc = typeof document !== "undefined" ? document.documentElement : null;
    schemeType = target.getAttribute("data-theme-scheme") || doc && doc.getAttribute("data-theme-scheme") || "expressive";
  }
  let resolvedHct = { ...globalActiveHct };
  if (typeof source === "object" && source !== null && "hue" in source) {
    resolvedHct = {
      hue: (source.hue % 360 + 360) % 360,
      chroma: Math.max(0, source.chroma !== void 0 ? source.chroma : 48),
      tone: clamp(source.tone !== void 0 ? source.tone : 40, 0, 100)
    };
  } else if (typeof source === "string") {
    const rgb = hexToRgb(source);
    resolvedHct = rgbToHct(rgb.r, rgb.g, rgb.b);
  }
  const isGlobalTarget = typeof document !== "undefined" && (target === document.documentElement || target === document.body);
  if (isGlobalTarget) {
    globalActiveHct = { ...resolvedHct };
  }
  target._activeHct = { ...resolvedHct };
  const tokens = generateM3Scheme(resolvedHct, isDark, schemeType);
  if (isGlobalTarget && typeof document !== "undefined") {
    let themeStyle = document.getElementById("md3e-dynamic-theme-vars");
    if (!themeStyle) {
      themeStyle = document.createElement("style");
      themeStyle.id = "md3e-dynamic-theme-vars";
      document.head.appendChild(themeStyle);
    }
    const cssLines = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n");
    themeStyle.textContent = `:root {
${cssLines}
}`;
  } else if (target && target.style) {
    for (const [key, value] of Object.entries(tokens)) {
      target.style.setProperty(key, value);
    }
  }
  const seedHex = hctToHex(resolvedHct.hue, resolvedHct.chroma, resolvedHct.tone);
  target.setAttribute("data-seed-color", seedHex);
  if (typeof window !== "undefined") {
    const event = new CustomEvent("theme-color-change", {
      detail: { hct: resolvedHct, seedHex, isDark, schemeType, tokens, target },
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
    target.dispatchEvent(event);
  }
  return tokens;
}
function getActiveHct(target = null) {
  if (target && target._activeHct) {
    return { ...target._activeHct };
  }
  return { ...globalActiveHct };
}
function getActiveSeedHex(target = null) {
  const hct = getActiveHct(target);
  return hctToHex(hct.hue, hct.chroma, hct.tone);
}

// src/components/md-theme.js
var defaultStyle35 = `
  :host {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    display: contents;
  }
`;
var themeSheet = createComponentSheet(defaultStyle35);
var MdExpressiveTheme = class extends HTMLElement {
  static get observedAttributes() {
    return ["scheme", "color-mode", "contrast", "motion-scheme", "primary-seed", "custom-palette", "font-family"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    adoptSheet(this.shadowRoot, themeSheet);
  }
  connectedCallback() {
    this.render();
    this._sync();
  }
  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    this._sync();
  }
  get scheme() {
    return this.getAttribute("scheme") || "expressive";
  }
  set scheme(v) {
    this.setAttribute("scheme", v);
  }
  get colorMode() {
    return this.getAttribute("color-mode") || "dark";
  }
  set colorMode(v) {
    this.setAttribute("color-mode", v);
  }
  get contrast() {
    return this.getAttribute("contrast") || "standard";
  }
  set contrast(v) {
    this.setAttribute("contrast", v);
  }
  get motionScheme() {
    return this.getAttribute("motion-scheme") || this.scheme;
  }
  set motionScheme(v) {
    this.setAttribute("motion-scheme", v);
  }
  get primarySeed() {
    return this.getAttribute("primary-seed") || getActiveSeedHex();
  }
  set primarySeed(v) {
    this.setAttribute("primary-seed", v);
  }
  get customPalette() {
    return safeJsonParse(this.getAttribute("custom-palette"), null);
  }
  set customPalette(v) {
    if (v === null || v === void 0) this.removeAttribute("custom-palette");
    else if (typeof v === "object") this.setAttribute("custom-palette", JSON.stringify(v));
    else this.setAttribute("custom-palette", String(v));
  }
  get fontFamily() {
    return this.getAttribute("font-family") || "";
  }
  set fontFamily(v) {
    if (v === null || v === void 0) this.removeAttribute("font-family");
    else this.setAttribute("font-family", v);
  }
  /**
   * Apply global theme state to the document root element
   */
  static applyGlobal({ scheme = "expressive", colorMode = "dark", contrast = "standard", motionScheme, primarySeed } = {}) {
    const root = document.documentElement;
    root.setAttribute("data-theme", colorMode);
    root.setAttribute("data-theme-scheme", scheme);
    root.setAttribute("data-contrast", contrast);
    root.setAttribute("data-motion-scheme", motionScheme || scheme);
    const activeSeed = primarySeed || root.getAttribute("data-seed-color") || getActiveSeedHex();
    if (activeSeed) {
      applyDynamicTheme(activeSeed, colorMode === "dark", scheme, root);
    }
    SpringPhysics.setScheme(motionScheme || scheme);
    const event = new CustomEvent("theme-change", {
      detail: { scheme, colorMode, contrast, motionScheme: motionScheme || scheme, primarySeed: activeSeed },
      bubbles: true,
      composed: true
    });
    window.dispatchEvent(event);
  }
  /**
   * Toggle between 'expressive' and 'standard' scheme
   */
  static toggleScheme() {
    const current = document.documentElement.getAttribute("data-theme-scheme") || "expressive";
    const next = current === "expressive" ? "standard" : "expressive";
    const colorMode = document.documentElement.getAttribute("data-theme") || "dark";
    this.applyGlobal({ scheme: next, colorMode });
    return next;
  }
  /**
   * Toggle between 'light' and 'dark' color mode
   */
  static toggleColorMode() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    const scheme = document.documentElement.getAttribute("data-theme-scheme") || "expressive";
    this.applyGlobal({ scheme, colorMode: next });
    return next;
  }
  /**
   * Get current active global theme state
   */
  static getTheme() {
    return {
      scheme: document.documentElement.getAttribute("data-theme-scheme") || "expressive",
      colorMode: document.documentElement.getAttribute("data-theme") || "dark",
      contrast: document.documentElement.getAttribute("data-contrast") || "standard",
      motionScheme: document.documentElement.getAttribute("data-motion-scheme") || "expressive",
      primarySeed: document.documentElement.getAttribute("data-seed-color") || getActiveSeedHex()
    };
  }
  _sync() {
    const target = this.hasAttribute("global") ? document.documentElement : this;
    target.setAttribute("data-theme", this.colorMode);
    target.setAttribute("data-theme-scheme", this.scheme);
    target.setAttribute("data-contrast", this.contrast);
    target.setAttribute("data-motion-scheme", this.motionScheme);
    if (this.hasAttribute("primary-seed") || target === document.documentElement) {
      applyDynamicTheme(this.primarySeed, this.colorMode === "dark", this.scheme, target);
    }
    if (this.fontFamily) {
      target.style.setProperty("--md-sys-typescale-font-family", this.fontFamily);
    }
    if (this.customPalette && typeof this.customPalette === "object") {
      for (const [k, v] of Object.entries(this.customPalette)) {
        target.style.setProperty(`--md-sys-color-${k}`, v);
      }
    }
    if (this.hasAttribute("global")) {
      SpringPhysics.setScheme(this.motionScheme);
    }
    this.dispatchEvent(new CustomEvent("theme-change", {
      detail: {
        scheme: this.scheme,
        colorMode: this.colorMode,
        contrast: this.contrast,
        motionScheme: this.motionScheme
      },
      bubbles: true,
      composed: true
    }));
  }
  render() {
    const hasAdopted = !!(this.shadowRoot.adoptedStyleSheets && this.shadowRoot.adoptedStyleSheets.length > 0);
    this.shadowRoot.innerHTML = `
      ${hasAdopted ? "" : `<style>${defaultStyle35}</style>`}
      <slot></slot>
    `;
  }
};
var MdTheme = class extends MdExpressiveTheme {
  get scheme() {
    return this.getAttribute("scheme") || "standard";
  }
};
if (!customElements.get("md-expressive-theme")) {
  customElements.define("md-expressive-theme", MdExpressiveTheme);
}
if (!customElements.get("md-theme")) {
  customElements.define("md-theme", MdTheme);
}
export {
  MD3_PRESETS,
  MdBadge,
  MdBottomAppBar,
  MdBottomSheet,
  MdButton,
  MdCard,
  MdCarousel,
  MdCheckbox,
  MdChip,
  MdDatePicker,
  MdDialog,
  MdDivider,
  MdExpressiveTheme,
  MdFab,
  MdFabMenu,
  MdIconButton,
  MdList,
  MdListItem,
  MdLoadingIndicator,
  MdMenu,
  MdMenuItem,
  MdNavigationBar,
  MdNavigationDrawer,
  MdNavigationRail,
  MdProgressIndicator,
  MdRadioButton,
  MdSearchBar,
  MdSegmentedButton,
  MdSideSheet,
  MdSlider,
  MdSnackbar,
  MdSplitButton,
  MdSwitch,
  MdTabs,
  MdTextField,
  MdTheme,
  MdTimePicker,
  MdToolbar,
  MdTooltip,
  MdTopAppBar,
  SpringPhysics,
  TonalPalette,
  adoptSheet,
  applyDynamicTheme,
  createComponentSheet,
  createTonalPalettes,
  escapeHtml,
  generateM3Scheme,
  getActiveHct,
  getActiveSeedHex,
  hctToHex,
  hctToRgb,
  hexToRgb,
  rgbToHct,
  rgbToHex,
  safeJsonParse,
  sanitizeAttribute
};
//# sourceMappingURL=md3-expressive.esm.js.map
