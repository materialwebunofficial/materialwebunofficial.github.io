# Lighthouse uyarıları ve performans çalışması

Tarih: 11 Ekim 2026. Önceki [REPORT uygulaması](IMPLEMENTATION.md) ve [sekiz görsel/etkileşim düzeltmesi](UI-FOLLOWUP.md) korunarak Home ve Components açılışı incelendi.

## Değerlendirme

Yüksek puan, bütün işlerin gerekli veya bütün etkileşimlerin akıcı olduğunu kanıtlamaz. Opportunities/Diagnostics sonuçları puana doğrudan eklenmez; etkileri FCP, LCP, TBT gibi metrikler üzerinden görülebilir. [Chrome puanlama açıklaması](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).

| Uyarı | Önemi ve bu çalışmadaki karar |
| --- | --- |
| Forced reflow | Tekrarlanan yazma/okuma döngüleri gerçek maliyettir. Rail'in öğe başına ölçüm döngüsü düzeltildi. Diğer kaynakların uyarısı sürüyor; bütün reflow maliyetinin kaldırıldığı iddia edilmiyor. |
| Network dependency tree | Kritik kaynakların geç keşfedilmesini gösterir. Controller'ın ayrı resize helper isteği kaldırıldı. Kalan tam bileşen paketi ve başlangıç zinciri sürüyor. Büyük paketi preload etmek bu deneyde LCP'yi kötüleştirdiği için uygulanmadı. |
| Render-blocking requests | İlk çizim için gerekli CSS de burada işaretlenebilir. Tam token/düzen zinciri korunarak iki CSS isteği tek küçültülmüş dosyada birleştirildi. CSS'yi geciktirerek temanın veya düzenin sonradan sıçraması tercih edilmedi. |
| Minify JavaScript | Güncel başlangıçta `src/showcase.js` için 18.941 bayt tahmin vardı. Controller ve helper birlikte build edilip küçültüldü; uyarı kalktı. Görseldeki 327 KiB bu güncel koşuda yeniden üretilmedi. |
| Reduce unused JavaScript | Açılışta çalışmayan kodun tamamı silinebilir kod değildir. Menü/picker/gesture gibi sonraki etkileşimler açılış ölçümünde kullanılmaz. Tam kayıt yapan kütüphane girişi de maliyete katkıda bulunur. Uyarı sürüyor; kategori bazlı modül yükleme bu turda uygulanmadı. Mevcut per-component tüketici importları korunuyor. |
| Long main-thread tasks | 50 ms üzerindeki görevlerin büyüklüğü ve sıklığı önemlidir. Animasyonlar kapatılmadı. Ölçüm maliyeti azaltıldı; mobilde kalan başlangıç görevleri ve TBT artışı aşağıda açıkça kaydedildi. |
| LCP breakdown / 3rd parties | Bu başlıkların görünmesi tek başına hata değildir; ayrıntı ve ölçülen maliyet değerlendirilir. Bu çalışma harici runtime veya font servisi eklemedi. |

