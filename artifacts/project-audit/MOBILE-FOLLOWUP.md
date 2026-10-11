# Mobil ve responsive inceleme

Tarih: 11–12 Ekim 2026. Karşılaştırma tabanı: `f145527`.

Bu dosya, `IMPLEMENTATION.md`, `UI-FOLLOWUP.md` ve `LIGHTHOUSE-FOLLOWUP.md` sonrasındaki mobil incelemeyi ve yeni düzeltmeleri kaydeder. Testler yerel HTTP sunucusunda gerçek tarayıcı motorlarıyla çalıştırıldı. Fiziksel telefonda çalıştırılmadı.

## Cihaz bağlamı ve kapsam

Kullanıcının cihazı Galaxy Note20; S24 FE tabanlı Nexus ROM, OneUI 7, Brave ve Standart Shields. Bildirilen çözünürlük 1080×2400, kullanılabilir genişlik 384 dp, sistem yazı boyutu sekiz kademenin üçüncüsü; tarayıcı yakınlaştırması yok.

Ana test profili **384×853 CSS piksel, DPR 2.8125** oldu. Piksel çözünürlüğü yerine CSS genişliği esas alındı. ROM'un üçüncü yazı boyutu kademesinin kesin ölçeği bilinmediğinden belirli bir katsayıyla aynı olduğu varsayılmadı; ayrıca 1.3 ve 1.5 işletim sistemi yazı ölçeği simülasyonları sınandı.

- Yerleşim genişlikleri: 320, 360, 384, 390, 412, 480, 599, 600, 768, 839, 840, 1024, 1199, 1200, 1440 CSS piksel.
- Etkileşim profilleri: 320×640, 384×853, 853×384; açık ve koyu tema.
- Motorlar: Playwright Chromium, Firefox, WebKit. Brave ayrıca bilgisayardaki kurulu ikiliyle, varsayılan Shields filtreleri yüklenmiş ayrı geçici profilde çalıştırıldı. Kullanıcının Brave profili değiştirilmedi.
- Chromium ve Brave'de gerçek tarayıcı dokunma olayları ve CDP dokunma sürüklemeleri kullanıldı. Firefox/WebKit'te dokunma destekli viewport ve güvenilir `tap` girdisi kullanıldı; kaydırma kontrolü wheel girdisiyle yapıldı. Bu son iki motorun kaydırma testi Android/iOS parmak sürüklemesi olarak yorumlanmamalı.

## Düzeltilen sorunlar

