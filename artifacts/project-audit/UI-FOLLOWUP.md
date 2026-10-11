# Görsel ve etkileşim düzeltmeleri

Tarih: 11 Ekim 2026. Bu kayıt, REPORT.md uygulamasından sonra bildirilen sekiz maddeyi ve Brave Shields bulgusunu kapsar. Önceki çalışma: [IMPLEMENTATION.md](IMPLEMENTATION.md).

## 1. Extended FAB — Brave kalkanları açıkken boş içerik ve taşma

Sorun, filtre bileşenleri gerçekten yüklenmiş ayrı bir Brave profilinde yeniden üretildi. İlk otomasyon profillerinde filtreler henüz yüklenmediği için sorun görünmüyordu. Brave'in varsayılan kalkanları ve filtreleri etkinleştirildikten sonra kart eski yer tutucu yüksekliğinde kalıyor; bazı ikon ve metinlerin yerleşimi eksik oluşuyordu.

FAB içeren showcase kartları `content-visibility: auto` kapsamından çıkarıldı. FAB'lerin mutlak konumlanan Shadow DOM içeriği ilk ölçümde tam yerleşim alıyor. Diğer kartların çizim ertelemesi ve bütün katalogdaki `template[data-defer]` ile geç oluşturma korunuyor. Tarayıcıya göre ayrılan bir tasarım veya kalkan kapatma işlemi eklenmedi.

FAB ayrıca değişmeyen ikon/etiket için `textContent` atamıyor; mevcut metin düğümleri ölçüm ve tema güncellemelerinde korunuyor. Bu, gereksiz DOM değişikliklerini ve kozmetik filtre taramalarını azaltıyor. Dört boyutun kaynak geometrisi ve renk rolleri değişmedi.

Brave ölçümünde kart yüksekliği yaklaşık 495,99 → 623,88 CSS px, önizleme yüksekliği 324,04 → 451,93 CSS px oldu. İkonlar ve etiketler kendi yüzeylerinde kaldı; kod örneği tekrar görünür yerleşim aldı. [Düzeltme sonrası görüntü](ui-followup/fabs-shields-on-after.png).

