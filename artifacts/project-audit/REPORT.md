# MD3E Web — ayrıntılı inceleme, 11 Ekim 2026

Projenin renk, hareket ve kaynak karşılaştırma altyapısı güçlü. Temel bileşen kullanım yolları ve katalog yerleşimi de iyi durumda. Daha zayıf kalan alanlar web platformuyla bütünleşme, erişilebilir adlandırma, form uç durumları ve sürüm hazırlama süreci. Yeni bileşen eklemeden önce bu alanların düzeltilmesi daha fazla değer üretir.

Bu rapor mevcut yerel çalışma ağacını inceler; commit edilmemiş kullanıcı değişiklikleri de kapsam içindedir. Git HEAD ayrıca temiz bir klasöre açılarak test girişinin taşınabilirliği kontrol edildi. Yayındaki site veya yayımlanmış npm sürümünün bu çalışma ağacıyla aynı olduğu varsayılmadı. Uygulama kaynaklarına düzeltme uygulanmadı; inceleme script’leri ve çıktılar bu klasöre yazıldı.

**İncelemenin kanıtı ve sınırları**

| Kontrol | Sonuç / kapsam |
|---|---|
| Ana `npm test` | Önceki inceleme turunda mevcut yerel dosyalarla exit 0 |
| Git HEAD temiz snapshot’ında `npm test` | İlk script bulunamadığı için exit 1 |
| CI’nin kullandığı eski güvenlik testi | 30 başarılı, 2 başarısız; eski kod yapısını arayan kontroller |
| Mevcut 9 tarayıcı test paketi | Güncel kaynaklardan bellekte oluşturulan bundle ile hepsi geçti |
| Yeni davranış incelemeleri | 15 senaryo × 3 yükleme biçimi × 3 motor = 135 yürütme |
| Ek kullanıcı etkileşimi kontrolleri | Üç motorda gerçek tıklama ile native/custom click iptali ve label fokus/adlandırma karşılaştırması |
| Yükleme biçimleri | Doğrudan kaynak, mevcut dist, güncel kaynaklardan bellekte build |
| Tarayıcı motorları | Chromium, Firefox, WebKit; Playwright’ın yerel motorları |
| Katalog | 43 kategori × 3 genişlik × 2 tema × 3 motor = 774 görünüm |
| Genişlikler | 320, 390 ve 1440 CSS piksel |
| Katalog görünürlüğü ve taşma | Yüklenmeyen kategori veya sayfa düzeyinde yatay taşma bulunmadı |
| Katalog JS hataları | Chromium/Firefox: 0; WebKit’in son koşusunda 70 ResizeObserver döngü bildirimi |
| Güvenlik örnekleri | Denenen HTML payload’ları çalışmadı; bu sonuç genel güvenlik sertifikası değildir |
| Gerçek yardımcı teknoloji | NVDA, JAWS ve VoiceOver ile manuel oturum yapılmadı |
| Tam parity paketi | Önceki turda kısmen çalıştırıldı, tamamı bitirilmedi; aşağıdaki 9 paket ayrıca tamamlandı |

Geçen 9 paket: Select composition, Autocomplete composition, Dialog/picker lifecycle, Navigation rail modal, Search parity, Segmented button parity, Text field editor, Selection keyboard, Tooltip focus.

Katalog taraması görünürlük, yükleme hataları ve sayfa genişliği içindir. Her örneğin her pikselinin, her metninin ve tüm etkileşimlerinin doğruluğunu kanıtlamaz. Mobil text field ve list ekran görüntüleri ayrıca gözle incelendi. WebKit burada gerçek macOS/iOS Safari oturumu anlamına gelmez.

**Öncelikli, tekrar üretilmiş bulgular**

