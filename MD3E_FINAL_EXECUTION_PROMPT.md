# Material Design 3 Expressive (MD3E)
# Nihai Kodlama ve Düzeltme Talimatı (Final Execution Prompt)

> **Amaç:** Bu doküman, Lighthouse mobil testinde **Performans: 95–100**, **Erişilebilirlik: 100/100 (Tam Puan)**, **En İyi Uygulamalar: 100** ve **SEO: 100** seviyesine ulaşmak; aynı zamanda **Material Design 3 Expressive tasarım kimliğini %100 korumak** için kodlama ajanına verilecek kesin talimat belgesidir.

---

## 📌 Durum Özeti & Neden Bu Düzeltmeler Gerekiyor?

1. **Font Boyutu Durumu:** Son güncellemede (`1d7bbdd`) iki ayrı font dosyası tek dosyaya indirilmiş ve indirme 9.1 MB'tan 5.35 MB'a düşürülmüştür. Ancak **5.35 MB tek başına bile** mobil Slow 4G (1.6 Mbps) ağında **27 saniyede** inmekte ve mobil performans skorunu **55'te çakılı tutmaktadır.** Kullanılan 83 ikonun alt kümelenmesi (subset) ile font **~32 KB'a** inecek ve performans anında **95+** olacaktır.
2. **Rozet (Badge) Tasarım Aykırılığı:** `md-badge.js` içine yazılan hardcode `color: #FFFFFF !important;` karanlık temada açık pembe `#FF808A` üzerine beyaz metin basarak hem MD3 tasarımını bozmuş hem de kontrastı 2.41:1'e düşürmüştür. Rozet standart tokenlarına döndürülmeli, düzeltme tema motoru seviyesinde Tone 20 (`#690005`) ile yapılmalıdır.
3. **Erişilebilirlik (A11y):** Skor şu anda **97'dir.** Kalan 2 küçük `aria-label` uyuşmazlığı giderildiğinde **100/100 Tam Puan** olacaktır.

---

## 🎯 UYGULANACAK 4 ADIMLI GÖREV LİSTESİ

### 1. FONT DARBOĞAZINI ÇÖZÜN (5.35 MB ➔ ~32 KB Alt Kümeleme)
Vitrinde kullanılan 83 ikonun listesiyle `dist/fonts/material-symbols-rounded.woff2` dosyasını `fontTools` ile alt kümeleyin (subset):

```bash
python -m fontTools.subset "src/icons/fonts/material-symbols-rounded.woff2" --unicodes="U+0020-007E" --text="add, arrow_back, arrow_forward, arrow_outward, auto_awesome, bolt, bookmark, bookmark_border, calendar_month, call, cancel, check, check_box, check_box_outline_blank, chevron_left, chevron_right, close, code, color_lens, content_copy, dark_mode, dashboard_customize, delete, density_medium, download, edit, email, expand_less, expand_more, explore, favorite, favorite_border, filter_list, folder, format_bold, format_color_text, format_italic, format_underlined, front_hand, fullscreen, fullscreen_exit, home, horizontal_rule, indeterminate_check_box, info, integration_instructions, keyboard_arrow_down, keyboard_arrow_up, label, light_mode, list, lock, mail, menu, menu_book, mic, more_horiz, more_vert, motion_photos_on, navigate_next, navigation, notifications, open_in_new, palette, pause, photo_camera, play_arrow, play_circle, progress_activity, radio_button_checked, radio_button_unchecked, refresh, remove, schedule, search, send, sentiment_satisfied, settings, share, smart_button, star, stop, tab, timer, toggle_off, toggle_on, toolbar, tune, verified, view_carousel, visibility, visibility_off, volume_up, warning, widgets" --flavor=woff2 --output-file="dist/fonts/material-symbols-rounded.woff2"
```

---

### 2. `md-badge.js` HARDCODE DEĞERLERİNİ GERİ ALIN & MD3 STANDARTINA DÖNÜN

#### A. `src/components/md-badge.js` İçindeki Stili Orijinal Standart Haline Getirin:
`color: #FFFFFF !important;` ve `font-weight: 700;` satırlarını silip yerine standart MD3 tanımını koyun:

```css
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
  letter-spacing: var(--md-sys-typescale-label-small-tracking, 0.5px);
  line-height: 1;
  user-select: none;
}
```

#### B. `src/theme/hct-color-engine.js` ve `src/tokens/colors.css` İçinde Karanlık Tema Tokenını Düzeltin:
Karanlık tema `--md-sys-color-on-error` tokenının resmi MD3 standardı olan **Tone 20 (`#690005` veya `#410002`)** değerini almasını sağlayın.  
*(Bu sayede açık pembe `#FFB4AB` zemin üzerine koyu bordo yazı basılacak; MD3 tasarımına %100 sadık kalınırken kontrast 7.4:1 WCAG AAA seviyesine çıkacaktır).*

---

### 3. ERİŞİLEBİLİRLİKTE KALAN 3 PUANI TAMAMLAYIN (97 ➔ 100/100 A11y)

1. **`src/components/md-carousel.js` (Satır 427 civarı):**  
   Kart `aria-label` değerine rozet (badge) metnini de ekleyin:
   ```javascript
   aria-label="${it.badge ? `${it.badge} - ` : ''}${escapeHtml(it.title || '')} - ${escapeHtml(it.subtitle || '')}"
   ```

2. **`src/components/md-time-picker.js` (Satır 920–935 civarı):**  
   `button#hour-card` ve `button#min-card` butonlarının `aria-label` değerini ekrandaki sayıyla eşleştirin:
   ```javascript
   // button#hour-card için:
   aria-label="Hour ${hh}"

   // button#min-card için:
   aria-label="Minute ${mm}"
   ```

3. **`styles/showcase.css` (Renk Paleti Çipleri):**  
   `.tokens-chips-grid .token-chip` stilinde Error Cont. renginin arka plan ile metin kontrastının 4.5:1 eşiğini sağladığından emin olun.

---

### 4. PAKETLEME VE DOĞRULAMA

Tüm işlemler bittikten sonra sırasıyla çalıştırın:

```bash
# 1. Paketleri yeniden derleyin:
npm run build

# 2. Testleri çalıştırın:
npm run test
```
