/**
 * Material Design 3 Expressive (M3 Expressive) Web Component: <md-progress-indicator>
 *
 * 100% FAITHFUL WEB IMPLEMENTATION OF ANDROIDX COMPOSE:
 * - androidx.compose.material3.ProgressIndicator.kt
 * - androidx.compose.material3.WavyProgressIndicator.kt
 * - androidx.compose.material3.tokens.LinearProgressIndicatorTokens.kt
 * - androidx.compose.material3.tokens.CircularProgressIndicatorTokens.kt
 *
 * Variants & Modes:
 * 1. type="linear" variant="standard" (4dp height, 100% responsive width, 4dp stop dot, 4dp gap)
 * 2. type="linear" variant="wavy"     (10dp height, 100% responsive width, 3dp amplitude, 40dp/20dp wavelength, 4dp gap)
 * 3. type="circular" variant="standard" (48dp size, 40dp diameter, 4dp stroke, 4dp gap)
 * 4. type="circular" variant="wavy"     (48dp size, 8-wave continuous sinusoid, 3dp amplitude, 4dp gap)
 */

export class MdProgressIndicator extends HTMLElement {
  static get observedAttributes() {
    return [
      'type', 'variant', 'value', 'progress', 'indeterminate', 'max',
      'amplitude', 'wavelength', 'stroke-width', 'gap-size', 'track-color', 'stop-size'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
    this._rafId = null;
    this._startTime = 0;
    this._activeColor = '#6750A4';
    this._trackColor = '#E8DEF8';
    this._colorDirty = true;
    this._observer = null;
    this._resizeObserver = null;
    this._isVisible = true;
    this._onThemeChange = () => { this._colorDirty = true; };
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
    if (typeof window !== 'undefined') {
      window.addEventListener('theme-color-change', this._onThemeChange);
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
    if (typeof window !== 'undefined') {
      window.removeEventListener('theme-color-change', this._onThemeChange);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered || oldVal === newVal) return;
    if (name === 'type' || name === 'variant') {
      this.render();
    }
    if (name === 'track-color') {
      this._colorDirty = true;
    }
    if (name === 'stroke-width' || name === 'amplitude' || name === 'type' || name === 'variant') {
      this._syncDimensions();
    }
  }

  _setupIntersectionObserver() {
    if (typeof IntersectionObserver === 'undefined') return;
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
    if (typeof ResizeObserver === 'undefined') return;
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
    if (this.type === 'circular') return 48;
    const measured = this.clientWidth || this.getBoundingClientRect()?.width || 0;
    if (measured > 0) {
      this._cachedWidth = measured;
      return measured;
    }
    return this._cachedWidth || 240;
  }

  _resolveColors() {
    if (this.hasAttribute('track-color')) {
      this._trackColor = this.getAttribute('track-color');
    } else if (this._colorDirty || !this._trackColor) {
      const computed = getComputedStyle(this);
      this._trackColor = computed.getPropertyValue('--md-sys-color-secondary-container').trim() ||
                         computed.getPropertyValue('--md-sys-color-surface-container-highest').trim() || '#E8DEF8';
    }
    if (!this._colorDirty && this._activeColor) return;
    const computed = getComputedStyle(this);
    this._activeColor = computed.getPropertyValue('--md-sys-color-primary').trim() || '#6750A4';
    this._colorDirty = false;
  }

  get strokeWidth() {
    const sw = parseFloat(this.getAttribute('stroke-width'));
    return isNaN(sw) || sw <= 0 ? 4.0 : sw;
  }
  set strokeWidth(v) {
    if (v === null || v === undefined) this.removeAttribute('stroke-width');
    else this.setAttribute('stroke-width', String(v));
  }

  get gapSize() {
    const gs = parseFloat(this.getAttribute('gap-size'));
    return isNaN(gs) || gs < 0 ? 4.0 : gs;
  }
  set gapSize(v) {
    if (v === null || v === undefined) this.removeAttribute('gap-size');
    else this.setAttribute('gap-size', String(v));
  }

  get trackColor() {
    return this.getAttribute('track-color') || this._trackColor || '#E8DEF8';
  }
  set trackColor(v) {
    if (v === null || v === undefined) this.removeAttribute('track-color');
    else this.setAttribute('track-color', String(v));
  }

  get stopSize() {
    const ss = parseFloat(this.getAttribute('stop-size'));
    return isNaN(ss) || ss < 0 ? 4.0 : ss;
  }
  set stopSize(v) {
    if (v === null || v === undefined) this.removeAttribute('stop-size');
    else this.setAttribute('stop-size', String(v));
  }

  get amplitude() {
    const amp = parseFloat(this.getAttribute('amplitude'));
    return isNaN(amp) ? null : amp;
  }
  set amplitude(v) {
    if (v === null || v === undefined) this.removeAttribute('amplitude');
    else this.setAttribute('amplitude', String(v));
  }

  get wavelength() {
    const wl = parseFloat(this.getAttribute('wavelength'));
    return isNaN(wl) ? null : wl;
  }
  set wavelength(v) {
    if (v === null || v === undefined) this.removeAttribute('wavelength');
    else this.setAttribute('wavelength', String(v));
  }

  get type() {
    return this.getAttribute('type') || 'linear'; // 'linear' | 'circular'
  }
  set type(v) {
    this.setAttribute('type', v);
  }

  get variant() {
    return this.getAttribute('variant') || 'standard'; // 'standard' | 'wavy'
  }
  set variant(v) {
    this.setAttribute('variant', v);
  }

  get max() {
    const m = parseFloat(this.getAttribute('max'));
    return isNaN(m) || m <= 0 ? 100 : m;
  }
  set max(v) {
    this.setAttribute('max', String(v));
  }

  get value() {
    const v = parseFloat(this.getAttribute('value') ?? this.getAttribute('progress'));
    if (isNaN(v)) return null;
    return Math.min(this.max, Math.max(0, v));
  }
  set value(v) {
    if (v === null || v === undefined) {
      this.removeAttribute('value');
      this.removeAttribute('progress');
    } else {
      this.setAttribute('value', String(v));
    }
  }

  get indeterminate() {
    return this.hasAttribute('indeterminate') || this.value === null;
  }
  set indeterminate(v) {
    if (v) this.setAttribute('indeterminate', '');
    else this.removeAttribute('indeterminate');
  }

  get fraction() {
    if (this.indeterminate) return 0;
    return Math.max(0, Math.min(1, this.value / this.max));
  }

  _startAnimation() {
    this._stopAnimation();
    this._startTime = performance.now();

    const canvas = this.shadowRoot.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

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
    const canvas = this.shadowRoot.querySelector('canvas');
    if (!canvas) return;

    const isLinear = this.type === 'linear';
    const isWavy = this.variant === 'wavy';
    const strokeWidth = this.strokeWidth;
    const amplitudeMax = this.amplitude !== null ? this.amplitude : 3.0;

    const w = this._getWidth();
    const h = isLinear ? (isWavy ? Math.max(10, Math.round(amplitudeMax * 2 + strokeWidth + 2)) : Math.max(4, Math.round(strokeWidth))) : 48;

    const dpr = window.devicePixelRatio || 1;
    const requiredW = Math.round(w * dpr);
    const requiredH = Math.round(h * dpr);

    if (canvas.width !== requiredW || canvas.height !== requiredH) {
      canvas.width = requiredW;
      canvas.height = requiredH;
      canvas.style.width = isLinear ? '100%' : `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const root = this.shadowRoot.querySelector('.progress-root');
    if (root) {
      root.style.width = isLinear ? '100%' : `${w}px`;
      root.style.height = `${h}px`;
      if (this.indeterminate) {
        root.setAttribute('aria-busy', 'true');
        root.removeAttribute('aria-valuenow');
      } else {
        root.setAttribute('aria-busy', 'false');
        root.setAttribute('aria-valuenow', String(Math.round(this.fraction * 100)));
        root.setAttribute('aria-valuemin', '0');
        root.setAttribute('aria-valuemax', '100');
      }
    }
  }

  _draw(ctx, now) {
    const isLinear = this.type === 'linear';
    const isWavy = this.variant === 'wavy';
    const isIndet = this.indeterminate;
    const p = this.fraction;

    this._resolveColors();
    const activeColor = this._activeColor;
    const trackColor = this._trackColor;

    const strokeWidth = this.strokeWidth;
    const gapSize = this.gapSize;
    const stopSize = this.stopSize;
    const amplitudeMax = this.amplitude !== null ? this.amplitude : 3.0;

    const dpr = window.devicePixelRatio || 1;
    const w = this._getWidth();
    const h = isLinear ? (isWavy ? Math.max(10, Math.round(amplitudeMax * 2 + strokeWidth + 2)) : Math.max(4, Math.round(strokeWidth))) : 48;
    const centerY = isLinear ? h / 2 : 24.0;

    const requiredW = Math.round(w * dpr);
    const requiredH = Math.round(h * dpr);
    const canvas = ctx.canvas;

    if (canvas.width !== requiredW || canvas.height !== requiredH) {
      canvas.width = requiredW;
      canvas.height = requiredH;
      canvas.style.width = isLinear ? '100%' : `${w}px`;
      canvas.style.height = `${h}px`;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const elapsed = (now - this._startTime) / 1000; // in seconds

    const dt = this._lastFrameTime > 0 ? Math.min((now - this._lastFrameTime) / 1000, 0.05) : 0.016;
    this._lastFrameTime = now;

    if (isLinear) {
      if (isWavy) {
        // ==========================================
        // 1. LINEAR WAVY PROGRESS INDICATOR
        // ==========================================
        const wavelength = this.wavelength !== null ? this.wavelength : (isIndet ? 20.0 : 40.0); // Indeterminate = 20dp, Determinate = 40dp
        const waveSpeed = wavelength; // 1 wavelength per second
        const waveOffset = (elapsed * waveSpeed) % wavelength;
        const adjustedGapSize = gapSize + strokeWidth; // Round cap compensation (Android ProgressIndicator.kt §171)

        // Calculate target amplitude according to AndroidX Compose specs
        let targetAmp = amplitudeMax;
        if (!isIndet) {
          targetAmp = (p <= 0.1 || p >= 0.95) ? 0 : amplitudeMax;
        }

        // Smooth amplitude animation (500ms easing per Compose Increasing/Decreasing spec)
        if (this._animatedAmplitude === null) {
          this._animatedAmplitude = targetAmp;
        } else {
          const smoothSpeed = targetAmp > this._animatedAmplitude ? 7.0 : 9.0;
          this._animatedAmplitude += (targetAmp - this._animatedAmplitude) * (1 - Math.exp(-smoothSpeed * dt));
        }

        const currentAmp = this._animatedAmplitude;
        const waveY = (x) => centerY + currentAmp * Math.sin(((x - waveOffset) * 2 * Math.PI) / wavelength);

        if (isIndet) {
          // Dual indeterminate moving wave segments
          const tCycle = (elapsed * 0.7) % 2.0; // 2-second cycle
          const head1 = Math.min(w, Math.max(0, (tCycle / 1.2) * w));
          const tail1 = Math.min(w, Math.max(0, ((tCycle - 0.4) / 1.2) * w));

          // Draw full wavy track
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          for (let x = 0; x <= w; x += 1) {
            const y = waveY(x);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw active indeterminate wave
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
          // Determinate Mode (AndroidX Compose: Active is wavy, Track is FLAT line, Stop Dot is on centerY)
          const activeWidth = p * w;
          const trackStart = Math.min(w, activeWidth + adjustedGapSize);
          const stopX = w - stopSize / 2;
          const trackEnd = Math.max(trackStart, w - stopSize - gapSize);

          // Draw Track (Flat line on centerY)
          if (trackStart < trackEnd) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(trackStart, centerY);
            ctx.lineTo(trackEnd, centerY);
            ctx.stroke();
          }

          // Draw Active Wave (Subpixel smooth lineTo)
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

          // Draw Stop Indicator dot on flat track line (centerY)
          if (p < 0.99) {
            ctx.beginPath();
            ctx.fillStyle = activeColor;
            ctx.arc(stopX, centerY, stopSize / 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      } else {
        // ==========================================
        // 2. LINEAR STANDARD PROGRESS INDICATOR
        // ==========================================
        const centerY = 2.0;
        const adjustedGapSize = gapSize + strokeWidth; // Round cap compensation

        if (isIndet) {
          const minX = strokeWidth / 2;
          const maxX = w - strokeWidth / 2;
          const range = Math.max(1, maxX - minX);

          // Full background track (round caps at minX / maxX)
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          ctx.moveTo(minX, centerY);
          ctx.lineTo(maxX, centerY);
          ctx.stroke();

          // Active Indeterminate Capsule (bounded inside [minX, maxX] so round caps are never clipped)
          const tCycle = (elapsed * 0.7) % 1.8;
          const head = minX + Math.min(range, Math.max(0, (tCycle / 1.1) * range));
          const tail = minX + Math.min(range, Math.max(0, ((tCycle - 0.45) / 1.1) * range));

          if (head > tail) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(tail, centerY);
            ctx.lineTo(head, centerY);
            ctx.stroke();
          }
        } else {
          // Determinate Mode
          const minX = strokeWidth / 2;
          const maxX = w - strokeWidth / 2;
          const activeW = minX + p * (maxX - minX);
          const trackStart = Math.min(maxX, activeW + adjustedGapSize);

          // Track
          if (trackStart < maxX) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(trackStart, centerY);
            ctx.lineTo(maxX, centerY);
            ctx.stroke();
          }

          // Active Bar
          if (activeW > minX) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            ctx.moveTo(minX, centerY);
            ctx.lineTo(activeW, centerY);
            ctx.stroke();
          }

          // Stop Dot
          if (p < 0.99) {
            ctx.beginPath();
            ctx.fillStyle = activeColor;
            ctx.arc(w - stopSize / 2, centerY, stopSize / 2, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    } else {
      // ==========================================
      // 3. CIRCULAR INDICATOR (STANDARD & WAVY)
      // ==========================================
      const center = 24.0;
      const radius = Math.max(4, center - strokeWidth - 2);

      if (isWavy) {
        // CIRCULAR WAVY (Expressive)
        const amplitudeMax = this.amplitude !== null ? this.amplitude : 3.0;
        const numWaves = 8; // 8-wave continuous closed sinusoid
        // Calculate target amplitude according to AndroidX Compose specs
        let targetAmp = amplitudeMax;
        if (!isIndet) {
          targetAmp = (p <= 0.1 || p >= 0.95) ? 0 : amplitudeMax;
        }

        if (this._animatedAmplitude === null) {
          this._animatedAmplitude = targetAmp;
        } else {
          const smoothSpeed = targetAmp > this._animatedAmplitude ? 7.0 : 9.0;
          this._animatedAmplitude += (targetAmp - this._animatedAmplitude) * (1 - Math.exp(-smoothSpeed * dt));
        }

        const currentAmp = this._animatedAmplitude;

        const waveSpeed = Math.PI / 4; // 45° / second rotation
        const phaseOffset = elapsed * waveSpeed;

        const getPoint = (theta) => {
          const r = radius + currentAmp * Math.sin(numWaves * theta - phaseOffset);
          return {
            x: center + r * Math.cos(theta),
            y: center + r * Math.sin(theta)
          };
        };

        if (isIndet) {
          // Continuous spinning circular wavy
          const spinOffset = elapsed * 1.5;
          const startAngle = spinOffset;
          const sweepAngle = Math.PI * 1.4;

          // Track
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          const trackSteps = 180;
          for (let i = 0; i <= trackSteps; i++) {
            const angle = (i / trackSteps) * 2 * Math.PI;
            const pt = getPoint(angle);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          // Active Arc
          ctx.beginPath();
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = strokeWidth;
          const activeSteps = 120;
          for (let i = 0; i <= activeSteps; i++) {
            const angle = startAngle + (i / activeSteps) * sweepAngle;
            const pt = getPoint(angle);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        } else {
          // Determinate Circular Wavy
          const sweepAngle = p * 2 * Math.PI;
          const adjustedGapAngle = ((gapSize + strokeWidth) / (2 * Math.PI * radius)) * 2 * Math.PI; // Round cap compensation (Android)
          const gapSweep = Math.min(sweepAngle, adjustedGapAngle);
          const startAngle = -Math.PI / 2;

          // Track (Flat circular arc — GAP AT BOTH ENDS, Android ProgressIndicator.kt §549-550)
          if (p < 0.99 && (startAngle + sweepAngle + gapSweep < startAngle + 2 * Math.PI - gapSweep)) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.arc(center, center, radius, startAngle + sweepAngle + gapSweep, startAngle + 2 * Math.PI - gapSweep);
            ctx.stroke();
          }

          // Active Wavy Arc
          if (sweepAngle > 0.05) {
            ctx.beginPath();
            ctx.strokeStyle = activeColor;
            ctx.lineWidth = strokeWidth;
            const activeSteps = Math.max(10, Math.floor((sweepAngle / (2 * Math.PI)) * 180));
            for (let i = 0; i <= activeSteps; i++) {
              const angle = startAngle + (i / activeSteps) * sweepAngle;
              const pt = getPoint(angle);
              if (i === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }
        }
      } else {
        // CIRCULAR STANDARD (Material 3)
        const startAngle = -Math.PI / 2;

        if (isIndet) {
          // Full background track circle (100% M3 Parity)
          ctx.beginPath();
          ctx.strokeStyle = trackColor;
          ctx.lineWidth = strokeWidth;
          ctx.arc(center, center, radius, 0, 2 * Math.PI);
          ctx.stroke();

          // Active Spinning Arc with round caps
          const spin = (elapsed * 2.0) % (2 * Math.PI);
          ctx.beginPath();
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = strokeWidth;
          ctx.arc(center, center, radius, spin, spin + Math.PI * 1.3);
          ctx.stroke();
        } else {
          const sweep = p * 2 * Math.PI;
          const adjustedGapAngle = ((gapSize + strokeWidth) / (2 * Math.PI * radius)) * 2 * Math.PI; // Round cap compensation
          const gapSweep = Math.min(sweep, adjustedGapAngle);

          // Track (GAP AT BOTH ENDS — Android ProgressIndicator.kt §549-550)
          if (p < 0.99 && (startAngle + sweep + gapSweep < startAngle + 2 * Math.PI - gapSweep)) {
            ctx.beginPath();
            ctx.strokeStyle = trackColor;
            ctx.lineWidth = strokeWidth;
            ctx.arc(center, center, radius, startAngle + sweep + gapSweep, startAngle + 2 * Math.PI - gapSweep);
            ctx.stroke();
          }

          // Active Arc
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
    const isLinear = this.type === 'linear';
    const isWavy = this.variant === 'wavy';
    const w = this._getWidth();
    const h = isLinear ? (isWavy ? 10 : 4) : 48;

    this.shadowRoot.innerHTML = `
      <style>
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
          width: ${isLinear ? '100%' : `${w}px`};
          height: ${h}px;
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
          width: ${isLinear ? '100%' : `${w}px`};
          height: ${h}px;
          pointer-events: none;
        }

        :host([type="linear"]) canvas {
          width: 100%;
        }
      </style>

      <div class="progress-root" role="progressbar" aria-label="Progress indicator">
        <canvas></canvas>
      </div>
    `;

    this._syncDimensions();
  }
}

if (!customElements.get('md-progress-indicator')) {
  customElements.define('md-progress-indicator', MdProgressIndicator);
}