| Sorun | Uygulanan değişiklik | Kanıt |
| --- | --- | --- |
| Modal navigation rail, drawer ve tam ekran arama açıkken arka sayfanın kayabilmesi | Mevcut sahiplik tabanlı sayfa kaydırma kilidine bağlandı. Kapanış, yeniden render ve DOM'dan kaldırma yolları kilidi bırakıyor. | Rail için başlangıçta ölçülen arka sayfa hareketi 205 CSS piksel; düzeltmeden sonra 0. İç içe modal sahipliği ve kaldırma senaryoları da sınandı. |
| Dar takvim örneğinde yıl oklarının/kolonların sıkışması | Docked başlık gerektiğinde sarılıyor; yedi kolon `minmax(0,1fr)` kullanıyor. Gün göstergesi dar kolona uyabiliyor, satırın 48 dp dokunma yüksekliği korunuyor. | 320 piksel ve telefon profilinde yıl okuna dokunulabiliyor; seçiciler viewport içinde kalıyor. |
| Inline saat seçicilerinin dar kartlarda taşması | 328/580 dp varsayılan genişlikler korundu; inline host kapsayıcısına uyuyor. Yatay düzen dar kapsayıcıda dikeye dönüyor. İç padding, 256 dp saat kadranına yer bırakıyor. Örneğin inline `overflow-x:auto` zorlaması kaldırıldı. | 320 piksel dahil inline saat seçicinin iç yatay taşması kontrol edildi. |
| Standart yan panel örneğinde iki bölmenin telefonda erişilememesi | Kompakt görünümde örneğin kendi alanı yatay kaydırılabiliyor. Sayfanın tamamına yatay taşma eklenmedi. | 15 genişlikte sayfa taşması 0; kompakt altı genişlikte görülen örnek içi yatay kaydırma kasıtlı. Ayrı testte her motorda dört dokunmalı toggle, pan sonrası dahil, geçti. |
| Kısa yatay ekranda tema düğmesine ulaşılamaması | Showcase navigation rail dikey kaydırılabilir yapıldı. | 853×384 profilinde tema geçişi ve iki tema etkileşim turu geçti. |
| Tema değişiminden sonra bazı ekran dışı alanların eski yardımcı metin rengini koruması | `theme-context` bekleme grubu, tek element yerine her aboneliği ayrı kaydediyor. Aynı bileşenin renk/kapsayıcı/geometri abonelikleri artık birbirini ezmiyor. Yeni polling veya ayrı observer eklenmedi. | Açık temada mount → başka bölüme git → koyu temaya geç → geri gel: eski `rgb(97,93,104)` yerine doğru rol `rgb(174,169,180)` uygulanıyor. Kalıcı mobil test bu yolu kapsıyor. |
| Kod yorumlarının düşük kontrastı | `outline` yerine `on-surface-variant` metin rolü kullanıldı. | Önce yaklaşık 3.3:1 olan yorum metni; görünür alanların axe taraması ve rol kontrolüyle tekrar incelendi. |
| Yatay kod/tablo alanlarına klavyeyle girilememesi | Bildirilmiş kaydırma alanlarına `tabindex=0` verildi. Ekran dışındaki `content-visibility` ölçümüne bağlı tab sırası kaldırıldı. | Tarayıcı erişilebilirlik taraması; deferred kartların kod alanları da odak alabiliyor. |
| Kaldırılabilir chip içinde birbiri içine geçmiş etkileşim rolleri | Chip'in birincil eylemi ile kaldırma düğmesi erişilebilirlik ağacında kardeş eylemler oldu. | Space ile bir kez seçim, Enter ile bir kez kaldırma; chip Foundation ve native geometri kontrolleri. |
| Slotted düğme metni yerine ikon adının okunması; metin güncellemesinin izlenmemesi | Görünür slot metni erişilebilir isim için fallback oldu. Açık ARIA isimlendirmesi önceliğini koruyor. Mevcut ortak observer metin düğümü değişikliklerini de izliyor. | `Open drawer` ve sonradan değiştirilen metin için mobil regresyon kontrolleri. |
| Firefox'ta slotted düğme metnine dokunmanın bazen düğme click'ine dönüşmemesi | Slot metni hit testinde kontrolün kendisine bırakıldı; slotted etkileşimli elementlerin pointer girdisi korunuyor. | Firefox telefon ve yatay profilleri; ortak pointer/keyboard/surface testleri. Ortak pointer capture davranışı değiştirilmedi. |
| WebKit'te autocomplete ve docked arama önerilerinin dokunmayla seçilememesi | Odağı koruyan `preventDefault`, `pointerdown` yerine native odak varsayılanını yöneten `mousedown` üzerinde çalışıyor. | Üç motorun mobil turunda öneriye güvenilir dokunmayla seçim. |

MD3 renk rolleri, spring hareketleri ve native referans geometrileri esas alındı. Kontrolleri geçmek için animasyonlar kapatılmadı. Genel `content-visibility` optimizasyonu kaldırılmadı.

## Sonuçlar ve tekrar üretim

| Kontrol | Sonuç |
| --- | --- |
| Responsive yerleşim taraması | 3 motor × 15 genişlik × 2 tema × 105 görünüm = **9.450 görünüm**. Sayfa yatay taşması, JavaScript hatası ve başarısız HTTP kaynağı 0. |
| Örnek içi taşma adayları | Her motorda 12: yalnızca standart yan panelin kasıtlı yatay kaydırılan kompakt örneği, altı genişlik × iki tema. |
| Ana mobil etkileşim testi | 3 motor × 3 profil × 96 = **864 kontrol geçti**. |
| Brave Standart Shields | Telefon ve yatay profilinde **192 kontrol geçti**. Filtre verilerinin yüklenmesi doğrulandı; ayrı geçici profil kullanıldı. |
| Ek koşullar | **133 kontrol geçti**: seed seçimi, slider ve carousel dokunma hareketi, standart panelde pan/klavye, dar kullanılabilir yükseklik, popup açıkken yön değişimi, yazı ölçeği, safe-area ve reduced-motion. |
| Bağımsız standart panel dokunma testi | Chromium/Firefox/WebKit'te üç toggle ve pan sonrası toggle: **12 kontrol geçti**. |
| Popup alt sınırları ve onay eylemleri | Üç motor × üç profil: **99 kontrol geçti**. Tarih/saat onay düğmesine dokunarak tek commit ve kapanış; bottom sheet tutamacıyla genişletme de kontrol edildi. Kısmi bottom sheet'in ekran altına uzanması MD3 anchor davranışıdır; genişletilmiş hali iki eksende tamamen viewport içinde doğrulandı. |
| Menü alt sınırları | Select, autocomplete, ana menü ve alt menü; üç motor × üç profil: **36 kontrol geçti**. |
| axe | 90 sayfa/bölüm kapsamı, iki temada toplam 206 bileşen önizlemesi; raporlanan ihlal **0**. 46 kapsamda otomatik aracın karar veremediği `incomplete` kayıtları var. |
| Unit/native referans testleri | `npm test` geçti. |
| Web platform sözleşmesi | Kaynak ve dist için üç motorda **450 kontrol geçti**. |
| Paket ve derleme | `check:dist` ve 87 export'u içeren strict TypeScript/Node tüketici kontrolü geçti. |
| Hazırlanmış showcase kataloğu | Her motorda 258, toplam **774 görünüm** geçti; görünürlük/taşma hatası, JavaScript hatası ve başarısız kaynak 0. |

