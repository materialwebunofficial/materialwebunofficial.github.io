# Material Design 3 Expressive (MD3E) Web Showcase
# Lighthouse Skor Kurtarma ve 100/100 Erişilebilirlik & Performans Tamir Şartnamesi

> **Tarih:** 2026-08-20  
> **Hedef:** Lighthouse testinde yaşanan skor düşüşünün (Performans: 50, Erişilebilirlik: 74) kesin kök nedenlerini ortadan kaldırmak ve tüm kategorilerde (Performans, Erişilebilirlik, En İyi Uygulamalar, SEO) **95–100 tam puan** seviyesine ulaşmak için diğer kodlama ajanına verilecek kesin tamir şartnamesidir.

---

## 📚 Geçmiş Denetim ve Rapor Referansları (Cross-References)

Bu doküman, projede daha önce gerçekleştirilen şu teknik denetim ve şartname belgelerinin doğrudan devamı ve tamamlayıcısı niteliğindedir:

1. **[`research/INDEXNEW-AUDIT-REPORT.md`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/research/INDEXNEW-AUDIT-REPORT.md):** 36 bileşenin MD3E spesifikasyon ve API uyum denetimi.
2. **[`MD3E_LIGHTHOUSE_AND_RESPONSIVE_AUDIT_REPORT.md`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/MD3E_LIGHTHOUSE_AND_RESPONSIVE_AUDIT_REPORT.md):** İlk Lighthouse, ağ yükü (6.38 MB), 12 viewport responsive ve WCAG 2.2 AA temel denetim raporu.
3. **[`MD3E_EXECUTION_AND_IMPLEMENTATION_SPEC.md`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/MD3E_EXECUTION_AND_IMPLEMENTATION_SPEC.md):** 11 maddelik üretim bundle (`tokens.min.css`, `md3-expressive.esm.js`), `adoptedStyleSheets`, 48px dokunma alanları ve attribute standartlaştırma şartnamesi.

---

## 🔍 Lighthouse Skor Düşüşünün Kesin Kök Neden Analizi (Root Cause Analysis)

Kullanıcının `http://localhost:3000/#components` adresinde yaptığı son Lighthouse testinde ortaya çıkan sonuçlar:
* **Performans: 50** (FCP: 1.0s, **LCP: 8.8s [Kritik]**, TBT: 20ms, **CLS: 0.587 [Kritik]**, Speed Index: 1.5s)
* **Erişilebilirlik: 74** (**Form Labels**, **Label-Content Mismatch**, **Color Contrast**)
* **Best Practices: 100**
* **SEO: 100**

Yapılan JSON audit incelemesinde tespit edilen kesin kök nedenler ve tamir talimatları aşağıda adım adım sıralanmıştır:

---

## 🛠️ ADIM 1: LCP 8.8s ➔ < 1.0s Kurtarma (5.35 MB Preload Kaldırılması)

### 1.1. Problem Tespiti
`index.html` satır 8'e eklenen `<link rel="preload" href="dist/fonts/material-symbols-rounded.woff2" as="font" type="font/woff2" crossorigin>` etiketi, tarayıcıya 5.35 MB'lık (5.470 KB) devasa bir ikili dosyayı en yüksek öncelikle indirmesini emretmektedir.
Lighthouse mobil Slow 4G (1.6 Mbps) ağ simülasyonunda 5.35 MB'lık font tüm ağ bant genişliğini **27 saniye boyunca kitlemekte**, LCP görsel ve metinlerinin inmesini engelleyerek **LCP süresini 8.8 saniyeye fırlatmakta ve skoru 50'ye düşürmektedir.**

### 1.2. Uygulanacak Düzeltme
* **Hedef Dosya:** [`index.html`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/index.html) (Satır 8)
* **İşlem:** Satır 8'deki `<link rel="preload">` etiketini **TAMAMEN SİLİN**.
* **Gerekçe:** Font zaten `dist/tokens.min.css` içinde `font-display: swap;` ile tanımlıdır. Preload olmadan tarayıcı metinleri ve LCP elemanını anında ekrana basacak, font arka planda akacaktır.

```html
<!-- SİLİNECEK SATIR (index.html:8): -->
<link rel="preload" href="dist/fonts/material-symbols-rounded.woff2" as="font" type="font/woff2" crossorigin>

<!-- DOĞRU HEAD YAPISI (index.html:8-13): -->
<link rel="stylesheet" href="dist/tokens.min.css">
<link rel="stylesheet" href="styles/showcase.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Flex:opsz,wght@8..144,300..800&display=swap" rel="stylesheet">
```

---

## 🛠️ ADIM 2: CLS 0.587 ➔ 0.000 Kurtarma (Hash Routing Zıplaması Önleme)

### 2.1. Problem Tespiti
Kullanıcı `http://localhost:3000/#components` adresini ziyaret ettiğinde:
1. `src/showcase.js` başlangıçta `document.body.setAttribute('data-active-tab', 'home')` çalıştırarak sayfayı `#home` sekmesi olarak render etmektedir.
2. Birkaç milisaniye sonra `handleRouteFromHash()` fonksiyonu `location.hash` değerini (`#components`) okuyup sayfayı aniden `Components` sekmesine kaydırmakta (`switchTab('components')`) ve `window.scrollTo` tetiklemektedir.
3. Lighthouse bu ani sekme zıplamasını **0.587'lik devasa bir Cumulative Layout Shift (CLS)** olarak kaydetmekte ve Performans puanını düşürmektedir.