1. **Yüksek — temiz checkout testleri çalıştıramıyor.** `package.json:51` ilk olarak `scripts/audit-showcase-tokens.mjs` çalıştırıyor. Dosya yerelde mevcut fakat Git tarafından takip edilmiyor. `.git/info/exclude:2` içindeki `scripts/*` kuralına takılıyor. `scripts/test-all-components.js`, `scripts/test-audit-security-fixes.js`, `scripts/test-fabs.mjs` ve `scripts/test-chips.mjs` de aynı durumda. HEAD, `git archive` ile bağımsız bir klasöre açıldığında `npm test` ilk dosyada `MODULE_NOT_FOUND` verdi. Bu sorun commit edilmemiş yeni carousel testinden ayrı; eksik ana script’lere HEAD’deki package.json da başvuruyor. **Etki:** yeni katkıcılar ve temiz CI koşuları yerel yeşil sonucu tekrar üretemiyor. **Düzeltme:** gerekli script’leri takibe almak, yerel exclude kuralını daraltmak ve temiz checkout testini CI’ye eklemek. Kanıt: `tracked-script-results.json`, `clean-checkout-test.log`.

2. **Yüksek — tüketicinin click iptali bileşenin eylemini durdurmuyor.** `src/motion/interactions.js:196-207` içindeki capture click listener, `onActivate` çağrısını olay host’a ulaşmadan yapıyor. `src/components/md-button.js:691` hemen `requestSubmit()` çağırıyor. Host üzerinde `event.preventDefault()` yapan listener olmasına rağmen bir submit gerçekleşti. Aynı karşılaştırmada native buton submit etmedi. Checkbox da host click iptal edilmesine rağmen işaretlendi; native checkbox işaretlenmedi. Trusted Playwright tıklamalarıyla da doğrulandı. **Etki:** tüketicinin koşullu iptal/uyarı/onay akışı beklediği davranışı vermiyor. **Düzeltme:** etkinleştirme zamanlaması ve iptal sözleşmesini ortak etkileşim katmanında tasarlamak; buton, checkbox, switch ve toggle tüketicilerini birlikte doğrulamak. Yerel bir buton yaması ortak sorunu çözmez. Kanıt: `runtime-results*.json`, `button-default-prevention-and-submitter`, `trusted-click-results.json`.

3. **Yüksek — autocomplete özel doğrulama hatasını kaybediyor.** `setCustomValidity('Server rejected this')` sonrasında `checkValidity()` false. `options` değiştirilince true oluyor; iç input hâlâ invalid ve `_customValidity` metni hâlâ mevcut. Formun `checkValidity()` sonucu da true. Kök neden `src/components/md-autocomplete.js:82`: üst sınıfın hesapladığı validity, yalnızca `valueMissing` dikkate alınarak tekrar yazılıyor. **Etki:** uygulamanın sunucu/iş kuralı hatası sessizce geçerli hale gelebiliyor. **Düzeltme:** validity’nin tek sahibi olmalı; customError ve diğer geçerli input flag’leri korunmalı. Üç motorda ve üç yükleme biçiminde tekrarlandı.

4. **Yüksek — text field dış label ve aria-labelledby bilgisini kullanmıyor.** `<label for="tf">Customer name</label>` ile ilişkilendirilmiş field’ın ElementInternals labels listesinde label var, fakat iç kontrolün adı `Text field`. Ayrıca `aria-labelledby="other"` iç kontrole aktarılmıyor. Label’a tıklama da iç input’a fokus vermedi. Kök nokta `src/components/md-text-field.js:399`: yalnızca `label`, `aria-label` veya sabit fallback kullanılıyor. **Etki:** form tasarlayan tüketici standart HTML adlandırma yöntemlerini kullandığında kullanıcı yanlış/genel kontrol adı duyabiliyor. **Düzeltme:** dış label, aria-labelledby, açık aria-label ve dahili label önceliğini belirleyen ortak bir adlandırma katmanı ve label aktivasyonu. Label metni değişikliklerini de izlemeli. Bu davranış üç motorda tekrarlandı. Erişilebilirlik ağacında özel kontrolün adı Text field, native karşılaştırmanın adı Native customer name olarak görüldü. Kanıt: `trusted-label-results.json`.

