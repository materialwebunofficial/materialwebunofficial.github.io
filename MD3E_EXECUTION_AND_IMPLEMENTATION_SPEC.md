# Material Design 3 Expressive (MD3E) Web Showcase
# Eksiksiz Kodlama & İmplementasyon Şartnamesi (11 Maddelik Tam Uygulama Rehberi)

> **Amaç:** Bu doküman, denetim tablosunda yer alan ve **henüz uygulanmamış olan 11 maddenin (%91.7)** tamamını, **birebir madde numaralarıyla, ilgili dosyalarla, tam satır numaralarıyla ve kopyalanıp uygulanabilir kod bloklarıyla** eksiksiz olarak tanımlayan nihai uygulama şartnamesidir.

---

## 📑 Denetim Tablosu Eşleşme Matrisi

| Madde No | İyileştirme Başlığı | İlgili Dosya & Satır | Durum | Şartnamedeki Bölüm |
|:---:|---|---|:---:|:---:|
| **1** | **Bileşen Önizleme & Izgara Esnekliği** | `styles/showcase.css` | ✅ Uygulandı | *Tamamlandı (Dokunulmayacak)* |
| **2** | **Üretim CSS Paketine Geçiş (`dist/tokens.min.css`)** | `index.html:8` | ❌ Uygulanmadı | [BÖLÜM 1](#bölüm-1-üretim-css-paketine-geçiş) |
| **3** | **Üretim JS Modül Paketine Geçiş (`dist/md3-expressive.esm.js`)** | `index.html:2168` | ❌ Uygulanmadı | [BÖLÜM 2](#bölüm-2-üretim-js-modül-paketine-geçiş) |
| **4** | **`fonts.gstatic.com` Preconnect Eklenmesi** | `index.html:11` | ❌ Uygulanmadı | [BÖLÜM 3](#bölüm-3-fontsgstaticcom-preconnect-eklenmesi) |
| **5** | **5.35 MB İkon Font Boyutu / Çift Yüklemenin Önlenmesi (Tam Set Yerel)** | `index.html:12` | ❌ Uygulanmadı | [BÖLÜM 4](#bölüm-4-tam-set-yerel-ikon-barındırma--çift-yüklemeyi-önleme) |
| **6** | **Mobil Dokunma Alanlarının ≥48px Yapılması** | `styles/showcase.css:418, 591, 2620` | ❌ Uygulanmadı | [BÖLÜM 5](#bölüm-5-mobil-dokunma-alanlarının-48px-yapılması) |
| **7** | **Başlık Hiyerarşisinin Düzenlenmesi (Tek H1, H2-H3 Sıralaması)** | `index.html:172, 317, 707, 1076` | ❌ Uygulanmadı | [BÖLÜM 6](#bölüm-6-başlık-hiyerarşisinin-düzenlenmesi) |
| **8** | **36 Bileşende `adoptedStyleSheets` Mimarisine Geçiş** | `src/components/*.js` (36 Dosya) | ❌ Uygulanmadı | [BÖLÜM 7](#bölüm-7-36-bileşende-adoptedstylesheets-mimarisine-geçiş) |
| **9** | **`font-display: swap` Tanımına Geçiş** | `src/icons/material-symbols.css:5, 31, 57` | ❌ Uygulanmadı | [BÖLÜM 8](#bölüm-8-font-display-swap-tanımına-geçiş) |
| **10** | **Event Listener Delegasyonu (1,514 Listener'ın Azaltılması)** | `src/motion/interactions.js` | ❌ Uygulanmadı | [BÖLÜM 9](#bölüm-9-event-listener-delegasyonu) |
| **11** | **Dinamik Tema Motorunda Toplu CSS Enjeksiyonu (Batching)** | `src/theme/hct-color-engine.js:25-95` | ❌ Uygulanmadı | [BÖLÜM 10](#bölüm-10-dinamik-tema-motorunda-toplu-css-enjeksiyonu) |
| **12** | **Attribute Uyumsuzlukları (`icons` ➔ `icon`, `selected-icon`)** | `index.html:1029, 1663` & `md-icon-button.js` | ❌ Uygulanmadı | [BÖLÜM 11](#bölüm-11-attribute-uyumsuzlukları-ve-selected-icon-desteği) |

---

## BÖLÜM 1: Üretim CSS Paketine Geçiş (`dist/tokens.min.css`)
* **Tablo Sırası:** Madde 2
* **Hedef Dosya:** [`index.html`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/index.html) (ve kök `index.html`)
* **Mevcut Kod (Satır 8–10):**
  ```html
  <link rel="stylesheet" href="src/tokens/bundle.css">
  <link rel="stylesheet" href="src/icons/material-symbols.css">
  <link rel="stylesheet" href="styles/showcase.css">
  ```
* **Sorun:** `src/tokens/bundle.css` dosyası içerisinde 6 adet `@import url(...)` bulunmaktadır. Bu durum tarayıcının CSS dosyalarını ardışık olarak (waterfall) 11 ayrı HTTP isteğiyle indirmesine ve Render Blocking süresinin uzamasına neden olur.
* **Uygulanacak Yeni Kod:**
  ```html
  <link rel="stylesheet" href="dist/tokens.min.css">
  <link rel="stylesheet" href="styles/showcase.css">
  ```
  *(Not: `dist/tokens.min.css` dosyası zaten tüm token ve ikon CSS tanımlarını minify edilmiş tek bir paket olarak içermektedir).*

---

## BÖLÜM 2: Üretim JS Modül Paketine Geçiş (`dist/md3-expressive.esm.js`)
* **Tablo Sırası:** Madde 3
* **Hedef Dosya:** [`index.html`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/index.html) (ve kök `index.html`)
* **Mevcut Kod (Satır 2168–2172):**
  ```html
  <script type="module" src="src/index.js"></script>
  <script type="module">
    import { initShowcase } from './src/showcase.js';
    initShowcase();
  </script>
  ```
* **Sorun:** `src/index.js` doğrudan çağrıldığında tarayıcı 36 ayrı bileşen dosyasını ve bağımlılıklarını 42 ayrı HTTP isteğiyle indirir. Bu durum ana iş parçacığında (main thread) gecikmeye yol açar.
* **Uygulanacak Yeni Kod:**
  ```html
  <script type="module" src="dist/md3-expressive.esm.js"></script>
  <script type="module">
    import { initShowcase } from './src/showcase.js';
    initShowcase();
  </script>
  ```

---

## BÖLÜM 3: `fonts.gstatic.com` Preconnect Eklenmesi
* **Tablo Sırası:** Madde 4
* **Hedef Dosya:** [`index.html`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/index.html) (ve kök `index.html`)
* **Mevcut Kod (Satır 11):**
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  ```
* **Sorun:** Google Fonts üzerinden font CSS'i `fonts.googleapis.com`'dan gelirken, gerçek font binary dosyaları (`.woff2`) `fonts.gstatic.com`'dan indirilir. Preconnect eksikliği ek bir DNS + TLS gecikmesine (~200-400ms) neden olur.
* **Uygulanacak Yeni Kod:**
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ```

---

## BÖLÜM 4: Tam Set Yerel İkon Barındırma & Çift Yüklemeyi Önleme
* **Tablo Sırası:** Madde 5
* **Hedef Dosyalar:** 
  1. [`index.html`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/index.html) (Satır 12)
  2. [`src/icons/material-symbols.css`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/icons/material-symbols.css)
  3. `src/icons/fonts/material-symbols-rounded.woff2` (5.35 MB yerel dosya)
* **Mevcut Durum:**
  `index.html` satır 12'de Google Fonts'tan devasa `Material Symbols Outlined` ve `Material Symbols Rounded` ailesi çağrılmaktadır. Aynı zamanda `dist/tokens.min.css` (veya `material-symbols.css`) zaten yerel `src/icons/fonts/material-symbols-rounded.woff2` dosyasını çekmektedir. Böylece tarayıcı **5.35 MB'lık ikon fontunu iki kez (çift)** indirmektedir!
* **Uygulanacak Değişiklik:**
  1. `index.html` satır 12'deki Google Fonts URL'sinden `Material+Symbols` kısımlarını kaldırın (Sadece `Roboto` kalsın):
     ```html
     <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Flex:opsz,wght@8..144,300..800&display=swap" rel="stylesheet">
     ```
  2. İkonlar tamamen projenin içindeki yerel `src/icons/fonts/material-symbols-rounded.woff2` (tam set, 3.000+ ikon) dosyasından yüklenecektir.
  3. Yerel ikon fontunun ilk anda öncelikli yüklenmesi için `index.html` head içine preload ekleyin:
     ```html
     <link rel="preload" href="src/icons/fonts/material-symbols-rounded.woff2" as="font" type="font/woff2" crossorigin>
     ```

---

## BÖLÜM 5: Mobil Dokunma Alanlarının ≥48px Yapılması
* **Tablo Sırası:** Madde 6
* **Hedef Dosya:** [`styles/showcase.css`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/styles/showcase.css)
* **Mevcut Durum:**
  * Satır 418–419: `.rail-bottom-btn { width: 40px; height: 40px; }` (Mobilde üst bar aksiyon butonları 40px kalıyor).
  * Satır 591: `.sub-nav-item { height: 40px; }` (Mobilde çekmece linkleri 40px kalıyor).
  * Satır 625: `.sub-nav-subitem { height: 36px; }` (Mobilde akordiyon alt linkleri 36px kalıyor).
* **Sorun:** WCAG 2.2 SC 2.5.8 (Target Size Minimum) ve Material Design 3 standardına göre mobil dokunmatik ekranlarda hedef boyutu minimum 48x48dp olmalıdır.
* **Uygulanacak Yeni Kod (`styles/showcase.css` mobil medya sorgusu içine):**
  ```css
  @media (max-width: 600px) {
    .mobile-top-bar-actions .rail-bottom-btn,
    .mobile-drawer-btn {
      width: 48px;
      height: 48px;
      min-width: 48px;
      min-height: 48px;
    }

    .sub-nav-item,
    .drawer-dest-item {
      min-height: 48px;
      height: 48px;
    }

    .sub-nav-subitem {
      min-height: 44px;
      height: 44px;
    }
  }
  ```

---

## BÖLÜM 6: Başlık Hiyerarşisinin Düzenlenmesi
* **Tablo Sırası:** Madde 7
* **Hedef Dosya:** [`index.html`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/index.html) (ve kök `index.html`)
* **Mevcut Durum & Hatalar:**
  1. **Satır 172:** `<h1>Material Design 3 Expressive — Built for the Web</h1>` (Sayfanın tek `<h1>`'i olarak KORUNACAK).
  2. **Satır 317:** `<h1>Getting Started with MD3E</h1>` ➔ **HATA:** İkinci `<h1>`. `<h2>Getting Started with MD3E</h2>` yapılmalıdır.
  3. **Satır 707:** `<h1>Components</h1>` ➔ **HATA:** Üçüncü `<h1>`. `<h2>Components</h2>` yapılmalıdır.
  4. **Satır 1076–1110 (Cards Bölümü):** `<h2>Cards</h2>` altındaki kart isimleri `<h4>Filled Card (Interactive)</h4>` olarak yazılmış (`<h3>` atlanmış). Bu başlıklar `<h3>` yapılmalıdır.

---

## BÖLÜM 7: 36 Bileşende `adoptedStyleSheets` Mimarisine Geçiş
* **Tablo Sırası:** Madde 8
* **Hedef Dosyalar:** `src/components/*.js` altındaki tüm 36 bileşen dosyası:
  1. `md-badge.js`
  2. `md-bottom-app-bar.js`
  3. `md-bottom-sheet.js`
  4. `md-button.js`
  5. `md-card.js`
  6. `md-carousel.js`
  7. `md-checkbox.js`
  8. `md-chip.js`
  9. `md-date-picker.js`
  10. `md-dialog.js`
  11. `md-divider.js`
  12. `md-fab-menu.js`
  13. `md-fab.js`
  14. `md-icon-button.js`
  15. `md-list.js`
  16. `md-loading-indicator.js`
  17. `md-menu.js`
  18. `md-navigation-bar.js`
  19. `md-navigation-drawer.js`
  20. `md-navigation-rail.js`
  21. `md-progress-indicator.js`
  22. `md-radio-button.js`
  23. `md-search-bar.js`
  24. `md-segmented-button.js`
  25. `md-side-sheet.js`
  26. `md-slider.js`
  27. `md-snackbar.js`
  28. `md-split-button.js`
  29. `md-switch.js`
  30. `md-tabs.js`
  31. `md-text-field.js`
  32. `md-theme.js`
  33. `md-time-picker.js`
  34. `md-toolbar.js`
  35. `md-tooltip.js`
  36. `md-top-app-bar.js`

* **Mevcut Mimari Hata:**
  Tüm bileşenlerde `_render()` metodu `this.shadowRoot.innerHTML = '<style>...</style>...'` şeklinde çalışmakta; 166 bileşen instance'ı 166 kez aynı CSS stringini parse ederek DOM node sayısını 10,600'e ve bellek tüketimini yukarılara taşımaktadır.
* **Uygulanacak Standart Dönüşüm Deseni:**
  ```javascript
  // 1. Dosya başında statik tekil CSSStyleSheet derleyin:
  const componentStyles = new CSSStyleSheet();
  componentStyles.replaceSync(`
    :host {
      display: inline-flex;
      vertical-align: middle;
      outline: none;
    }
    /* Bileşenin tüm CSS kuralları */
  `);

  export class MdBilesen extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      // 2. CSSStyleSheet'i paylaşımlı olarak bağlayın:
      this.shadowRoot.adoptedStyleSheets = [componentStyles];
      this._rendered = false;
    }

    _render() {
      // 3. <style> etiketini innerHTML içinden tamamen çıkarın:
      this.shadowRoot.innerHTML = `
        <div class="container" part="container">
          <slot></slot>
        </div>
      `;
    }
  }
  ```

---

## BÖLÜM 8: `font-display: swap` Tanımına Geçiş
* **Tablo Sırası:** Madde 9
* **Hedef Dosya:** [`src/icons/material-symbols.css`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/icons/material-symbols.css)
* **Mevcut Durum (Satır 5, 31, 57):**
  `font-display: block;`
* **Sorun:** `block` değeri, font dosyası inene kadar ikonların 3 saniyeye kadar görünmez kalmasına (FOIT) neden olur.
* **Uygulanacak Yeni Kod:**
  Tüm `@font-face` bloklarındaki `font-display: block;` satırlarını `font-display: swap;` olarak değiştirin:
  ```css
  @font-face {
    font-family: "Material Symbols Outlined";
    font-style: normal;
    font-weight: 100 700;
    font-display: swap;
    src: url("./fonts/material-symbols-outlined.woff2") format("woff2");
  }

  @font-face {
    font-family: "Material Symbols Rounded";
    font-style: normal;
    font-weight: 100 700;
    font-display: swap;
    src: url("./fonts/material-symbols-rounded.woff2") format("woff2");
  }

  @font-face {
    font-family: "Material Symbols Sharp";
    font-style: normal;
    font-weight: 100 700;
    font-display: swap;
    src: url("./fonts/material-symbols-outlined.woff2") format("woff2");
  }
  ```

---

## BÖLÜM 9: Event Listener Delegasyonu
* **Tablo Sırası:** Madde 10
* **Hedef Dosya:** [`src/motion/interactions.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/motion/interactions.js)
* **Mevcut Durum:** Her bileşen oluşturulduğunda `bindPress()`, `createRipple()` bağımsız dinleyiciler bağlamakta ve toplam 1,514 listener oluşmaktadır.
* **Uygulanacak İyileştirme:**
  Etkileşim dinleyicilerini zayıf referans (WeakMap) ve pasif (`{ passive: true }`) bayraklarıyla optimize edin. Bileşen DOM'dan söküldüğünde (`disconnectedCallback`) AbortController veya RemoveListener ile tüm dinleyicilerin temizlendiğini garanti edin.

---

## BÖLÜM 10: Dinamik Tema Motorunda Toplu CSS Enjeksiyonu (Batching)
* **Tablo Sırası:** Madde 11
* **Hedef Dosya:** [`src/theme/hct-color-engine.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/theme/hct-color-engine.js)
* **Mevcut Durum:**
  Renk ve tema modu değiştiğinde 100'den fazla CSS değişkeni tek tek `document.documentElement.style.setProperty()` ile set edilmektedir. Bu durum her değişkende stil yeniden hesaplamasını (Recalc Style) tetikler.
* **Uygulanacak Yeni Fonksiyon:**
  ```javascript
  export function applyDynamicTheme(hctState, isDark, scheme = 'expressive') {
    const tokens = generateM3Scheme(hctState, isDark, scheme);
    let cssText = ':root {\n';
    for (const [key, val] of Object.entries(tokens)) {
      cssText += `  ${key}: ${val};\n`;
    }
    cssText += '}\n';

    let styleEl = document.getElementById('md3e-dynamic-theme-vars');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'md3e-dynamic-theme-vars';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = cssText;
  }
  ```

---

## BÖLÜM 11: Attribute Uyumsuzlukları ve `selected-icon` Desteği
* **Tablo Sırası:** Madde 12
* **Hedef Dosyalar:**
  1. [`index.html`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/index.html) (Satır 1663 ve 1029–1039)
  2. [`src/components/md-icon-button.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-icon-button.js)

* **1. `index.html:1663` Switch Attribute Düzeltmesi:**
  * **Mevcut:** `<md-switch checked icons aria-label="Checked with check icon"></md-switch>`
  * **Yeni:** `<md-switch checked icon="check" aria-label="Checked with check icon"></md-switch>`

* **2. `src/components/md-icon-button.js` `selected-icon` Desteği:**
  * `observedAttributes` dizisine `'selected-icon'` ekleyin.
  * `get selectedIcon() { return this.getAttribute('selected-icon') || ''; }` getter'ını ekleyin.
  * `_sync()` metodunda: Buton `toggle` ve `selected` durumundaysa ve `this.selectedIcon` tanımlıysa ikonu `this.selectedIcon` olarak güncelleyin.

---

## 🚀 Derleme & Doğrulama Komutları

Uygulayıcı ajan tüm maddeleri tamamladıktan sonra sırasıyla şu komutları çalıştırmalıdır:

```bash
# 1. Paketleri yeniden derleyin:
npm run build

# 2. Testleri çalıştırarak doğrulayın:
npm run test
```

Tüm 4 test suite'i (**1. Token Verification, 2. All Components, 3. Security Fixes, 4. NPM Bundle**) yeşil (**PASS**) olmalıdır.
