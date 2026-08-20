# Material Design 3 Expressive (MD3E) Web Showcase
# Kapsamlı Performans (Font Optimizasyonu) ve 100/100 Erişilebilirlik Tamir Şartnamesi

> **Doküman Türü:** Teknik Tamir ve İmplementasyon Şartnamesi  
> **Hedef:** Performans skorunu 55'ten 95+'e, Erişilebilirlik (A11y) skorunu 81'den **100/100 Tam Puan** seviyesine çıkarmak.

---

## 📑 1. Geçmiş Denetim ve Şartname Belgeleri Referans Tablosu

Bu doküman, projede yürütülen önceki teknik çalışmaların devamı niteliğindedir:

| Belge Yolu | Kapsam ve İlgili Bölümler |
|---|---|
| [`research/INDEXNEW-AUDIT-REPORT.md`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/research/INDEXNEW-AUDIT-REPORT.md) | 36 bileşenin MD3E spesifikasyon ve API uyum denetimi. |
| [`MD3E_LIGHTHOUSE_AND_RESPONSIVE_AUDIT_REPORT.md`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/MD3E_LIGHTHOUSE_AND_RESPONSIVE_AUDIT_REPORT.md) | İlk Lighthouse, 12 viewport responsive ve WCAG 2.2 AA temel denetimi. |
| [`MD3E_EXECUTION_AND_IMPLEMENTATION_SPEC.md`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/MD3E_EXECUTION_AND_IMPLEMENTATION_SPEC.md) | 11 maddelik üretim paketi (`tokens.min.css`, `md3-expressive.esm.js`), `adoptedStyleSheets` ve 48px dokunma alanları şartnamesi. |
| [`MD3E_LIGHTHOUSE_RECOVERY_AND_ACCESSIBILITY_SPEC.md`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/MD3E_LIGHTHOUSE_RECOVERY_AND_ACCESSIBILITY_SPEC.md) | CLS (0.587 ➔ 0.000) ve temel font preload kaldırma tamiri. |

---

## 📊 2. Mevcut Canlı Ölçüm Verileri ve Durum Tespiti

Lighthouse ve Playwright üzerinden `http://localhost:3000/#components` adresinde yapılan son canlı test sonuçları:

* **Cumulative Layout Shift (CLS):** `0.000` *(Kusursuz / Sıfır Kayma)*
* **Total Blocking Time (TBT):** `0 ms` *(Kusursuz / Sıfır Main-Thread Blokajı)*
* **Best Practices:** `100 / 100` *(Kusursuz)*
* **SEO:** `100 / 100` *(Kusursuz)*
* **Erişilebilirlik (A11y):** `81 / 100` ➔ **Eksik: 19 Puan (5 Kategori)**
* **Performans:** `55 / 100` ➔ **Darboğaz: 9.1 MB İndirilen Font Dosyaları**

---

## 🌐 3. Performans ve Ağ Darboğazı: 9.1 MB Font Analizi & Çözüm Yolu

### 3.1. Gerçek Durum ve Fiziksel Sınırlar
Canlı ağ trafiği incelemesinde sayfanın açılışta 2 ayrı font indirdiği tespit edilmiştir:
1. `dist/fonts/material-symbols-rounded.woff2`: **5.22 MB**
2. `dist/fonts/material-symbols-outlined.woff2`: **3.87 MB**
3. **Toplam Font Ağırlığı: 9.09 MB (9,097 KB)**

Lighthouse mobil testi, standart **Slow 4G (1.6 Mbps)** indirme hızı simülasyonu uygular.
Matematiksel olarak:
$$\text{İndirme Süresi} = \frac{9.09 \text{ MB} \times 8}{1.6 \text{ Mbps}} \approx 45.4 \text{ saniye}$$

Tarayıcı ne kadar optimize edilirse edilsin, 9.1 MB'lık veri mobil 4G ağında ~45 saniyede iner. Lighthouse bu yüzden FCP/LCP süresini 53 saniye ölçmekte ve performans puanını 55 vermektedir.

### 3.2. Pragmatik Çözüm Seçenekleri

#### Seçenek A (Tavsiye Edilen / Üretim Standardı): Font Subsetting (Alt Kümeleme)
* Vitrinde kullanılan 83 adet ikonu içeren alt küme font dosyası oluşturulur.
* Font boyutu **9.09 MB'tan ~32 KB'a** iner (**%99.6 veri tasarrufu**).
* Mobil indirme süresi **45 saniyeden 0.1 saniyeye** geriler.
* Mobil performans skoru doğrudan **95–100** seviyesine çıkar.

#### Seçenek B (Tam Set 9 MB Korunacaksa): Tek Font Ailesine İndirgeme
* Projede hem `Outlined` hem `Rounded` yerine sadece tek bir aile (`Rounded`) kullanılır.
* `@font-face` tanımlarında `Sharp` ve `Outlined` tanımları da `material-symbols-rounded.woff2` dosyasına yönlendirilir.
* İndirilen font boyutu 9.1 MB'tan 5.2 MB'a düşürülür.

---

## ♿ 4. Erişilebilirlik (A11y) 81 ➔ 100 Tamir Şartnamesi

Erişilebilirlikte kaybedilen 19 puanı geri kazandıracak 5 somut teknik düzeltme:

---