5. **Orta — select deklaratif selected durumunu siliyor, property değişimini izlemiyor.** `<md-option value="a" selected>` ile açılan select’te seçenek selected=false oluyor ve select.value boş kalıyor. Sonradan başka option’ın `.selected=true` yapılması da select.value değerini güncellemiyor. `src/components/md-select.js:88-97` seçimi yalnızca select.value’dan yeniden kuruyor; `:49` observer filtresinde `selected` yok. **Etki:** önceden seçili ayar/veri kaybolabiliyor; option API’si ile select state’i ayrışıyor. **Düzeltme:** ilk değer, option default selected durumu ve sonraki property değişimleri için açık state sözleşmesi; döngü oluşturmayan iki yönlü senkronizasyon.

6. **Orta — required select listede olmayan değeri geçerli kabul ediyor.** Yalnızca a/b seçenekleri varken `.value='missing'` atanırsa hiçbir option seçili değil, ancak `checkValidity()` true ve FormData `s=missing` içeriyor. `src/components/md-select.js:108` yalnızca değerin boş olup olmadığını kontrol ediyor. **Etki:** kapalı seçenek kümesi bekleyen uygulamalarda seçim ve gönderilen veri uyuşmuyor. **Düzeltme:** bilinmeyen değer politikası açık olmalı; native select benzeri kullanımda seçilebilir option bulunamıyorsa değer/seçim normalize edilmeli. Çoklu seçimde virgülle birleştirilmiş tek FormData değeri kullanılması da native multiple select’ten farklı bir sözleşme; bu ayrı bir uyumluluk notu olarak belgelenmeli.

7. **Orta — text field standart kısıtları sessizce görmezden geliyor.** `pattern`, `minlength`, `min`, `max`, `step` host üzerinde verilince iç input’a taşınmıyor. Örneğin `type=number min=10 max=20 step=2` alanına 3 verildiğinde valid=true. `pattern='[0-9]+'` ve `minlength=3` ile ab de valid. `src/components/md-text-field.js:74` observedAttributes ve `:394-399` senkronizasyon bu alanları kapsamıyor. **Etki:** native form doğrulamasına güvenen tüketici beklediği kısıtları alamıyor. Bu özellikler mevcut API tablosunda tam bir sözleşme olarak sunulmuyorsa eksik özellik/yanıltıcı entegrasyon iddiası olarak değerlendirilmelidir; yine de sessiz yok sayma giderilmeli. **Düzeltme:** desteklemek veya desteklenen attribute kümesini açıkça belgelemek; constraint değişikliklerinde validity’yi yenilemek.

8. **Orta — number field’ın görünen ve gönderilen değeri ayrışabiliyor.** Optional number field’a `.value='invalid-number'` atandığında iç native input boş, form geçerli, FormData ise `n=invalid-number` içeriyor. `src/components/md-text-field.js:267-272` `_value` ham metnini form değeri olarak saklıyor; input’un type sanitization sonucu geri okunmuyor. **Etki:** ekranda boş görünen kontrol farklı bir değer gönderebiliyor. Required olduğunda form invalid oluyor, dolayısıyla bu örneğin kritik koşulu optional kontrol. **Düzeltme:** input type dönüşümü/sanitization ile dış value ve FormData arasında tutarlılık sağlamak.

9. **Orta — ARIA durumları kaldırıldığında iç kontrolde kalabiliyor.** Butona `aria-expanded=true` verip host üzerinden kaldırınca host API’si null dönüyor fakat iç button `aria-expanded=true` taşımaya devam ediyor. `src/utils/host-aria.js:145-149` yalnızca mevcut host değerlerini yazıyor; kaldırma kolu yok. **Etki:** kapanmış popup hâlâ açık olarak sunulabiliyor. **Düzeltme:** forward edilen her durumun ekleme, değiştirme ve kaldırılması simetrik olmalı. `aria-haspopup` ve kontrol ilişkileri de aynı test matrisine alınmalı.

