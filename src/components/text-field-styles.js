/** Default filled/outlined field drawing. State and motion are owned in JavaScript. */
export const textFieldStyles=`
 :host{display:inline-block;width:100%;min-width:0;vertical-align:top;outline:none;-webkit-tap-highlight-color:transparent;font-family:var(--md-sys-typescale-font-family)}
 .tf-root{position:relative;display:flex;flex-direction:column;width:100%;box-sizing:border-box}
 .tf-root[data-label-position="cutout"][data-has-label="true"]{padding-block-start:calc(var(--md-sys-typescale-body-small-line-height)*.5)}
 .field-box{position:relative;display:flex;align-items:center;height:56px;min-height:56px;padding:16px;box-sizing:border-box;cursor:text;border-radius:var(--md-sys-shape-corner-extra-small);background:transparent;isolation:isolate}
 .field-box.filled{border-radius:var(--md-sys-shape-corner-extra-small) var(--md-sys-shape-corner-extra-small) 0 0}
 .tf-root[data-label-position="inside"][data-has-label="true"] .field-box{padding-block:8px}
 .field-surface{position:absolute;inset:0;border-radius:inherit;background:var(--md-tf-container);z-index:-1;pointer-events:none}
 .field-outline{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
 .field-outline .outline{fill:none;stroke:var(--md-tf-indicator);rx:var(--md-sys-shape-corner-extra-small);ry:var(--md-sys-shape-corner-extra-small)}
 .field-outline .indicator{stroke:var(--md-tf-indicator)}
 .filled .outline,.outlined .indicator{display:none}
 .input-wrapper{position:relative;display:flex;flex-direction:column;justify-content:center;flex:1;min-width:0;height:100%}
 .label{position:absolute;inset-inline-start:0;top:calc((1 - var(--md-tf-label-progress,0))*50%);transform:translateY(calc((var(--md-tf-label-progress,0) - 1)*50%));pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;color:var(--md-tf-label);font-size:calc(var(--md-sys-typescale-body-large-size) + (var(--md-sys-typescale-body-small-size) - var(--md-sys-typescale-body-large-size))*var(--md-tf-label-progress,0));line-height:calc(var(--md-sys-typescale-body-large-line-height) + (var(--md-sys-typescale-body-small-line-height) - var(--md-sys-typescale-body-large-line-height))*var(--md-tf-label-progress,0));letter-spacing:calc(var(--md-sys-typescale-body-large-tracking) + (var(--md-sys-typescale-body-small-tracking) - var(--md-sys-typescale-body-large-tracking))*var(--md-tf-label-progress,0));font-weight:var(--md-sys-typescale-body-large-weight)}
 .tf-root[data-label-position="cutout"] .label{top:calc((1 - var(--md-tf-label-progress,0))*50% - var(--md-tf-label-progress,0)*(16px + var(--md-sys-typescale-body-small-line-height)*.5));inset-inline-start:calc(-1*var(--md-tf-leading-space,0px)*var(--md-tf-label-progress,0));max-width:calc(100% + var(--md-tf-label-progress,0)*(var(--md-tf-leading-space,0px) + var(--md-tf-trailing-space,0px)))}
 .input-row{display:flex;align-items:center;width:100%;height:24px}
 .tf-root[data-label-position="inside"][data-has-label="true"] .input-row{transform:translateY(calc(var(--md-tf-label-progress,0)*8px))}
 input{flex:1;min-width:0;width:100%;height:24px;border:0;background:transparent;color:var(--md-tf-text);caret-color:var(--md-tf-cursor);font:var(--md-sys-typescale-body-large);letter-spacing:var(--md-sys-typescale-body-large-tracking);padding:0;margin:0;outline:none;box-sizing:border-box}
 input::placeholder{color:var(--md-tf-placeholder);opacity:var(--md-tf-placeholder-opacity,1)}
 .affix{font:var(--md-sys-typescale-body-large);letter-spacing:var(--md-sys-typescale-body-large-tracking);user-select:none;white-space:nowrap;opacity:var(--md-tf-affix-opacity,1)}
 .affix.prefix{color:var(--md-tf-prefix);margin-inline-end:2px}
 .affix.suffix{color:var(--md-tf-suffix);margin-inline-start:2px}
 .ico{font-family: var(--md-icon-font-family, 'Material Symbols Rounded', 'Material Symbols Outlined', sans-serif);font-size:24px;line-height:1;width:48px;height:48px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;user-select:none;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
 .ico.leading{color:var(--md-tf-leading);margin-inline-start:-16px;margin-inline-end:4px}
 .ico.trailing{color:var(--md-tf-trailing);margin-inline-start:4px;margin-inline-end:-16px}
 .field-box>md-icon-button{margin-inline-start:4px;margin-inline-end:-16px}
 .helper-row{display:flex;justify-content:space-between;gap:16px;padding:4px 16px 0;min-height:20px;box-sizing:border-box;font:var(--md-sys-typescale-body-small);letter-spacing:var(--md-sys-typescale-body-small-tracking);color:var(--md-tf-supporting)}
 .helper-row[hidden]{display:none!important}
 .helper-text{overflow-wrap:anywhere;min-width:0}
 .counter{flex:none;margin-inline-start:auto}
 .tf-root.disabled{cursor:default}
 .disabled input{cursor:default}
 .field-box,.tf-root[data-label-position][data-has-label] .field-box{display:block;padding:0;min-height:0}
 .input-wrapper,.input-row{display:contents;position:static;height:auto}
 .tf-root[data-label-position="inside"][data-has-label="true"] .input-row{transform:none}
 .label,.tf-root[data-label-position="cutout"] .label{inset-inline-start:auto;inset-inline-end:auto;right:auto;max-width:none;transform:none;white-space:pre-wrap;overflow-wrap:anywhere}
 .editor,.affix,.ico,.placeholder,.field-box>md-icon-button{position:absolute;box-sizing:border-box;margin:0}
 .ico.leading,.ico.trailing,.field-box>md-icon-button{margin:0}
 .editor{width:auto;min-width:0;padding:0;border:0;border-radius:0;resize:none;outline:none;background:transparent;color:var(--md-tf-text);caret-color:var(--md-tf-cursor);font:var(--md-sys-typescale-body-large);letter-spacing:var(--md-sys-typescale-body-large-tracking);scrollbar-width:none;overflow:auto;appearance:none}
 .editor::-webkit-scrollbar{display:none}
 .disabled .editor{cursor:default}
 .editor[hidden],.placeholder[hidden]{display:none!important}
 .editor::placeholder{color:var(--md-tf-placeholder);opacity:0}
 .placeholder{pointer-events:none;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--md-tf-placeholder);opacity:var(--md-tf-placeholder-opacity,1);font:var(--md-sys-typescale-body-large);letter-spacing:var(--md-sys-typescale-body-large-tracking)}
 .affix{white-space:pre-wrap;overflow-wrap:anywhere}
 .field-measurements{position:absolute;inset:0;visibility:hidden;pointer-events:none;overflow:hidden;z-index:-2}
 .field-measurements>span{display:block;position:static;box-sizing:border-box;padding:0;margin:0;overflow-wrap:anywhere}
 .measure-body{font:var(--md-sys-typescale-body-large);letter-spacing:var(--md-sys-typescale-body-large-tracking)}
 .measure-label{font-size:calc(var(--md-sys-typescale-body-large-size) + (var(--md-sys-typescale-body-small-size) - var(--md-sys-typescale-body-large-size))*var(--md-tf-label-progress,0));line-height:calc(var(--md-sys-typescale-body-large-line-height) + (var(--md-sys-typescale-body-small-line-height) - var(--md-sys-typescale-body-large-line-height))*var(--md-tf-label-progress,0));letter-spacing:calc(var(--md-sys-typescale-body-large-tracking) + (var(--md-sys-typescale-body-small-tracking) - var(--md-sys-typescale-body-large-tracking))*var(--md-tf-label-progress,0));font-weight:var(--md-sys-typescale-body-large-weight)}
`;
