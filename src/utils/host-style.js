/**
 * A shadow-root <style> holding a component's measured host declarations and
 * generated rules (slotted child positions).
 *
 * WebKit does not restyle a shadow host after CSSOM edits to a `:host` rule
 * (setProperty or insertRule on the sheet), so app bars measured 0px tall and
 * selection controls 0x0 there. Replacing the style text invalidates the host
 * in every engine; unchanged values write nothing.
 */
export class HostStyleSheet {
  constructor(root, initial = {}, selector = ':host') {
    this.element = document.createElement('style');
    this.selector = selector;
    this.properties = new Map(Object.entries(initial).map(([name, value]) => [name, String(value)]));
    this.rules = [];
    this._text = null;
    root.append(this.element);
    this._write();
    const sheet = this;
    // The CSSStyleDeclaration subset the layouts use.
    this.host = {
      setProperty(name, value) { value = String(value); if (sheet.properties.get(name) === value) return; sheet.properties.set(name, value); sheet._write(); },
      removeProperty(name) { if (sheet.properties.delete(name)) sheet._write(); },
      getPropertyValue(name) { return sheet.properties.get(name) ?? ''; },
    };
  }
  get sheet() { return this.element.sheet; }
  /** Replaces the generated rules after the host rule. */
  setRules(rules) { this.rules = [...rules]; this._write(); }
  insertRule(rule) { this.rules.push(rule); this._write(); }
  clearRules() { if (!this.rules.length) return; this.rules = []; this._write(); }
  remove() { this.element.remove(); }
  _write() {
    const declarations = [...this.properties].map(([name, value]) => `${name}:${value}`).join(';');
    const text = `${this.selector}{${declarations}}${this.rules.join('')}`;
    if (text === this._text) return;
    this._text = text;
    this.element.textContent = text;
  }
}