Test ortamı: kurulu Brave 1.97.56 / Chromium 155; 1828×980 CSS viewport ve 1,4 cihaz ölçeği. Bu, bildirilen 2560 px ekran / %140 koşulundaki içerik ölçeğini temsil eder; kullanıcının açık profilindeki tarayıcı yakınlaştırma düğmesine otomasyon uygulanmadı. Kullanıcının profil ayarları değiştirilmedi. Brave, kalkanları ve parmak izi korumalarını [resmî açıklamasında](https://brave.com/shields/) tanımlar.

## 2–3. Bottom sheet ve side sheet

Bottom sheet açılırken tarayıcı, ekran dışında başlayan odaklanabilir içeriğe ulaşmak için dış `dialog` penceresini kaydırıyordu. Karartma da bu pencerenin içinde kaydığı için ekranın altında kısa süreli açık bir bant kalıyordu. Ölçümde dış pencerenin `scrollTop` değeri yaklaşık 214 CSS px'e çıkıyordu.

İki sheet'in dış penceresi `overflow: clip` kullanıyor. Böylece dış pencere odak nedeniyle kaymıyor; iç `.content` alanının kaydırılması korunuyor. Tekrarlanan açılışlarda karartmanın her karede ekranın tamamını kaplaması denetlendi.

Animasyonun ilk RAF zaman damgası, başlangıç için alınan `performance.now()` değerinden eski olabiliyor. Bottom sheet konumu/karartması, side sheet ilerlemesi ve showcase bölüm kaydırmasında geçen süre sıfırın altına inmiyor. Side sheet'in 275 ms açılış/kapanış hareketi korunuyor; ilk ve sonraki açılışlarda ara konumları ölçüldü. Bottom sheet kaldırıldığında karartma hızı da sıfırlanıyor.

## 4. Modal drawer ve rail'in erken tıklamaları

Android drawer'ın hareket sırasında dokunmayı hemen sürükleme olarak yakalaması kaynak davranışıdır: `anchoredDraggable` için `startDragImmediately = state.isAnimationRunning`. Drawer'ın karartma tıklaması da son yerleşmiş durum açık olduğunda etkinleşir. Bu nedenle açılış bitmeden yapılan her dokunma normal bir kapatma tıklaması değildir. [AndroidX Drawer](https://github.com/androidx/androidx/blob/a095da93f8e98dea8748ceed79ea8427aade245f/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/NavigationDrawer.kt), [AnchoredDraggable](https://github.com/androidx/androidx/blob/a095da93f8e98dea8748ceed79ea8427aade245f/compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/AnchoredDraggable.kt).

Bunun yanında gerçek bir web hatası düzeltildi: kullanıcı açılış yayını yakaladıktan sonra gelen ilk veya yalnızca yükseklik değişimine ait ResizeObserver bildirimi konumu açık hedefe sıçratabiliyordu. Artık yalnızca değişen genişlik ankrajları güncelleniyor; yakalanmış sürükleme korunuyor. Boyut değişimi sırasında hareket varsa mevcut hareket yeniden hedefleniyor.

Rail'in karartması 16, 64, 128, 250 ve 600 ms'de gerçek pointer tıklamalarıyla sınandı; açılış sırasında kapanabiliyor. Android'de `hideOnCollapse` rail önce dışarı kayar, ardından rail durumu kapanır. Çıkış tamamlanana kadar modal pencerenin arka sayfayı inert tutması korunuyor. Çıkış tamamlandıktan sonraki ilk bağımsız açma tıklaması drawer ve rail'de çalışıyor. Ek bir süre kilidi eklenmedi. [AndroidX ModalWideNavigationRail](https://github.com/androidx/androidx/blob/a095da93f8e98dea8748ceed79ea8427aade245f/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/WideNavigationRail.kt).

Kontrollü saat kullanan Brave testinde drawer'ın çıkışı 224 ms, rail'in iki aşamalı çıkışı 864 ms sürdü. Her ikisi de pencerenin kapandığı ilk karedeki gerçek pointer tıklamasıyla yeniden açıldı. Bunlar bu test düzeninin ölçümleridir; bileşene sabit bir 224/864 ms bekleme eklenmedi.

## 5. Secondary tab rengi

Mevcut renk doğru; değiştirilmedi. Primary tab içerik rengi `primary`, secondary tab içerik rengi `on-surface` rolünden gelir. Bu temada pembe ve beyazımsı görünmeleri beklenen sonuçtur. [AndroidX TabRow](https://github.com/androidx/androidx/blob/a095da93f8e98dea8748ceed79ea8427aade245f/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/TabRow.kt).

## 6. Vertical floating toolbar FAB

Toolbar bileşeni FAB'e kendiliğinden bir uygulama eylemi atamaz; callback'i çağıran uygulama belirler. Resmî yatay ve dikey `FloatingToolbarWithFabSample` örneklerinde FAB `expanded` durumunu değiştirir. Showcase'teki dikey örnek de bu davranışa bağlandı. Pointer ve Enter ile açma/kapatma, iki kontrolün durum eşleşmesi ve `aria-controls` / `aria-expanded` sınandı. Açıklama ve kopyalanan kod da güncellendi. [AndroidX FloatingToolbarSamples](https://github.com/androidx/androidx/blob/a095da93f8e98dea8748ceed79ea8427aade245f/compose/material3/material3/samples/src/main/java/androidx/compose/material3/samples/FloatingToolbarSamples.kt).

## 7. Menüde “Paste” satır kırılması

%140 koşuluna karşılık gelen kesirli ölçekte yeniden üretildi. JavaScript ile hesaplanan metin `max-width` değeri, CSS genişliğinin yuvarlanmış serileştirmesini tekrar menünün içsel ölçüsüne besliyordu; son harf alt satıra geçebiliyordu.

İkon, metin, boşluk ve kısayol için kullanılabilir alanı artık flex yerleşimi hesaplıyor. Metne verilen ölçülmüş `max-width` ve her menü öğesindeki bunun için kullanılan ResizeObserver kaldırıldı. Uzun metinlerin gerektiğinde kırılması korunuyor; bütün etiketlere `nowrap` verilmedi.

## 8. Seed color yerleşimi

Seed seçici uygulamaya ait bir düzen; Material'ın ayrı bir “seed color seçici” bileşeni olarak zorunlu bir yerleşim tarif ettiği iddia edilmiyor. Buradaki hata Color bölümündeki satıra düzen stilinin hiç bağlanmamasıydı. Ana sayfadaki seçiciyle ortak flex düzeni, 8 px aralık ve satır sarma eklendi. Chip içindeki renk göstergeleri ve mevcut tema üretimi korunuyor. 1828/390 genişliklerinde aralıklar ve taşma; mevcut seed testinde seçim, klavye, slotlar, LTR/RTL ve açık/koyu mod denetlendi.

## Doğrulama

Yeni regresyon paketi `npm run test:ui-followup` ile çalışır ve `npm run verify` zincirine dahildir. Chromium, Firefox ve WebKit üzerinde sheet kareleri, içerik kaydırması, erken RAF, FAB yerleşimi, menü metni, iki toolbar FAB'i, seed sarılması ve erken modal tıklamaları denetlenir.

Brave için `node scripts/test-ui-followup.mjs --brave-shields` ayrı, geçici bir test profili kullanır; varsayılan filtre katalog/verisi yüklenmeden başarılı saymaz. İsteğe bağlı `MD3E_BRAVE_TEST_PROFILE` yalnızca işletim sisteminin geçici klasöründeki `md3e-brave-shields-*` test profillerini kabul eder. Gerçek kullanıcı profili kullanılmaz.

Son çalıştırmaların kayıtları `ui-followup/` altındadır.

| Kontrol | Sonuç | Kayıt |
| --- | --- | --- |
| Genel birim/güvenlik/kaynak kontrolleri | Geçti | `unit.log` |
| Üç motorlu yeni UI regresyonları | Geçti | `engines-dist.log` |
| Yeni geçici profilde filtreleri yüklenmiş Brave, kalkanlar açık | Geçti | `shields-fresh-dist.log` |
| Menü/drawer/rail/FAB yerel kaynak karşılaştırmaları, üç motor | Geçti | `parity-chromium-dist.log`, `parity-firefox-dist.log`, `parity-webkit-dist.log` |
| Tam FAB etkileşim ve showcase paketi | Geçti | `fabs-dist.log` |
| Seed seçici, 256 kontrol | Geçti | `seeds-dist.log` |
| Select ve Autocomplete ile ortak menü bileşimi | Geçti | `select-dist.log`, `autocomplete-dist.log` |
| Dağıtım tutarlılığı ve TypeScript sözleşmesi | Geçti | `check-dist.log`, `types.log` |
| Temiz checkout: kurulum, test, build, tipler | Geçti | `clean.log` |
| Showcase hazırlama | Geçti | `showcase-build.log` |

Kaynak karşılaştırmalarında ham Float yay/renk değerlerinin sıkı sayısal toleransları korunur. Çizilen dönüştürülmüş DOM dikdörtgenlerinde üç motorun yuvarlama farkları için 1/60 CSS px tolerans kullanılır. Menü örneğinde içsel boyut her karede sabit kalmalı; sayfa/ankraj hareket ettiğinde popup'ın onu takip etmesi beklenir. Önceki popup'ın odak iadesi için kapanışın gerçekten tamamlanması beklenir. Rail sürükleme testi, Firefox'un ekran dışındaki negatif pointer koordinatlarını sınırlamasından etkilenmemesi için aynı sürükleme mesafesini ekran içinde tamamlar.

Bu çalışmada paket yayımlanmadı ve deploy yapılmadı. Fiziksel Android ekranıyla piksel karşılaştırması, gerçek Safari veya ekran okuyucuyla yeni bir sertifikasyon yapılmadı.