10. **Orta — ARIA’yı WeakMap’e taşıma DOM sözleşmesini kırıyor.** `src/utils/host-aria.js:49-51` gerçek attribute’ları silip WeakMap’e taşıyor. `aria-label='Delete account'` taşıyan icon button cloneNode(true) ile klonlandığında adı `delete` oluyor; outerHTML içinde özgün accessible label yok. Ayrıca checkbox dış label metni değiştiğinde iç kontrol eski adı koruyor. Bu tasarım görünürdeki bazı ARIA uyarılarını azaltıyor fakat klonlama, serileştirme, attribute seçicileri ve tüketici framework’leri için görünmeyen durum yaratıyor. **Düzeltme:** public DOM sözleşmesini koruyan ElementInternals/element reflection yaklaşımını değerlendirmek; en azından klonlama, label güncelleme, çıkarma ve yeniden bağlama sınırlarını açıkça test etmek. `cloneNode` özel WeakMap verisini kopyalayamaz.

11. **Orta — tarih seçici geçersiz tarihi normalize ederek farklı gün gösteriyor.** `value='02/31/2026'` iken dış value bu metin olarak kalıyor; iç seçili gün 3 Mart 2026, başlık `Tue, Mar 3`. `src/components/md-date-picker.js:570-584` Date constructor normalizasyonunu geçerlilik kontrolü olarak kullanıyor. Ayrıca `.value=''` önceki tarihi temizlemiyor; `:699` eski state’e düşüyor. **Etki:** uygulama ile kullanıcının gördüğü tarih uyuşmuyor, temizleme/reset akışı sürpriz davranıyor. **Düzeltme:** parse edilen yıl/ay/gün bileşenlerini geri karşılaştırmak, invalid/empty politikasını açıkça belirlemek. Tarih ve saat picker’ları doğrudan FormData’ya da katılmıyor; FACE desteğinin kapsamı belgelenmeli.

12. **Orta — TypeScript API’si runtime API’sini doğru temsil etmiyor.** `types/index.d.ts:46` MdBaseComponent’i runtime class olarak export ediyor, JS export’larında bu sınıf yok. MdShape, adoptSheet ve createComponentSheet JS’te export edilirken ana tanımlarda yok. `types/index.d.ts` ve `dist/index.d.ts` de birebir aynı değil. **Etki:** editörün kabul ettiği import çalışmayabilir veya çalışan import typesız kalabilir. **Düzeltme:** export uyumluluk kontrolü, TypeScript tüketici fixture’ı ve tek tanım kaynağı. Alt yol component importlarının types çözümlemesi de aynı tüketici testine dahil edilmeli. Bu incelemede gerçek tsc derlemesi yapılmadı; bulgu export listeleri ve dosya karşılaştırmasıyla doğrulandı. Kanıt: `packaging-results.json`.

13. **Orta — mevcut dist, güncel kaynaktan build ile uyuşmuyor.** Aynı esbuild ayarlarıyla bellekte oluşturulan ESM 1.482.347 bayt; depodaki ESM 1.475.907 bayt ve içerik farklı. Arama testi kaynak/fresh bundle ile 23 kontrolden geçiyor, mevcut dist ile collapsed radius kontrolünde 28px yerine 9999px beklediği için duruyor. Bu özel örnekte her iki radius da 56px yüksekliğinde pill oluşturabilir; tek başına görsel bozukluk kanıtı değildir. Ancak kaynak ve dağıtımın farklı sözleşmelerde olduğunu gösterir. Pages workflow build yapmadan mevcut dosyaları yüklüyor. Normal npm pack’in `prepack` build’i var; bu nedenle yayımlanmış npm paketinin mutlaka eski olduğu sonucuna varılmamalı. **Düzeltme:** dağıtım öncesi build ve kaynak/dist drift kontrolü.

14. **Orta — CI ve deploy güvenilir bir kalite kapısı oluşturmuyor.** `.github/workflows/ci.yml:27-32` yalnızca dört eski Node dosyası çalıştırıyor; ana npm test zinciri, build ve browser paketleri yok. Yerelde çalıştırılan CI güvenlik dosyasının iki hatası eski string kontrollerinden geliyor: eski `.seg-content` sınıfını ve progress dosyasının içinde IntersectionObserver ifadesini arıyor. Gerçekte yeni `.content` var ve görünürlük helper’a taşınmış. Bu iki başarısızlığı güvenlik açığı saymak doğru değil. `.github/workflows/deploy-pages.yml` ayrı push workflow’u; testin başarılı bitmesine bağlı değil. **Düzeltme:** temiz install/build, tek authoritative unit girişi, seçilmiş browser paketleri ve deploy bağımlılığı; eski implementation-string kontrollerini davranış testleriyle değiştirmek. Kilit dosyası da bulunmuyor; build bağımlılıkları için tekrar üretilebilir kurulum düzeni eksik.

