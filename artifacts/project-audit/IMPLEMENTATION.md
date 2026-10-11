# REPORT.md uygulama kaydı

Tarih: 11 Ekim 2026. Kapsam: aynı klasördeki [REPORT.md](REPORT.md) bulgularının
mevcut çalışma ağacına uygulanması. Önceden bulunan ve diğer oturumun eklediği
değişiklikler korundu. Bu kayıt, tüm Android davranışları için eksiksiz parity
sertifikası değildir; açık kaynak uyarlama sınırları [MD3E-INVENTORY.md](../../MD3E-INVENTORY.md)
ve [MD3E-PARITY.md](../../MD3E-PARITY.md) içinde izlenmeye devam eder.

## Uygulanan bulgular

| Rapor | Yapılan değişiklik | Kalıcı doğrulama |
|---|---|---|
| 1 | Ana test zincirinin gerektirdiği script'ler Git kapsamına alındı; script istisnaları daraltıldı. Yalnız takip edilen dosyalardan bağımsız klasör oluşturup `npm ci`, unit, build ve types çalıştıran kontrol eklendi. | `test:clean`, CI |
| 2 | Ortak aktivasyon katmanı click'in host/ancestor listener'larından sonra iptal durumunu kontrol ediyor. Normal bubbling aynı dispatch içinde tamamlanıyor; propagation durdurulursa sonraki task kullanılıyor. Host/label aktivasyonunun sahibi açıkça seçiliyor; iç chip remove kontrolü ana seçimi tetiklemiyor. | `test:web`: trusted/inner/host/keyboard; submit/reset; nested chip |
| 3 | Autocomplete, üst alanın validity hesabını kullanıyor; seçenek/açılma güncellemesi customError'ı silmiyor. | `test:web`, autocomplete composition |
| 4 | Ortak isim önceliği, canlı dış label ve `aria-labelledby` desteği; text field dış label aktivasyonu aktif editörü fokusluyor. | `test:web`, text-field editor |
| 5 | Option güncel `.selected` ile deklaratif `.defaultSelected` ayrıldı; seçimin iki yönlü senkronizasyonu ve reset sözleşmesi eklendi. | `test:web`, 232 select composition kontrolü |
| 6 | Bilinmeyen select değerleri boş seçime normalize ediliyor; tüm seçenekler kaldırıldığında eski form değeri temizleniyor. Çoklu seçim CSV sözleşmesi belgelendi. | `test:web`, `MIGRATION.md` |
| 7 | Text field native editörüne pattern/minlength/min/max/step aktarıldı; canlı değişikliklerde validity yenileniyor. | `test:web` |
| 8 | Type sanitization sonucu dış value ve FormData'ya geri okunuyor; geçersiz optional number boş gönderiliyor. | `test:web` |
| 9 | Forward edilen ARIA durum/ilişkileri kaldırıldığında temizleniyor; bileşenin kendi önceki durumu korunuyor. | `test:web` |
| 10 | ARIA attribute'ları WeakMap'e taşınıp DOM'dan silinmiyor. Clone/outerHTML/selector/framework sözleşmesi korunuyor. Ortak tree observer canlı ad/ilişki değişikliklerini izliyor ve disconnect'te bırakılıyor. Grup isimleri çocuk düğmelerin adlarını değiştirmiyor; slider thumb isimleri korunuyor. | `test:web`, reconnect ve grup adlandırması |
| 11 | Tarih parser'ı yıl/ay/gün geri karşılaştırması yapıyor. Geçersiz veya boş değer seçimi temizliyor; leap day doğrulanıyor. Date/time picker'ın FACE sınırı belgelendi. | `test:web`, dialog/picker lifecycle |
| 12 | Tek canonical types kaynağı; var olmayan MdBaseComponent kaldırıldı, MdShape/adoptSheet/createComponentSheet eklendi. Build root/component/theme declarations üretiyor. | 87 runtime export kontrolü; gerçek strict `tsc`; kurulu tarball tüketicisi |
| 13 | Dist yeniden üretildi; deterministik build/drift kontrolü eklendi. CSS/types satır sonları ve Git dağıtım kuralları platformlar arasında sabitlendi. Pages yayınından önce build yapılıyor. | `check:dist`, `build:showcase` |
| 14 | Lockfile, ortak `verify` zinciri, temiz checkout ve üç motor kurulumu CI'ye bağlandı. Deploy `verify` işinin başarısına bağlı. Eski güvenlik girişi canonical testi çalıştırıyor; visibility davranışı tarayıcıda sınanıyor. | `.github/workflows`, `npm run verify` |
| 15 | Dağıtım font whitelist'i; kullanılmayan iki full icon font ve varsayılan sourcemap'ler çıkarıldı. Debug map üretimi isteğe bağlı. Gerçek tarball kurulumu CSS asset'lerini, import'ları ve selective bundle maliyetini kontrol ediyor. | `test:package`, `implementation-package.json` |
| 16 | README client lifecycle/registration ve server-safe theme sınırlarını açıklıyor. İzole fixture gerçek paketi kurup Next.js production static build, React/Vue SSR, hydration, event ve value binding çalıştırıyor. Framework bağımlılıkları ayrı fixture lockfile'ında. | `test:frameworks` |
| 17 | Layout yazan ResizeObserver'lar ortak RAF kuyruğuna alındı; hedef başına son bildirim tutuluyor ve disconnect'te bekleyen işler iptal ediliyor. Önceden eklenmiş WebKit host stylesheet düzeltmesi korundu. Uyarılar susturulmadan katalog taraması kalite kapısına eklendi. | `test:catalog`, resize scheduler unit testi |