Kaynaklar: [Forced reflow](https://developer.chrome.com/docs/performance/insights/forced-reflow), [istek zinciri](https://developer.chrome.com/docs/performance/insights/network-dependency-tree), [render-blocking](https://developer.chrome.com/docs/performance/insights/render-blocking), [kullanılmayan JavaScript](https://developer.chrome.com/docs/lighthouse/performance/unused-javascript), [TBT](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time).

## Uygulama

- `MdNavigationRail._measureLayout`: bütün öğelerin doğal genişlik yazmaları, genişlik okumaları, sınırlandırılmış genişlik yazmaları ve yükseklik okumaları ayrı gruplarda çalışıyor. Geometri algoritması, renkler, yaylar ve etkileşim hedefleri değişmedi.
- 30 öğeli bağımsız Chromium kontrolünde 10 ölçüm çağrısı, üç tekrarda da **600 yerine 20 layout** üretti. Bu, bu ölçüm işinde %96,7 azalma demektir; bütün sitenin 30 kat hızlandığı anlamına gelmez. Makine hızına bağlı süre eşiği yerine layout sayısını sınayan kalıcı regresyon testi eklendi.
- `assets/showcase.js`, controller ve resize helper'ın küçültülmüş çıktısıdır. Ortak `dist/md3-expressive.esm.js` dış import olarak korunur; ikinci bir bileşen/tema kopyası bundle edilmez.
- `assets/showcase.css`, tam token CSS'i ve mevcut showcase CSS'ini sırayla birleştirir. Fontlar mevcut `dist/fonts/` dosyalarına gider. Token denetimi, girişin yalnız bu iki kaynağı içermesini denetlemeye devam eder.
- `npm run build` ve statik showcase hazırlama bu dosyaları üretir. `check:dist`, site dosyalarının da deterministik kaynak tutarlılığını kontrol eder. Git satır sonları sabitlendi; geliştirme akışı README'ye yazıldı.
- Site dosyaları `dist` dışında tutuldu; npm paketine eklenmediler. Runtime bağımlılığı veya public bileşen API değişikliği eklenmedi.

## Karşılaştırma koşulları

Lighthouse **13.5.0**, Playwright Chromium **156**, Windows, Node **22.19.0**. Her audit yeni tarayıcı süreci ve soğuk profil kullanır. Kullanıcının açık Brave profili üzerinde Lighthouse çalıştırılmadı. Sürüm, cache ve sunucu koşulları nedeniyle ekran görüntüsündeki sayılarla birebir eşitlik beklenmez.

Masaüstü için Lighthouse'un masaüstü ayarıyla her görünümün önce/sonra ikişer ölçümü alındı. Sunucu sıkıştırmasız, normal cache başlıklı; her test yeni süreçle başladığı için ziyaretler soğuk. Mobil için varsayılan mobil simülasyon ve önceden üretilmiş Brotli yanıtlarla her görünümün bir önce/sonra kontrolü yapıldı. Mobil tek tekrar dağılım veya istatistiksel anlamlılık kanıtı değildir.

| Masaüstü metrik | Önce | Sonra |
| --- | --- | --- |
| Performance, Home / Components | 99 / 99 | 99 / 99 |
| Accessibility / Best practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| Home FCP | 540 ms | 445–500 ms |
| Components FCP | 540 ms | 500 ms |
| Home LCP | 660 ms | 605–660 ms |
| Components LCP | 660 ms | 660 ms |
| Home TBT | 0 ms | 0 ms |
| Components TBT | 0 ms | 0–20,5 ms |
| Toplam aktarılan içerik, her iki görünüm | 1.958.639 bayt | 1.915.269 bayt |
| JS küçültme tahmini | 18.941 bayt | 0 |
| Kullanılmayan JS, Home | 597.320 bayt | 597.320 bayt |
| Kullanılmayan JS, Components | 624.444 bayt | 598.288–598.305 bayt |
| CSS engelleme tasarruf tahmini | 120–130 ms | 50–90 ms |

Masaüstünde trafik farkı **43.370 bayt**. CSS engelleme satırı Lighthouse'un tahminidir; gerçek süre kazancı garantisi değildir. Controller çıktısı 29.135 bayt, birleşik CSS 79.780 bayt oldu.

| Mobil, Brotli, tek tekrar | Önce | Sonra |
| --- | --- | --- |
| Home performance | 99 | 98 |
| Components performance | 99 | 99 |
| Home FCP / LCP | 1.110 / 1.860 ms | 900 / 1.650 ms |
| Components FCP / LCP | 1.110 / 1.860 ms | 960 / 1.710 ms |
| Home TBT | 76,5 ms | 140,836 ms |
| Components TBT | 57,5 ms | 117 ms |
| Toplam aktarılan içerik | 464.782 bayt | 457.264 bayt |
| Accessibility / Best practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |

**Mobilde TBT yükseldi; bu saklanmadı.** İlk çizim ve LCP iyileşirken bütün metriklerin aynı anda iyileştiği söylenemez. Bu örnekler Chrome'un 0–200 ms mobil TBT için verdiği hızlı aralıkta kalır. TBT'nin FCP sonrasındaki uzun görevleri ölçmesi, metrikleri birlikte okumayı gerektirir; bu gözlem farkın tüm nedenini kanıtlamaz. Kaynak/doğruluk kontrolleri başarılı olduğu ve veri/ilk çizim maliyeti azaldığı için küçük dağıtım değişikliği korundu. Daha güçlü mobil TBT veya gerçek kullanıcı INP sonucu için ek profil gerekir. [TBT tanımı ve eşikler](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-total-blocking-time).

## Denenen varyantlar

| Varyant | Sonuç |
| --- | --- |
| Küçültülmüş site dosyaları + büyük JS için preload | Ön incelemede LCP yaklaşık 660 → 1.900 ms, puan 99 → 91. Reddedildi. Bu ilk deneyin sunucusu `no-store` kullanıyordu; son karşılaştırmalar normal cache politikasıyla tekrarlandı. |
| Küçültülmüş site dosyaları, preload olmadan | Küçültme uyarısı kalktı; başlangıç görünümü ve tam stil zinciri korundu. |
| Önceki varyant + rail ölçüm gruplaması | Özel ölçümde 600 → 20 layout; kaynak geometrisi ve yay karşılaştırması geçti. Son uygulama bu. |

Bu çalışma bütün kırmızı başlıkları yeşile çevirmedi. Kalan reflow, tam paket yükleme ve mobil başlangıç görevleri ölçülebilir geliştirme alanlarıdır. Animasyonları, renk üretimini veya erişilebilir kontrolleri azaltarak uyarı gizlenmedi.

## Doğrulama ve kayıtlar

| Kontrol | Sonuç / kayıt |
| --- | --- |
| `npm test` | Geçti — `lighthouse/unit.log` |
| `npm run check:dist`, `npm run test:types` | Geçti — `lighthouse/check-dist.log`, `lighthouse/types.log` |
| `npm run test:ui-followup`, üç motor | Geçti; Chromium layout sayısı 20 — `lighthouse/ui-engines.log` |
| Rail kaynak geometri/renk/yay oracle | Geçti — `lighthouse/rail-oracle.log` |
| Statik katalog, üç motor | 774 görünüm; sıfır görünürlük/taşma, runtime ve kaynak hatası — `lighthouse/catalog.log`, `lighthouse/catalog/` |
| `npm run test:clean` | Geçti — `lighthouse/clean.log` |
| `npm run test:package` | Geçti; gerçek tarball kurulumu, seçmeli import ve tipler — `lighthouse/package.log` |
| Seed testleri | Geçti — `lighthouse/seeds.log` |
| Brave standart kalkanları, filtreleri yüklenmiş ayrı test profili | Geçti; önceki FAB/sheet/menü düzeltmeleri ve 20 layout sınaması dahil — `lighthouse/brave-shields.log` |

Ham Lighthouse HTML ve JSON raporları `lighthouse/` klasöründedir. Karşılaştırma kayıtları `cold-baseline-desktop-summary.json`, `cold-final-desktop-summary.json`, `mobile-baseline-mobile-summary.json`, `mobile-final-mobile-summary.json`; ölçüm sayıları `baseline-layout.json`, `batched-layout.json` dosyalarındadır.

Tekrar çalıştırma örneği:

```powershell
# Lighthouse yalnız geçici araç klasörüne kurulur; proje bağımlılığı değildir.
npm install --prefix "$env:TEMP/md3e-lighthouse-13-5-0" --no-audit --no-fund lighthouse@13.5.0
npm run build:showcase
node artifacts/project-audit/lighthouse/audit.mjs --label=repeat --runs=2
node artifacts/project-audit/lighthouse/audit.mjs --label=repeat-mobile --form=mobile --runs=1 --compress
npm run test:ui-followup
```

Gerçek kullanıcı INP/CrUX ölçümü, fiziksel Android raster karşılaştırması, paket yayını veya deploy bu çalışmanın sonucu olarak gösterilmiyor.
