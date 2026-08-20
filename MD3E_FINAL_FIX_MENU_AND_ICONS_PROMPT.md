# MD3E Menü Taşması & Eksiksiz İkon Seti Düzeltme Talimatı

> **Amaç:** Menülerin kart içinde kırpılmasını engellemek ve `<md-tabs>`, `<md-menu>` bileşenlerinin JSON niteliklerindeki (`items`, `tabs`) ikonların (`flight`, `hotel`, `explore`, `content_cut`, `content_paste`, vb.) font alt kümesine eklenerek metin olarak değil ikon olarak render edilmesini sağlamak.

---

## 🛠️ UYGULANACAK 2 ADIMLI DÜZELTME

### 1. MENÜ AÇILMA VE KIRPILMA (OVERFLOW) DÜZELTMESİ
`styles/showcase.css` dosyasında `.comp-preview` sınıfındaki `overflow: hidden;` kuralı `<md-menu>` açıldığında menüyü kart içinde kırpmaktadır.

`styles/showcase.css` dosyasına şu kuralı ekleyin:

```css
.comp-preview:has(md-menu[open]),
.comp-preview:has(md-split-button[open]),
.comp-card:has(md-menu[open]),
.comp-card:has(md-split-button[open]) {
  overflow: visible !important;
  z-index: 100;
}
```

---

### 2. JSON İÇİNDEKİ TÜM İKONLARI İÇEREN EKSİKSİZ FONT DERLEMESİ
HTML içindeki JSON niteliklerinde (`items='[...]'` ve `tabs='[...]'`) yer alan `flight`, `hotel`, `explore`, `content_cut`, `content_paste`, `cloud_upload`, `forum`, `image` ikonlarını da içeren **tam 105 ikonluk listeyle** fontu alt kümeleyin:

```bash
python -m fontTools.subset "dist/fonts/material-symbols-rounded.full.woff2" --unicodes="U+0020-007E" --text="add, announcement, arrow_back, arrow_drop_down, arrow_forward, arrow_outward, attach_file, auto_awesome, bolt, bookmark, bookmark_border, brush, calendar_month, call, cancel, category, chat, chat_bubble, check, check_box, check_box_outline_blank, chevron_left, chevron_right, close, cloud_download, cloud_upload, code, color_lens, colorize, content_copy, content_cut, content_paste, crop_square, dark_mode, dashboard_customize, delete, density_medium, download, drafts, edit, email, event, expand_less, expand_more, explore, favorite, favorite_border, filter_list, flight, folder, format_align_left, format_bold, format_color_fill, format_color_text, format_italic, format_underlined, forum, front_hand, fullscreen, fullscreen_exit, group, help, home, horizontal_rule, hotel, html, image, in_out, inbox, indeterminate_check_box, info, integration_instructions, keyboard_arrow_down, keyboard_arrow_up, label, light_mode, link, list, lock, mail, menu, menu_book, mic, more_horiz, more_vert, motion_photos_on, navigate_next, navigation, notifications, offline_pin, open_in_new, palette, pause, person, photo_camera, play_arrow, play_circle, progress_activity, qr_code, radio_button_checked, radio_button_unchecked, refresh, remove, restart_alt, rocket_launch, save, schedule, search, select_all, send, sentiment_satisfied, settings, share, smart_button, star, star_outline, stop, tab, tag, terminal, thumb_up, thumb_up_off_alt, timer, toggle_off, toggle_on, toolbar, toys, tune, verified, videocam, view_carousel, visibility, visibility_off, volume_up, warning, waves, widgets" --flavor=woff2 --output-file="dist/fonts/material-symbols-rounded.woff2"

cp dist/fonts/material-symbols-rounded.woff2 src/icons/fonts/material-symbols-rounded.woff2
```

---

### 3. PAKETLEME VE DOĞRULAMA
Tüm işlemler tamamlandıktan sonra sırasıyla çalıştırın:

```bash
npm run build && npm run test
```
