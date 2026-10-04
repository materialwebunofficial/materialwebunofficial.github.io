import assert from 'node:assert/strict';

export async function testThemeParity(page) {
  const result = await page.evaluate(async () => {
    const { applyDynamicTheme, generateM3Scheme, getActiveHct } = await import('/src/theme/hct-color-engine.js');
    const { MdExpressiveTheme } = await import('/src/components/md-theme.js');
    const root = document.documentElement;
    const saved = { style: root.getAttribute('style'), theme: MdExpressiveTheme.getTheme() };
    const output = {};
    const host = document.createElement('div');
    document.body.append(host);
    let events = 0;
    const onColor = () => events++;
    window.addEventListener('theme-color-change',onColor);
    try {
      root.setAttribute('data-theme','dark');
      host.setAttribute('data-theme','light');
      const tokens = applyDynamicTheme('#ff0000',null,'expressive',host);
      output.localLight = tokens['--md-sys-color-surface'] === generateM3Scheme('#ff0000',false)['--md-sys-color-surface'];
      output.events = events;
      output.globalUnchanged = JSON.stringify(getActiveHct()) !== JSON.stringify(getActiveHct(host));
      output.allRoles = Object.entries(tokens).every(([key,value]) => getComputedStyle(host).getPropertyValue(key).trim() === value);
      const local = document.createElement('md-expressive-theme');
      local.setAttribute('color-mode','light');
      local.setAttribute('primary-seed','#0000ff');
      host.append(local);
      const normal = getComputedStyle(local).getPropertyValue('--md-sys-color-primary');
      local.setAttribute('contrast','high');
      const high = getComputedStyle(local).getPropertyValue('--md-sys-color-primary').trim();
      output.contrast = high !== normal.trim() && high === generateM3Scheme('#0000ff',false,'expressive',1)['--md-sys-color-primary'];
      local.customPalette = { primary: '#123456' };
      output.override = getComputedStyle(local).getPropertyValue('--md-sys-color-primary').trim() === '#123456';
      local.customPalette = null;
      output.restore = getComputedStyle(local).getPropertyValue('--md-sys-color-primary').trim() === high;
      const standard = document.createElement('md-theme');
      standard.scheme = 'expressive';
      output.setter = standard.scheme === 'expressive';
      MdExpressiveTheme.applyGlobal({primarySeed:'#ff0000',contrast:'high',motionScheme:'standard',colorMode:'dark'});
      MdExpressiveTheme.toggleColorMode();
      const current = MdExpressiveTheme.getTheme();
      output.toggle = current.colorMode === 'light' && current.contrast === 'high' && current.motionScheme === 'standard';

      const settle = () => new Promise(resolve=>setTimeout(resolve,0));
      const { SpringPhysics } = await import('/src/motion/spring-physics.js');
      local.removeAttribute('primary-seed');
      local.removeAttribute('color-mode');
      local.removeAttribute('contrast');
      applyDynamicTheme('#00ff00',false,'expressive',host);
      await settle();
      output.liveSeed = local.getAttribute('data-seed-color') === '#00ff00';
      output.liveRoles = getComputedStyle(local).getPropertyValue('--md-sys-color-primary') === getComputedStyle(host).getPropertyValue('--md-sys-color-primary');
      host.style.setProperty('--md-sys-color-primary','#123abc');
      await settle();
      output.liveCustom = getComputedStyle(local).getPropertyValue('--md-sys-color-primary').trim() === '#123abc';

      local.setAttribute('motion-scheme','expressive');
      local.setAttribute('scheme','standard');
      const button = document.createElement('md-button');
      button.textContent = 'Scope';
      local.append(button);
      output.motionCss = getComputedStyle(local).getPropertyValue('--md-sys-motion-scheme').trim().replace(/['"]/g,'') === 'expressive';
      output.motionJs = SpringPhysics.getScheme(button.shadowRoot.querySelector('button')) === 'expressive';
      local.setAttribute('motion-scheme','standard');
      output.motionPreset = SpringPhysics.getPreset('expressiveSpatialFast',button).stiffness === 1400;
      SpringPhysics.animateProperty(button,'opacity',0,1,'expressiveSpatialFast');
      output.motionActual = SpringPhysics._animations.get(button).get('opacity').spec.stiffness === 1400;

      // Observe palette writes only after all custom roles have been applied.
      const loading = document.createElement('md-loading-indicator');
      loading.setAttribute('progress','0.5');
      local.append(loading);
      local.customPalette = {primary:'#abcdef'};
      await settle();
      const resolveColor=value=>{
        const probe=document.createElement('span');local.append(probe);probe.style.color=value;
        const color=getComputedStyle(probe).color;probe.remove();return color;
      };
      output.canvas = loading._resolveActiveColor(false) === resolveColor('#abcdef');
      local.style.setProperty('--md-sys-color-primary','#fedcba');
      await settle();
      output.canvasInline = loading._resolveActiveColor(false) === resolveColor('#fedcba');

      const shadowHost = document.createElement('div');
      host.append(shadowHost);
      const shadow = shadowHost.attachShadow({mode:'open'});
      shadow.innerHTML = '<md-theme><slot></slot></md-theme>';
      const slotted = document.createElement('span');
      shadowHost.append(slotted);
      shadow.querySelector('md-theme').motionScheme = 'standard';
      await settle();
      output.slottedMotion = SpringPhysics.getScheme(slotted) === 'standard';

      const beforeGlobal = { theme: root.getAttribute('data-theme'), seed:root.getAttribute('data-seed-color'),
        primary:root.style.getPropertyValue('--md-sys-color-primary') };
      root.style.setProperty('--md-sys-typescale-font-family','serif','important');
      const first = document.createElement('md-expressive-theme');
      first.setAttribute('global',''); first.primarySeed='#0000ff'; first.fontFamily='monospace';
      const second = document.createElement('md-expressive-theme');
      second.setAttribute('global',''); second.primarySeed='#00ff00';
      host.append(first,second);
      first.remove();
      output.globalOrder = root.getAttribute('data-seed-color') === '#00ff00';
      second.remove();
      output.globalRestore = root.getAttribute('data-theme') === beforeGlobal.theme &&
        root.getAttribute('data-seed-color') === beforeGlobal.seed && root.style.getPropertyValue('--md-sys-color-primary') === beforeGlobal.primary;
      output.fontRestore = root.style.getPropertyValue('--md-sys-typescale-font-family') === 'serif' &&
        root.style.getPropertyPriority('--md-sys-typescale-font-family') === 'important';
      host.append(first);
      first.removeAttribute('global');
      output.scopeMove = root.getAttribute('data-seed-color') === beforeGlobal.seed && first.getAttribute('data-seed-color') === '#0000ff';
      first.remove(); host.append(first);
      output.reconnect = first.getAttribute('data-seed-color') === '#0000ff';
      first.setAttribute('global','');
      root.style.setProperty('--md-sys-color-primary','#0a0b0c');
      first.remove();
      output.externalWrite = root.style.getPropertyValue('--md-sys-color-primary') === '#0a0b0c';
    } finally {
      window.removeEventListener('theme-color-change',onColor);
      host.remove();
      MdExpressiveTheme.applyGlobal(saved.theme);
      if (saved.style === null) root.removeAttribute('style'); else root.setAttribute('style',saved.style);
    }
    return output;
  });
  assert.equal(result.events,1,'one bubbling color event per application');
  for (const [name,passed] of Object.entries(result)) if (name !== 'events') assert.equal(passed,true,name);

  await page.emulateMedia({colorScheme:'dark'});
  await page.evaluate(() => {
    const theme = document.createElement('md-theme');
    theme.id = 'system-theme-test';
    theme.setAttribute('color-mode','auto');
    document.body.append(theme);
  });
  assert.equal(await page.locator('#system-theme-test').getAttribute('data-theme'),'dark');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(() => document.getElementById('system-theme-test').getAttribute('data-theme') === 'light');
  await page.locator('#system-theme-test').evaluate(theme=>theme.remove());
  await page.emulateMedia({colorScheme:null});

  const storage = await page.evaluate(() => {
    const keys = ['md3e_hct_state','md3e_hct_version','md3e_seed_hex'];
    const saved = Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)]));
    localStorage.setItem('md3e_hct_state',JSON.stringify({hue:40,chroma:104,tone:53}));
    localStorage.removeItem('md3e_hct_version');
    localStorage.setItem('md3e_seed_hex','#ff0000');
    return saved;
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => localStorage.getItem('md3e_hct_version') === 'mcu-0.4.0');
  assert.equal(await page.locator('html').getAttribute('data-seed-color'),'#ff0000');
  await page.evaluate(saved => {
    for (const [key,value] of Object.entries(saved)) {
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value);
    }
  },storage);
  await page.reload({waitUntil:'domcontentloaded'});
}