15. **Orta — paket ve seçmeli import maliyeti yüksek.** npm dry-run/ignore-scripts önizlemesi 22.618.674 bayt arşiv, 32.240.036 bayt açılmış içerik ve 202 dosya gösteriyor. İki büyük icon font’un src ve dist kopyaları toplam 18.628.368 bayt; varsayılan icon CSS’i küçük rounded subset’i kullanıyor. İki JS source map de yaklaşık 7,1 MB. Bunlar npm kurulum boyutudur; tarayıcının hepsini otomatik indirdiği anlamına gelmez. Gerçek paket root importundan yalnız MdButton kullanıldığında ölçülen JS 1.462.318 bayt / gzip 399.438; component alt yolundan 247.474 / gzip 54.410. Root auto-registration nedeniyle diğer bileşenler atılamıyor. **Düzeltme:** font whitelist’i, isteğe bağlı debug/source map dağıtımı, doğru per-component örneği; gerekirse registration ile class export girişlerini ayırmak. `sideEffects:false` ifadesini körlemesine eklemek çözüm değildir; custom element kayıtlarını kaybettirebilir.

16. **Orta — SSR/framework anlatımı çalışma sınırını açıklamıyor.** Node’da ana src girişini import etmek `ReferenceError: Element is not defined` veriyor; module evaluation sırasında host-aria DOM prototiplerine erişiyor, bileşenler de HTMLElement’e dayanıyor. Bu, tarayıcıya yönelik bir kütüphane için anlaşılabilir bir sınırdır; sorun README’nin Next.js/SSR anlatımında bunun belirgin olmaması. **Düzeltme:** istemciye özel import/registration örnekleri, server-safe tema yardımcılarının ayrı kullanımı, framework tüketici örneklerini çalıştıran küçük entegrasyon kontrolleri. React/Vue/Next projeleri bu turda kurulup test edilmedi.

17. **Düşük / araştırılmalı — WebKit katalog gezintisinde ResizeObserver döngü bildirimleri.** Son koşuda 320px’te 27, 390px’te 23, 1440px’te 20 bildirim kaydedildi. Bildirim `ResizeObserver loop completed with undelivered notifications.`; sayfa taşması veya kategori kaybı eşlik etmedi. Route değişiklikleri sırasında farklı kategorilerde oluşuyor. **Düzeltme:** ölçüm ve stil yazma döngülerini tek frame’e birleştirmek, aynı boyuta yeniden yazmayı önlemek ve WebKit’e özel küçük tekrar üretme örneği çıkarmak. Eldeki kanıtla sonsuz döngü, bellek sızıntısı veya kullanılamazlık iddiası kurulamaz. Kanıt: `catalog-results-webkit.json`.

**Sağlam kalan alanlar ve mimari değerlendirme**