### 4.1. `<md-slider>` ARIA İsim Eksikliği (`aria-input-field-name`)
* **Ağırlık:** 7 Puan
* **Hedef Dosya:** [`src/components/md-slider.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-slider.js)
* **Mevcut Durum (Satır 348–354 ve 509):** `div.slider-root` elementi `role="slider"` taşıyor ancak `aria-label` set edilmiyor.
* **Uygulanacak Düzeltme:**
  1. `render()` metodunda (Satır 509):
     ```html
     <!-- ÖNCE: -->
     <div class="slider-root" role="slider" tabindex="0" aria-orientation="horizontal">

     <!-- SONRA: -->
     <div class="slider-root" role="slider" tabindex="0" aria-orientation="horizontal" aria-label="Slider">
     ```
  2. `_sync()` metoduna (Satır 354 civarı) şu satırı ekleyin:
     ```javascript
     root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || 'Slider');
     ```

---

### 4.2. `<md-checkbox>`, `<md-radio-button>`, `<md-switch>` ARIA İsimleri (`aria-toggle-field-name`)
* **Ağırlık:** 7 Puan
* **Hedef Dosyalar:**
  1. [`src/components/md-checkbox.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-checkbox.js)
  2. [`src/components/md-radio-button.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-radio-button.js)
  3. [`src/components/md-switch.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-switch.js)

* **Uygulanacak Düzeltmeler:**
  * **`src/components/md-checkbox.js` (Satır 277 ve 325):**
    ```javascript
    // _sync() içine ekleyin:
    root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || 'Checkbox');
    ```
  * **`src/components/md-radio-button.js` (Satır 215 ve 260):**
    ```javascript
    // _sync() içine ekleyin:
    root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || this.getAttribute('value') || 'Radio button');
    ```
  * **`src/components/md-switch.js` (Satır 270 ve 315):**
    ```javascript
    // _sync() içine ekleyin:
    root.setAttribute('aria-label', this.getAttribute('aria-label') || this.getAttribute('label') || 'Switch');
    ```

---

### 4.3. `<md-time-picker>` Kadranında Eksik `aria-valuenow` (`aria-required-attr`)
* **Ağırlık:** 10 Puan
* **Hedef Dosya:** [`src/components/md-time-picker.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-time-picker.js)
* **Mevcut Durum (Satır 947):**
  ```html
  <div class="clock-face" role="slider" aria-label="Clock Dial" aria-valuemin="0" aria-valuemax="59">
  ```
* **Sorun:** W3C ARIA kurallarına göre `role="slider"` taşıyan element `aria-valuenow` içermek zorundadır.
* **Uygulanacak Düzeltme:**
  ```html
  <!-- DÜZELTİLMİŞ KOD: -->
  <div class="clock-face" role="region" aria-label="Clock Dial">
  ```
  *(Not: Kadran bir grup/bölge container'ıdır; etkileşimli değerler içindeki butonlar tarafından taşınır).*

---

### 4.4. `<md-list>` ARIA Liste Hiyerarşisi (`aria-required-children`)
* **Ağırlık:** 10 Puan
* **Hedef Dosya:** [`src/components/md-list.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-list.js)
* **Mevcut Durum (Satır 83):**
  ```html
  <div class="list ${escapeHtml(this.variant)}" role="list">
  ```
* **Sorun:** Shadow DOM içindeki `role="list"` doğrudan `<slot>` barındırdığında, Lighthouse light DOM'daki `md-list-item`'ları doğrudan çocuk olarak görmediği için `aria-required-children` hatası verir.
* **Uygulanacak Düzeltme:**
  ```html
  <!-- DÜZELTİLMİŞ KOD: -->
  <div class="list ${escapeHtml(this.variant)}" role="group" aria-label="${escapeHtml(this.getAttribute('aria-label') || 'List')}">
  ```

---

### 4.5. `<md-badge>` ve Renk Çiplerinde Kontrast İyileştirmesi (`color-contrast`)
* **Ağırlık:** 7 Puan
* **Hedef Dosyalar:**
  1. [`src/components/md-badge.js`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/src/components/md-badge.js) (Satır 26–27)
  2. [`styles/showcase.css`](file:///c:/Users/sagla/OneDrive/Belgeler/MD3E%20for%20web/material-design-3-expressive-unofficial/styles/showcase.css) (Satır 24330 civarı)

* **Uygulanacak Düzeltme:**
  * `src/components/md-badge.js` stil tanımında:
    ```css
    .badge {
      background-color: var(--md-sys-color-error, #B3261E);
      color: #FFFFFF !important;
      font-weight: 700;
    }
    ```
  * `styles/showcase.css` içindeki `.token-chip`:
    ```css
    .tokens-chips-grid .token-chip {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    ```

---

## 🛠️ 5. Doğrulama ve Derleme Protokolü

Değişiklikler uygulandıktan sonra sırasıyla çalıştırılmalıdır:

```bash
# 1. Paketleri derleyin:
npm run build

# 2. Test suitelerini çalıştırın:
npm run test

# 3. Canlı Lighthouse denetimini tetikleyin:
node scratch/diagnose-lighthouse.mjs
```

### Beklenen Hedef Skor Tablosu

| Metrik | Mevcut Değer | Düzeltme Sonrası Hedef |
|---|:---:|:---:|
| ♿ **Accessibility** | **81** | **100 / 100** |
| 🛡️ **Best Practices** | **100** | **100 / 100** |
| 🔍 **SEO** | **100** | **100 / 100** |
| 📐 **CLS** | **0.000** | **0.000** |
| ⚡ **TBT** | **0 ms** | **0 ms** |
| 🚀 **Performance (Subsetting ile)** | **55** | **95 – 100** |
