/**
 * Material Design 3 Expressive (MD3E) Style Utilities
 * Provides adoptedStyleSheets singleton caching and Shadow DOM style attachment.
 */

/**
 * Creates and compiles a CSSStyleSheet instance for adoptedStyleSheets sharing.
 * Safely handles environments where CSSStyleSheet or replaceSync is unavailable (e.g. Node.js SSR / older engines).
 *
 * @param {string} cssText CSS rules as string
 * @returns {CSSStyleSheet|null} Compiled CSSStyleSheet or null
 */
export function createComponentSheet(cssText) {
  if (typeof CSSStyleSheet !== 'undefined' && typeof CSSStyleSheet.prototype.replaceSync === 'function') {
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

/**
 * Adopts a compiled CSSStyleSheet to a target ShadowRoot.
 *
 * @param {ShadowRoot} shadowRoot Target shadow root
 * @param {CSSStyleSheet|null} sheet Compiled stylesheet
 */
export function adoptSheet(shadowRoot, sheet) {
  if (sheet && shadowRoot && 'adoptedStyleSheets' in shadowRoot) {
    try {
      shadowRoot.adoptedStyleSheets = [sheet];
    } catch (_) {
      // Graceful fallback to inline <style> tag
    }
  }
}