- Renk ve hareket hesapları yalnız JS’in kendi çıktısıyla sınanmıyor; hash kontrolü bulunan, sabitlenmiş AndroidX/Kotlin kaynaklarından üretilen oracle dosyaları kullanılıyor. Bu projenin en güçlü mühendislik tarafı. Oracle üretim zincirinin tamamı bu turda yeniden derlenmedi; mevcut fixture’lar ve test uygulaması incelendi.
- Basic text/checkbox/switch/slider/select FormData değerleri, reset ve disabled fieldset dışlama davranışı üç motorda doğru. Sekiz kez çıkarılıp bağlanan checkbox tek change olayı üretti. Bu tek senaryo bütün bileşenlerde bellek sızıntısı olmadığı anlamına gelmez.
- Dialog/picker lifecycle, modal rail, tooltip fokus ve selection keyboard testleri geçti. Native dialog/top layer ve ortak scroll-lock kullanımı iyi bir yön; özel popup/focus davranışını her bileşende sıfırdan yazmaktan kaçınılmış.
- JSON kayıtları için denenen null/sayı öğeleri katalog bileşenlerini çökertmedi. HTML payload’ları gerçek img düğümü yaratmadı ve onerror çalışmadı. URL yardımcıları izinli protokolleri sınırlıyor, yeni pencere açma akışında noopener kullanılıyor. Bunlar olumlu bulgular; exhaustive XSS incelemesi yapılmış sayılmaz.
- Runtime dependency olmaması tüketici entegrasyonunu kolaylaştırıyor. Saf JS/Web Components seçimi kendi başına problem değil; TypeScript’e yeniden yazmak veya framework eklemek yukarıdaki hataları otomatik düzeltmez.
- Geometri, renk ve motion yardımcılarının ayrılması test edilebilirliği artırmış. Öte yandan native Compose davranışını taşıyan runtime katmanları bakım maliyetini yükseltiyor. Web form/DOM/ARIA adaptörlerinin de en az sayısal parity kadar açık bir sözleşme ve regression matrisi olması gerekiyor.
- Envanter dürüstçe search, date picker ve cards’ı partial olarak işaretliyor. Yerelleştirme, bazı search varyantları, precision focus/ripple, bazı hareket tamamlama ayrıntıları ve platforma özgü davranışlar açık. Bunlar yeni bulunan regresyonlarla aynı kategoriye konmamalı.

**Düzeltme sırası**

1. Eksik takip edilen script’ler ve temiz checkout testini düzelt; mevcut CI ile deploy’u aynı doğrulama zincirine bağla.
2. Ortak click iptal sözleşmesi ve autocomplete validity kaybını çöz. Regresyonlar tüketici host listener’ı ve form submit seviyesinde olmalı.
3. Dış label/ARIA adlandırmasını, attribute kaldırmayı ve select seçim senkronizasyonunu düzelt. Üç motorlu mevcut audit senaryolarını kalıcı regresyonlara dönüştür.
4. Number/text constraint, tarih invalid/empty ve FormData sözleşmelerini tamamla.
5. Types/runtime export kontrolü, fresh build ve dist tutarlılık kapısı ekle. API değişiklikleri için sürüm/geçiş notu hazırla; mevcut badge, carousel, segmented button gibi API değişiklikleri önceki Git sözleşmesine göre kırıcı olabilir.
6. Font/asset dağıtımını daralt, README seçmeli import ve SSR örneklerini düzelt, build bağımlılıklarını kilitle.
7. WebKit observer bildirimlerini izole et; partial bileşen işlerini bundan sonra ilerlet.

**Tekrar çalıştırma**

Proje kökünden `node artifacts/project-audit/audit-server.mjs` iki yerel server başlatır. 28081 mevcut dist’i, 28082 ise kaynaklardan bellekte build edilmiş JS’i sunar; dist üzerine yazmaz. Server açıkken diğer script’ler ayrı terminalde çalıştırılabilir:

```powershell
node artifacts/project-audit/runtime-audit.mjs
$env:AUDIT_ENGINE='firefox'
node artifacts/project-audit/runtime-audit.mjs
$env:AUDIT_ENGINE='webkit'
node artifacts/project-audit/runtime-audit.mjs
$env:AUDIT_ENGINE='chromium'
node artifacts/project-audit/catalog-audit.mjs
node artifacts/project-audit/suite-audit.mjs
node artifacts/project-audit/packaging-audit.mjs
node artifacts/project-audit/trusted-click-audit.mjs
node artifacts/project-audit/trusted-label-audit.mjs
```

Script’ler Playwright ve esbuild’in çözümlenebildiği bir ortam gerektirir. Bu bilgisayarda bağımlılıklar üst klasördeki node_modules üzerinden bulundu. İncelemede test/dokümantasyon açıklarını gidermek amacıyla uygulama kaynakları, Git exclude ayarı veya dist değiştirilmedi.