Ana etkileşim testi dialog, bottom/side sheet, date/time picker, modal drawer/rail ve tam ekran aramayı gerçek girdiyle açar; sınırları, arka sayfa kaydırmasını, kapanışı ve kilidin bırakılmasını kontrol eder. Select, autocomplete, alt menüler, FAB menüsü, arama önerileri, iki floating toolbar, takvim yılı, chip klavyesi, tema yenilemesi ve konsol/ağ hataları da kapsamdadır.

Tekrar çalıştırma:

```powershell
npm run build
npm run test:mobile
node artifacts/project-audit/mobile-audit/conditions.mjs
node artifacts/project-audit/mobile-audit/standard-sheet.mjs
node artifacts/project-audit/mobile-audit/bounds.mjs
node artifacts/project-audit/mobile-audit/menu-bounds.mjs
node artifacts/project-audit/mobile-audit/performance.mjs
```

Yerleşim taraması `mobile-audit/probe.mjs`, erişilebilirlik taraması `mobile-audit/accessibility.mjs` içindedir. `probe.mjs` için bu turdaki genişlik listesi `WIDTHS` ortam değişkeniyle verilmiştir. Ana mobil komutun engine, ölçü ve çıktı seçenekleri `BROWSER_ENGINES`, `MOBILE_SIZES`, `MOBILE_RESULTS_DIR` değişkenleridir. Brave turu `scripts/test-mobile.mjs --brave-shields` ile çalışır; yalnızca ayrı `md3e-brave-shields-*` geçici profili kabul eder.

Ham sonuçlar ve ekran görüntüleri `mobile-audit/` altındadır: `probe-{chromium,firefox,webkit}.json`, `interactions/*.json`, `accessibility.json`, `conditions.json`, `standard-sheet.log`, `bounds-*.json`, `menu-bounds-*.json`. `bounds.mjs` ve `menu-bounds.mjs` varsayılan Chromium'u kullanır; diğer motorlar `ENGINE=firefox` / `ENGINE=webkit` ortam değişkeniyle seçilir. Hata ayıklama sırasında alınmış `before`, `failure`, `debug`, `native`, `held` dosyaları son başarılı turun yerine kullanılmamalıdır.

## Akıcılık ölçümü

`f145527` sürümünün index, showcase JS/CSS ve kullanılan ESM bundle'ı byte karşılaştırmasıyla doğrulanan ayrı kopyada çalıştırıldı. Güncel sürümle aynı Chromium, 384×853 viewport ve DPR 2.8125 kullanıldı. Diğer tarayıcı testleri bittikten sonra ölçüm yapıldı.

Dialog, bottom sheet, side sheet, date picker, time picker, modal drawer, modal rail ve tam ekran arama için açılış/kapanış ikişer kez ölçüldü. İki sürüm × iki CPU koşulu × sekiz yüzey × iki tekrar × iki faz = **128 ölçüm penceresi**. Her pencere işlemden sonra yaklaşık 1.1 saniye sürer. CPU 1× turunda eski → yeni, CPU 4× turunda yeni → eski sırası kullanıldı. rAF aralıkları, Long Tasks, Event Timing ve CDP layout/style/main-thread sayaçları kaydedildi; sayfa/ağ hatası 0.

| Koşul | Sürüm | Pencere p95 frame aralıklarının medyanı | En uzun frame aralığı | 25 ms üstü aralık | 50 ms üstü görev |
| --- | --- | ---: | ---: | ---: | ---: |
| CPU 1× | Eski | 16.7 ms | 16.8 ms | 0 | 0 |
| CPU 1× | Güncel | 16.7 ms | 16.8 ms | 0 | 0 |
| CPU 4× | Eski | 16.7 ms | 166.7 ms | 53 | 32 |
| CPU 4× | Güncel | 16.8 ms | 133.4 ms | 51 | 33 |