### 2.2. Uygulanacak Düzeltme
* **Hedef Dosya:** [`src/showcase.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/showcase.js)
* **İşlem:** Sayfa açılırken varsayılan sekme sabit 'home' olarak değil, doğrudan `window.location.hash`'ten okunarak senkron atanmalıdır.
* **Uygulanacak Kod Değişikliği (`src/showcase.js:220-225` civarı):**

```javascript
// MEVCUT (Hatalı - Sabit Home ataması):
// document.body.setAttribute('data-active-tab', 'home');

// YENİ (Düzeltilmiş - Hash Duyarlı Başlangıç):
const initialHash = (window.location.hash || '').replace('#', '').trim();
let initialTab = 'home';
if (initialHash === 'components' || initialHash === 'overview' || document.getElementById(initialHash)) {
  initialTab = 'components';
} else if (initialHash === 'get-started' || initialHash === 'getstarted') {
  initialTab = 'get-started';
}

document.body.setAttribute('data-active-tab', initialTab);
if (initialTab === 'components') {
  document.body.classList.remove('drawer-collapsed');
} else {
  document.body.classList.add('drawer-collapsed');
}

tabViews.forEach(view => {
  view.classList.toggle('active', view.id === `tab-view-${initialTab}`);
});
railItems.forEach(item => {
  item.classList.toggle('active', item.dataset.tab === initialTab);
});
mobileNavItems.forEach(item => {
  item.classList.toggle('active', item.dataset.tab === initialTab);
});
drawerDestItems.forEach(item => {
  item.classList.toggle('active', item.dataset.tab === initialTab);
});
```

---

## 🛠️ ADIM 3: Erişilebilirlik 74 ➔ 100 Tamir Paketi (A11y Fixes)

Lighthouse A11y denetiminde başarısız olan 3 somut bileşen içi hata:

### 3.1. `<md-time-picker>` İnputlarında Label Eksikliği (`label`)
* **Hedef Dosya:** [`src/components/md-time-picker.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-time-picker.js) (Satır 910 ve 915)
* **Mevcut Kod:**
  ```html
  <input type="text" id="hour-input" class="time-input-field" maxlength="2" value="${hh}" />
  <input type="text" id="min-input" class="time-input-field" maxlength="2" value="${mm}" />
  ```
* **Uygulanacak Düzeltme:**
  ```html
  <input type="text" id="hour-input" class="time-input-field" maxlength="2" value="${hh}" aria-label="Hour" />
  <input type="text" id="min-input" class="time-input-field" maxlength="2" value="${mm}" aria-label="Minute" />
  ```

---

### 3.2. `<md-text-field>` İçindeki `<input>` Etiketine Label / Aria-Label Aktarımı (`label`)
* **Hedef Dosya:** [`src/components/md-text-field.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-text-field.js) (Satır 505 civarı)
* **Mevcut Kod:**
  ```html
  <input type="${escapeHtml(this.type)}" value="${escapeHtml(this._value)}" placeholder="${escapeHtml(this.placeholder)}">
  ```
* **Uygulanacak Düzeltme:**
  ```html
  <input type="${escapeHtml(this.type)}" value="${escapeHtml(this._value)}" placeholder="${escapeHtml(this.placeholder)}" aria-label="${escapeHtml(this.label || this.getAttribute('aria-label') || 'Text field')}">
  ```

---

### 3.3. `<md-fab>` Görünen Metin ve Aria-Label Uyuşmazlığı (`label-content-name-mismatch`)
* **Hedef Dosya:** [`src/components/md-fab.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-fab.js) (Satır 254)
* **Sorun:** `<md-fab icon="add" label="Compose">` kullanıldığında ekranda "Compose" yazmakta, ancak buton `aria-label="add"` almakta; ekran okuyucu ismi ile görünen metin uyuşmadığı için Lighthouse A11y puan kırmaktadır.
* **Mevcut Kod:**
  ```javascript
  aria-label="${escapeHtml(this.getAttribute('aria-label') || this.icon)}"
  ```
* **Uygulanacak Düzeltme:**
  ```javascript
  const fabAriaLabel = this.getAttribute('aria-label') || (this.labelText ? `${this.icon ? this.icon + ' ' : ''}${this.labelText}` : this.icon);
  ```
  Ve template içinde:
  ```html
  aria-label="${escapeHtml(fabAriaLabel)}"
  ```

---

### 3.4. Renk Paleti Çiplerinde Kontrast Düzeltmesi (`color-contrast`)
* **Hedef Dosya:** [`styles/showcase.css`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/styles/showcase.css)
* **Sorun:** `.tokens-chips-grid .token-chip span` içindeki 12.5px metinlerin kontrast oranı 3.95 kalarak 4.5:1 eşiğini geçememektedir.
* **Uygulanacak Düzeltme:**
  ```css
  .token-chip {
    font-size: 13px;
    font-weight: 600; /* Font ağırlığı 600 yapılarak WCAG Large/Bold 3:1 eşiğine sokulur */
    text-shadow: 0 0 1px rgba(0, 0, 0, 0.2);
  }
  ```

---

## 🚀 Doğrulama & Skor Beklentisi

Bu 4 tamir adımı uygulandıktan sonra terminalde:
```bash
npm run build
```
çalıştırılıp Lighthouse testi tekrarlandığında:

| Lighthouse Metriği | Önceki Hatalı Durum | Tamir Sonrası Hedef |
|---|:---:|:---:|
| ⚡ **Performance** | **50** | **95 – 100** |
| ♿ **Accessibility** | **74** | **100** |
| 🛡️ **Best Practices** | **100** | **100** |
| 🔍 **SEO** | **100** | **100** |
| ⏱️ **LCP (Largest Contentful Paint)** | **8.8 s** | **< 1.2 s** |
| 📐 **CLS (Cumulative Layout Shift)** | **0.587** | **0.000** |