## Doğrulama

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| `npm run verify` | Exit 0; authoritative unit, dist, types, kurulu paket, web platformu, 10 mevcut browser paketi, katalog, framework | [implementation-verify.log](implementation-verify.log) |
| `npm run test:clean` | Exit 0; bağımsız kurulum, unit, build ve strict types | [implementation-clean.log](implementation-clean.log) |
| Web platformu son tekrar | 75 × 3 motor × source/dist = **450 kontrol**, sıfır runtime hatası; dört haneli erken yıllar ve year-zero sınırı dahil | [implementation-browser.log](implementation-browser.log) |
| Source WebKit katalog | **258 görünüm**, sıfır görünürlük/taşma, JS/ResizeObserver ve kaynak yükleme hatası | [implementation-catalog-diagnostic.log](implementation-catalog-diagnostic.log) |
| Üretilecek statik yayın çıktısı | **43 kategori × 3 genişlik × 2 tema × 3 motor = 774 görünüm**, tüm hata listeleri boş | [implementation-catalog.log](implementation-catalog.log), [JSON kanıtları](implementation-evidence/catalog-webkit.json) |
| Next.js / React ve Vue SSR | Production build, server render, hydration, registration, event ve value binding başarılı | [framework log'ları](implementation-evidence/frameworks/next-build.log) |
| Types / dağıtım | 87 export, canonical declaration, strict tüketici, Node tema importu ve deterministik build başarılı | [implementation-types.log](implementation-types.log), [implementation-dist.log](implementation-dist.log) |
| Son smoke tekrar koşusu | 10 mevcut paket başarılı; search animasyon testi kontrollü clock'a alındı | [implementation-smoke.log](implementation-smoke.log) |
| Geniş parity kapsamı | **103 browser suite** bölümlü koşularda geçti; ortak unit/prelude ve responsive final kontrolleri başarılı | [Ön bölüm](implementation-parity-prefix.log), [orta bölüm](implementation-parity-middle.log), [son bölüm](implementation-parity-tail.log), [kapsam özeti](implementation-parity-coverage.json) |
| Statik showcase build | Exit 0; güncel kaynaklardan yayınlanabilir ayrı artifact üretildi | [implementation-showcase-build.log](implementation-showcase-build.log) |

Üç motorun 320/390/1440 genişliklerinde boşta kalan yerleşim kontrolü de geçti:
bekleme penceresinde devam eden native resize bildirimi yok. Kanıt:
[WebKit](implementation-resize-idle.log), [Chromium/Firefox](implementation-resize-idle-other.log).
Parity kapsamı ilk 54 suite, ortadaki 34 suite ve son 15 suite'in birleşimidir.
Son koşu exit 0 verdi. İlk iki log, aşağıdaki test varsayımlarında durdukları için
exit 1 kayıtlarını da içerir; durulan suite sonraki koşuda yeniden çalıştırılıp geçti.
Bu sonuç tek, kesintisiz bir `test:parity` exit 0 koşusu olarak raporlanmıyor.
Ekran görüntüleri ve sayısal kontroller gerçek yardımcı teknoloji testinin yerine geçirilmedi.

Geniş parity koşusu sırasında test zamanlama varsayımları düzeltildi: search
animasyonu kontrollü clock ile örnekleniyor; split button kapanışındaki ilk
örneğin t=0 değerine eşit olmasına izin verilirken ara hareket, monotonluk ve
son hedef hâlâ zorunlu. Navigation resize testi de native bildirimden sonra RAF
saatini ilerletiyor. Beklenen boyut, renk veya spring değerleri değiştirilmedi.
App bar snippet karşılaştırması da eski ARIA silme varsayımından çıkarıldı;
örnek ve canlı DOM artık ARIA attribute'ları dahil birlikte karşılaştırılıyor.
Uzun parity girişinin varsayılanı bütün suite'leri çalıştırır. Gerekirse
`PARITY_FROM` yalnız tanı/devam için kullanılabilir; atlanan ve çalışan suite
sayıları çıktıda açıkça yazılır, geçersiz bir isim testi başarısız yapar.

## Dağıtım ve davranış notları

API/davranış değişiklikleri [MIGRATION.md](../../MIGRATION.md) içinde kaydedildi.
Mevcut package version otomatik yükseltilmedi; npm yayını, commit, push ve Pages
deploy yapılmadı. Bazı düzeltmeler önceki davranışa göre kırıcı olduğu için yayın
sırasında major sürüm değerlendirilmelidir.
CI yapılandırması güncellendi; GitHub Actions üzerinde uzak koşu başlatılmadı.
Buradaki sonuçlar bu Windows çalışma alanındaki yerel doğrulamalardır.

| Ölçüm | Rapor başlangıcı | Güncel |
|---|---:|---:|
| npm arşivi | 22.618.674 B | **2.356.565 B** (%89,58 azalma) |
| Açılmış paket | 32.240.036 B | **6.466.264 B** (%79,94 azalma) |
| Root import JS / gzip | 1.462.318 / 399.438 B | 1.473.000 / 402.372 B |
| Button alt yolu JS / gzip | 247.474 / 54.410 B | 250.128 / 55.214 B |

Kesin ölçümler [implementation-package.json](implementation-package.json) içindedir.
Paket arşivindeki küçülme, tarayıcının JS yükünde aynı oranda küçülme demek değildir.
Root giriş tüm katalogu kaydeder; küçük tüketiciler component alt yolunu kullanmalıdır.
Paket testinde 3 MiB arşiv, 8 MiB açılmış içerik ve 80 KiB seçmeli button gzip
bütçeleri de kontrol edilir.

Gerçek NVDA/JAWS/VoiceOver oturumu ve fiziksel Safari/iOS cihaz testi yapılmadı.
Playwright WebKit sonucu bu kontrollerin yerine geçmez. Kaynakta açık kalan
search/date picker/cards ve diğer inventory parity işleri kapatılmış sayılmadı.

## Tekrar çalıştırma

```powershell
npm ci
npx playwright install chromium firefox webkit
npm run test:clean
npm run verify
npm run test:parity
npm run build:showcase
```

CI Linux üzerinde motorların sistem bağımlılıklarını da `--with-deps` ile kurar.
`verify`: authoritative unit zinciri, dist drift, types, gerçek tarball tüketicisi,
üç motorlu web platformu, seçilmiş mevcut browser paketleri, katalog ve framework
entegrasyonlarını birlikte çalıştırır. Tam parity paketi ayrıca çalıştırılır.

11 Ekim 2026 tarihli görsel/etkileşim geri bildirimleri ve Brave Shields
düzeltmeleri ayrıca [UI-FOLLOWUP.md](UI-FOLLOWUP.md) dosyasında kayıtlıdır.
Yeni üç motorlu UI regresyon paketi de `verify` zincirine eklenmiştir.