Normal CPU koşulunda bu örneklerde frame atlaması/uzun görev kaydedilmedi. Dört kat yavaşlatmada **takılmalar tamamen giderilmiş değildir**: güncel sürümde 33 uzun görev, toplam 2,994 ms; en uzun görev 119 ms. Eski sürümde 32 uzun görev, toplam 2,809 ms; en uzun görev 140 ms. Frame p95 değerinin tek başına bu seyrek büyük duraklamaları gizleyebileceği için maksimumlar ve görev sayıları birlikte verildi.

Ek CPU profili dialog/drawer/rail açılış-kapanışlarında alındı. Örneklenen native `showModal()` maliyeti yaklaşık 61–69 ms, `close()` maliyeti yaklaşık 42–66 ms oldu (CPU 4×). Bunlar tam işlem yanıt süresi değil, profilde o fonksiyona atanan örnekleme süreleridir. Pointer hit testi, style/layout ve çizim işleri de maliyete katılıyor. Native modalın odak/inert/top-layer davranışı veya MD3 spring'leri bu sayıları düşürmek amacıyla kaldırılmadı.

İki tekrar ve tek bilgisayar, istatistiksel bir hızlanma/regresyon hükmü veya Galaxy Note20'de 60/120 FPS garantisi vermez. CPU 4× koşulu belirli bir telefona eşitlenmedi. Event Timing kayıtları saha INP sonucu değildir. Bu veriler yerel örneklerin gerçek tarayıcı davranışını kaydeder.

Ham ölçümler `mobile-audit/performance.json`, özet `performance-summary.json`, timeline `performance-trace.json`, ek CPU profili `performance-profile.json` ve üç `.cpuprofile` dosyasıdır. CPU profilleri Chrome DevTools Performance/JavaScript Profiler ile incelenebilir.

## Kesinlik sınırları ve sonuçsuz kalan durum

- 1080×2400 fiziksel ekran, Samsung ROM/font motoru, gerçek Android Brave sürümü, sanal klavye, adres çubuğunun dinamik yüksekliği, TalkBack ve telefonun GPU/termal davranışı bu bilgisayarda birebir sınanamaz. Kısa viewport ve yazı ölçeği testleri bunların yerine fiziksel cihaz testi olarak sunulmuyor.
- Sanal klavye açılması yalnızca pencereyi küçültmeye eşit değildir: Chrome'un Android davranışında layout viewport aynı kalırken visual viewport küçülebilir ([Chrome açıklaması](https://developer.chrome.com/blog/viewport-resize-behavior)). CDP `setVisibleSize` denemesinde bu test ortamındaki layout ve visual viewport yükseklikleri 853 olarak kaldı (`visual-viewport-probe.log`); bu deneme klavye testi olarak sayılmadı. Geometri override'ı da gerçek Android IME açılışıyla eşitlenmedi ([CDP Emulation protokolü](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Emulation.pdl)).
- Uzun birleşik Chromium/CDP senaryosunda seed → slider → carousel → standart panel akışında bazı dokunuşlar click üretmedi. Aynı sayfaya konan native HTML düğmesi de başarısız oldu; dokunma olaylarını gözleyen bir listener eklenince sonuç değişti. Kaynak kesin olarak tarayıcıya, test girişine veya uygulamaya atfedilemedi. Ortak pointer capture için denenen değişiklik yeterli kanıt sağlamadığından geri alındı. Bu birleşik giriş senaryosu **sonuçsuzdur**; uygulama hatası giderilmiş gibi işaretlenmedi. Standart panelin bağımsız dokunma testi ve pan sonrası klavye kontrolü geçti.
- axe sonucu WCAG sertifikası veya TalkBack doğrulaması değildir. SVG/maske ve bazı renk durumlarındaki `incomplete` kayıtları otomatik olarak başarılı sayılmadı. Referans golden görüntü bulunmadığından bütün katalog için piksel düzeyinde görsel eşdeğerlik iddiası yoktur; mevcut native parity testleri kendi kapsamları içinde ayrıca çalıştırılmıştır.
- Viewport genişliği taraması her kontrolün bütün olası içerik uzunluğu, dil, nested container ve yön kombinasyonunu kapsamaz. Sonuçlar kaydedilen ölçülere ve etkileşimlere aittir.
