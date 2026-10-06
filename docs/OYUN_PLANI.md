# Kamyoncu — Oyun Planı

> Kamyon yönetimi simülasyonu. Bu belge oyunun tasarımını, teknik mimarisini ve
> geliştirme yol haritasını tanımlar. Yaşayan bir belgedir; kararlar netleştikçe
> güncellenir.

---

## 1. Vizyon

Oyuncu, tek bir ikinci el kamyonet ve birikmiş az bir sermayeyle Türkiye'de bir
nakliye şirketi kurar. Yük ilanlarından iş alır, şoför işe alır, filosunu ve
şube ağını büyütür; yakıt fiyatları, bakım masrafları, teslim süreleri ve
müşteri itibarı arasında denge kurarak ülkenin en büyük lojistik firmasına
dönüşmeye çalışır.

- **Tür:** Tycoon / yönetim simülasyonu (sürüş simülasyonu **değil**).
- **Bakış:** Üstten harita + yönetim panelleri.
- **Platform:** Tarayıcı (masaüstü öncelikli, mobilde oynanabilir).
- **Yapı:** **Sonsuz (endless) oyun.** Kazanma ekranı ya da bitiş tarihi yok;
  tek, sürekli büyüyen bir kariyer. Oturumlar 15–60 dk, kariyer aylarca sürebilir.
- **Ton:** Yerel ve samimi — gerçek Türk şehirleri, otoyollar, köprüler,
  “Hayırlı yolculuklar” havası.

### Tasarım ilkeleri
1. **Her karar bir takas olmalı.** Hızlı mı, ucuz mu? Yeni kamyon mu, şoför mü?
2. **Okunabilir sistemler.** Oyuncu bir işten neden kâr/zarar ettiğini her zaman
   görebilmeli (gelir–gider dökümü).
3. **Küçük başla, derin büyü.** İlk 5 dakika tek kamyonla basit; mekanikler
   filo büyüdükçe açılır.
4. **Mikro yönetimi otomasyonla ödüllendir.** Büyüyünce rota/iş atama
   otomatikleştirilebilmeli (dispeçer).
5. **Dünya durmaz.** Sonsuz oyunun canlı kalması için ekonomi, şehirler, yollar
   ve teknoloji zamanla değişir; oyuncu hiçbir zaman “çözülmüş” bir oyunda
   kalmamalı (bkz. Bölüm 3.12).

---

## 2. Çekirdek Oyun Döngüsü

```
 Yük ilanlarına bak ──► İşi kabul et ──► Kamyon + şoför ata
        ▲                                        │
        │                                        ▼
 Yatırım yap (kamyon,               Sefer simülasyonu (yol, yakıt,
 şoför, şube, dorse)                mola, olaylar, gecikme)
        ▲                                        │
        │                                        ▼
  Kâr / itibar kazan ◄──────────── Teslimat ve ödeme
```

**Kısa döngü (dakikalar):** iş seç → ata → teslim et → para al.
**Orta döngü (oyun haftaları):** bakım, şoför yorgunluğu, kredi taksitleri,
filoyu doğru konumlandırma.
**Uzun döngü (oyun yılları):** şube ağı, büyük sözleşmeler, pazar payı,
filonun yenilenmesi.
**Sonsuz döngü (oyun on yılları):** değişen dünyaya uyum — yeni sanayi
bölgeleri, yeni otoyollar, yeni kamyon teknolojileri, ekonomik krizler ve
yükselişler; operasyon yöneticiliğinden holding stratejisine geçiş.

---

## 3. Oyun Sistemleri

### 3.1 Harita ve Şehirler
- Türkiye haritası; şehirler **düğüm**, yollar **kenar** olan bir graf.
- Her yolun: mesafesi (km), türü (otoyol / devlet yolu / il yolu), ortalama
  hızı, geçiş ücreti (otoyol, köprü: Osmangazi, Yavuz Sultan Selim, 1915
  Çanakkale vb.) ve mevsimsel risk (kış — dağ geçitleri) değeri vardır.
- Rota bulma: Dijkstra/A* — oyuncu “en hızlı / en ucuz / ücretsiz yol” tercihi
  yapabilir.
- Şehir özellikleri: nüfus/ekonomi seviyesi, ürettiği ve talep ettiği yük
  türleri (ör. Bursa → otomotiv parçası, Antalya → sebze/meyve, Kocaeli →
  kimyasal, Gaziantep → tekstil, Mersin → liman konteyneri).
- **MVP:** ~15 büyük şehir. **Tam oyun:** 81 il.

### 3.2 Araç Sınıfları
Oyunda hafif ticari araçtan ağır nakliyeye **7 araç sınıfı** vardır. Sınıf;
taşınabilecek yükü, gereken ehliyeti, otoyol ücret sınıfını ve erişilebilir
yolları belirler. Oyuncu firma büyüdükçe üst sınıfları açar.

| # | Sınıf | Düzen | Azami ağırlık | Yük | Ehliyet | Otoyol | Tipik iş |
|---|---|---|---|---|---|---|---|
| 1 | Kamyonet | 4×2 | 3,5 t | ~1,5 t | B | 1. sınıf | Şehir içi dağıtım, parsiyel, e-ticaret |
| 2 | Hafif kamyon | 4×2 | 7,5 t | ~4 t | C1 | 2. sınıf | Bölgesel dağıtım, beyaz eşya |
| 3 | Orta kamyon | 4×2 | 18 t | ~10 t | C | 2. sınıf | Küçük partiler, soğuk zincir dağıtımı |
| 4 | On teker | 6×2 | 26 t | ~17 t | C | 3. sınıf | Tahıl, mobilya, inşaat malzemesi |
| 5 | Kırkayak (damper) | 8×4 | 32 t | ~20 t | C | 4. sınıf | Hafriyat, kum-çakıl, maden |
| 6 | Tır | çekici + 3 akslı dorse | 40 t | ~25 t | CE | 4. sınıf | Komple yük, uzun yol |
| 7 | Ağır nakliye | 8×4 çekici + lowbed | 60 t+ | ~40 t (izinli) | CE + özel izin | 5. sınıf | İş makinesi, trafo, rüzgâr kanadı |

- **Ehliyet:** şoförlerin ehliyet sınıfı (B, C1, C, CE) hangi araca
  atanabileceklerini belirler. Ticari taşımacılık için SRC belgesi, tehlikeli
  madde için ADR belgesi gerekir. Şoförler eğitimle sınıf atlayabilir.
- **Kısıtlar:** büyük sınıflar şehir merkezlerine gündüz giremez
  (aktarma için küçük araç gerekir); ağır nakliye güzergâh izni ve refakat
  aracı ister; bazı dağ yolları ve köprüler tonaj sınırlıdır.
- **Başlangıç:** oyuncu ikinci el bir kamyonetle başlar. İsteğe bağlı daha
  zor başlangıç: eski bir on teker ve kredi borcu.
- Tır (6. sınıf) çekici ve dorse ayrı varlıklardır; diğer sınıflarda kasa
  araca sabittir.

#### Sınıf içi seviyeler
Her sınıfta üç donanım seviyesi bulunur:

| Seviye | Fiyat | Yakıt | Arıza riski | Şoför morali | İkinci el değeri |
|---|---|---|---|---|---|
| Ekonomik (eski model, çoğu ikinci el) | Düşük | +15% | Yüksek | − | Hızla düşer |
| Standart | Orta | Referans | Orta | Nötr | Normal |
| Premium (geniş kabin, yardımcı sistemler) | Yüksek | −10% | Düşük | + | Korunur |

#### Teknoloji nesilleri (sonsuz oyun)
Euro 6 dizel (başlangıç) → LNG (~3. yıl; tır ve on teker) → elektrikli
(~6. yıl; önce kamyonet ve hafif kamyon, şube şarj altyapısı gerekir) →
hidrojen (~10. yıl; uzun yol tır) → otonom (~14. yıl; yalnızca otoyolda).

#### Her aracın ortak özellikleri
| Özellik | Açıklama |
|---|---|
| Model / marka | Kurgusal markalar (lisans sorunu olmaması için) |
| Fiyat | Sıfır / ikinci el pazarı |
| Yakıt tüketimi | L/100 km, yük oranıyla artar |
| Güvenilirlik | Arıza olasılığını etkiler |
| Durum (%) | Kilometreyle düşer; bakımla yükselir |
| Kilometre / yaş | İkinci el değerini ve arıza riskini etkiler |
| Emisyon sınıfı | Bazı şehir ve ihale kısıtları |
| Görünüm | Firma rengi, logo, kabin süsü, arka yazısı, araç adı |

### 3.3 Dorseler
Tenteli, frigorifik (soğuk zincir), tanker, damperli, lowbed (ağır/gabari dışı),
konteyner şasesi. Her yük belirli dorse türü gerektirir. Dorseler kamyondan
bağımsız varlıklardır (ileride dorse değişimi / bırak-al).

### 3.4 Şoförler
- Özellikler: maaş, deneyim seviyesi, beceriler (yakıt tasarrufu, güvenli
  sürüş, hız), sadakat/moral, yorgunluk.
- **Sürüş süresi kuralları** (sadeleştirilmiş AETR): günde en fazla ~9 saat
  sürüş, 4,5 saatte 45 dk mola, günlük dinlenme. Çift şoförlü sefer bu limiti
  esnetir ama maliyetlidir.
- Deneyim kazanır, seviye atlar, zam ister; morali düşükse istifa edebilir.
- Şoför pazarı: her hafta yenilenen aday listesi.

### 3.5 Yükler ve İş Bulma
- **Yük borsası:** her şehirde periyodik yenilenen ilanlar.
  - Alış/teslim şehri, yük türü, ağırlık, gereken dorse, teslim son tarihi,
    ödeme, gecikme cezası, (varsa) kırılganlık/tehlikeli madde.
- **Sözleşmeler (orta oyun):** bir müşteriyle X hafta boyunca düzenli sefer;
  sabit gelir, kaçırılırsa ağır itibar kaybı.
- **İhaleler (geç oyun):** büyük hacimli, birden fazla kamyon gerektiren işler.
- Boş dönüş (empty leg) problemi: kamyonu dönüş yükü bulunabilecek yerde
  bırakmak stratejinin merkezidir.

### 3.6 Ekonomi
**Gelir:** yük ödemeleri, zamanında teslim bonusu, kamyon satışı.
**Giderler:**
- Yakıt (dalgalanan motorin fiyatı)
- Otoyol ve köprü geçiş ücretleri
- Şoför maaşları + harcırah
- Bakım/onarım, lastik
- Sigorta (kasko, trafik), muayene
- Şube kirası
- Kredi faizi
- Gecikme cezaları, hasar tazminatları

**Finans araçları:** banka kredisi (kredi notuna bağlı limit/faiz), leasing.
**Rapor ekranı:** haftalık/aylık gelir-gider tablosu, kamyon bazında kârlılık.

Örnek ödeme formülü (ayarlanabilir):
```
ödeme = taban_ücret
      + mesafe_km × km_birim_fiyatı[yük_türü]
      × aciliyet_katsayısı × talep_katsayısı[şehir, yük_türü]
```
Örnek yakıt formülü:
```
yakıt_L = mesafe_km / 100 × tüketim × (1 + 0.35 × yük_oranı) × (1 − şoför_tasarruf)
```

### 3.7 Şubeler / Garajlar
- Başlangıç: tek bir merkez (oyuncu seçer, ör. İstanbul / Ankara / İzmir).
- Yeni şube açmak: o şehirde kamyon park etme, bakım indirimi, yerel ilanlara
  erken erişim, şoför işe alma.
- Şube kapasitesi yükseltilebilir.

### 3.8 İtibar ve Müşteriler
- Genel firma itibarı + yük türü/sektör bazında itibar.
- Zamanında ve hasarsız teslim itibarı artırır; yüksek itibar daha iyi ilanları
  ve sözleşmeleri açar.

### 3.9 Rastgele Olaylar
Arıza, lastik patlaması, trafik kazası, kar nedeniyle yol kapanması
(Bolu Dağı, Sertavul vb.), bayram trafiği, yakıt zammı, gümrük gecikmesi
(ileride uluslararası), denetim/ceza. Olaylar seçim sunabilir
(“Yolda tamir et — pahalı ama hızlı / Çekici çağır — ucuz ama yavaş”).

### 3.10 Zaman
- Oyun içi saat; hız: **Duraklat / 1× / 2× / 4× / 8× / 16×**.
- **“Sonraki olaya atla”**: büyük filoda sakin dönemleri hızla geçmek için.
- 1× hızda 1 gerçek saniye ≈ 1 oyun dakikası (ayarlanacak).
- Sabit adımlı (fixed timestep) simülasyon — kare hızından bağımsız.
- Önemli olaylarda otomatik duraklatma (ayarlanabilir).

### 3.11 İlerleme ve Hedefler
Oyunun sonu yoktur; ilerleme **sınırsız** ve **katmanlı** tasarlanır.

- **Firma seviyesi — sınırsız.** Seviye eşikleri artarak büyür
  (ör. `eşik(n) = taban × n^1.6`). İlk seviyeler içerik açar (dorse türleri,
  şehirler, sözleşmeler, ihaleler); sonraki seviyeler unvan, kozmetik
  (firma logosu/renkleri) ve küçük kalıcı bonuslar verir.
- **Kilometre taşları (milestone).** “İlk 10 teslimat”, “50 kamyon”,
  “81 ilin hepsine teslimat”, “10 yıl iflassız” — sayısal olanlar kademeli
  ve sonsuz tekrarlanabilir (100 → 1.000 → 10.000 teslimat…).
- **Prosedürel görevler.** Müşterilerden, şehirlerden ve olaylardan sürekli
  üretilen hedefler: “Bu kış Doğu Anadolu'ya 20 sefer yakacak taşı”,
  “Yeni açılan OSB'nin ilk lojistik ortağı ol”. Ödül: para, itibar, özel
  sözleşme.
- **Bölgesel pazar payı.** Her bölgede (Marmara, Ege, İç Anadolu…) rakiplere
  karşı pazar payı; liderlik bölgesel bonuslar verir ve korunmalıdır.
- **Firma tarihçesi / şeref kürsüsü.** Kronoloji (ilk kamyon, ilk şube, en
  büyük sözleşme), rekorlar ve istatistik grafikleri — uzun kariyerin
  hikâyesini görünür kılar.

#### İflas: oyun sonu değil, geri dönüş
Sonsuz oyunda iflas kariyeri silmemeli. Varsayılan davranış:
- Uzun süre negatif nakit + kredi temerrüdü → **konkordato / yeniden
  yapılanma**: banka varlıkların bir kısmına el koyar, firma 1–2 kamyon ve
  ağır itibar kaybıyla ayakta kalır; tarihçe ve kilometre taşları korunur.
- **İsteğe bağlı “Zor mod”:** iflas gerçek oyun sonudur.

### 3.12 Sonsuz Oyunu Canlı Tutmak
Tycoon oyunlarının bilinen sorunu: oyuncu bir noktada “her şeyi çözer”, para
anlamsızlaşır ve oyun sıkıcılaşır. Önlemler:

**a) Değişen dünya**
- **Ekonomik döngüler:** büyüme → durgunluk → kriz → toparlanma. Talep,
  navlun fiyatları ve faiz oranları dönemsel olarak değişir.
- **Şehirlerin evrimi:** yeni fabrikalar ve organize sanayi bölgeleri açılır,
  bazı sektörler küçülür; yük haritası yıllar içinde yeniden şekillenir.
- **Altyapı projeleri:** yeni otoyollar, köprüler, tüneller açılır
  (rotalar ve stratejik konumlar değişir).
- **Teknoloji ağacı (zamana bağlı):** daha verimli motorlar → LNG/elektrikli →
  hidrojen kamyonlar; telematik, filo yönetim yazılımı; ileride otonom sürüş.
  Eski filo yavaş yavaş rekabet gücünü kaybeder.
- **Mevzuat değişiklikleri:** emisyon bölgeleri, yeni sürüş süresi kuralları,
  vergi değişiklikleri.

**b) Ölçekle artan zorluk (kartopu etkisini frenleme)**
- **Yönetim ek yükü:** filo/şube sayısı arttıkça genel gider oranı artar;
  yönetici (bölge müdürü) işe almak gerekir.
- **Rakip firmalar:** yapay zekâ rakipler büyür, fiyat kırar, şoför ve müşteri
  kapar; bazıları batar, bazıları satın alınabilir.
- **Müşteri beklentisi:** büyük müşteriler daha sıkı teslim süreleri ve
  kalite şartları ister.
- **Azalan getiri:** aynı bölgede aşırı yoğunlaşmak navlunları düşürür;
  çeşitlendirme ödüllendirilir.

**c) Paranın anlamlı kalması (para harcama alanları)**
- Pahalı geç oyun yatırımları: lojistik merkezleri, soğuk hava depoları,
  kendi akaryakıt istasyonları, bakım atölyeleri, eğitim akademisi.
- Rakip firma satın alma / birleşme.
- Filo yenileme baskısı (teknoloji + yaşlanma).

**d) Oyuncunun rolünün evrimi**
| Aşama | Filo | Oyuncunun odağı |
|---|---|---|
| Kamyoncu | 1–3 | Tek tek sefer seçimi |
| Nakliyeci | 4–20 | Şoför yönetimi, rota planlama |
| Lojistik firması | 20–100 | Şubeler, sözleşmeler, dispeçer kuralları |
| Holding | 100+ | Bölge müdürleri, satın almalar, yatırım stratejisi |

Otomasyon araçları (dispeçer, bölge müdürleri, otomatik bakım/filo yenileme
kuralları) her aşamada bir önceki aşamanın mikro yönetimini devralır.

---

## 4. Arayüz (Ekranlar)

1. **Ana harita** — şehirler, yollar, hareket eden kamyon ikonları,
   üst barda nakit / tarih / hız kontrolü.
2. **Yük borsası** — filtrelenebilir ilan listesi (şehir, dorse, kâr/km).
   Her ilan için tahmini kâr hesaplaması gösterilir.
3. **Filo** — kamyon/dorse listesi, durum, konum, aktif iş.
4. **Şoförler** — liste, işe alım, yorgunluk, beceriler.
5. **Sefer planlama** — rota seçenekleri, tahmini süre, maliyet dökümü.
6. **Pazar** — kamyon/dorse alım-satım (sıfır ve ikinci el).
7. **Finans** — gelir-gider, kredi, grafikler.
8. **Şubeler**
9. **Bildirimler / olay günlüğü**
10. **Ana menü / kayıt-yükleme / ayarlar**

## 4.1 Görsel Stil

Örnek sayfa: `docs/gorsel-stil.html` (dört stilin harita örnekleri ve araç
sınıflarının aynı ölçekte çizimleri).

Değerlendirilen yönler: **A** sade vektör, **B** diorama (2.5D),
**C** piksel-art, **D** hibrit. **Öneri: D — hibrit.**

- **Harita:** sade vektör. Otoyollar yeşil (tabela rengi), devlet yolları gri;
  şehirler büyüklüğe göre noktalar. Kamyonlar firma renginde, gidiş yönünü
  gösteren çipler; boyları sınıfla büyür. WebGL'de tek sprite atlasından
  çizilir.
- **Garaj, pazar ve sefer ekranları:** detaylı yan görünüm çizimleri.
  Gerçek ölçekte (metre) çizilir, böylece sınıflar arası boy farkı görünür.
- **Parçalı (modüler) çizim sistemi:** kabin + şasi/aks düzeni + kasa/dorse
  + yük parçaları kodla birleştirilir; firma rengi ve logosu otomatik boyanır.
  Yeni teknoloji nesli veya seviye için yalnızca yeni parça çizilir.
- **Kişiselleştirme ödülleri:** firma rengi/logosu, kabin süsleri, korna
  sesi, çamurluk ve arka yazıları (“Ana duası”, “Yolun açık olsun”…).
- **Tipografi:** başlıklarda otoyol tabelası hissi veren dar yazı tipi,
  tablolarda okunaklı sans-serif ve sayılar için eş aralıklı yazı tipi.

---

## 5. Teknik Mimari

### 5.1 Teknoloji yığını (öneri)
| Katman | Seçim | Gerekçe |
|---|---|---|
| Dil | **TypeScript** | Tip güvenliği; simülasyon modelleri için ideal |
| Derleme | **Vite** | Hızlı geliştirme sunucusu, basit kurulum |
| UI | **React** | Çok sayıda panel/tablo içeren yönetim arayüzü |
| Harita | **PixiJS (WebGL, WebGPU destekli)** | Yüzlerce hareketli kamyon, zoom/pan, katmanlar akıcı çizilir |
| Simülasyon çalıştırma | **Web Worker** | Ağır simülasyon UI'ı kilitlemez |
| Yüksek performanslı modüller | **Rust → WebAssembly** (yalnızca ölçümle gerekirse) | Bkz. 5.3 |
| Durum yönetimi | **Zustand** | Hafif; simülasyon çekirdeğini sarmalar |
| Test | **Vitest** | Simülasyon çekirdeği için birim testleri |
| Kayıt | **localStorage / IndexedDB** + JSON dışa aktarma | Sunucu gerektirmez |

### 5.2 Mimari ilke: Simülasyon çekirdeği UI'dan bağımsız
```
┌─────────────────────────────┐  ┌────────────────────────────┐
│ React (DOM)                 │  │ PixiJS (WebGL canvas)      │
│ paneller, tablolar, menüler │  │ harita, kamyonlar, katmanlar│
└──────────────▲──────┬───────┘  └──────────────▲─────────────┘
               │      │ komutlar                │ konumlar
┌──────────────┴──────▼─────────────────────────┴─────────────┐
│ Oyun köprüsü (Zustand store) — hız, anlık görüntü, olaylar   │
└──────────────▲──────────────────────────┬───────────────────┘
               │ postMessage (durum farkı) │ postMessage (komut)
┌──────────────┴──────────────────────────▼───────────────────┐
│ Web Worker: Simülasyon çekirdeği (saf TypeScript)            │
│  - deterministik (tohumlu RNG), sabit adımlı                 │
│  - step(state, dt) → state + olaylar                         │
│  - komutlar: acceptJob, assignTruck, buy…                    │
│  - [ileride] sıcak noktalar → Rust/WebAssembly modülleri     │
└─────────────────────────────────────────────────────────────┘
                ▲
       Statik veri (JSON): şehirler, yollar,
       kamyon modelleri, yük türleri
```
- Çekirdek DOM/React/PixiJS bilmez → kolay test (Node'da Vitest ile),
  kayıt dosyası sadece serileştirilmiş `GameState`'tir.
- Çekirdek **Faz 0'dan itibaren Web Worker'da** çalışır; UI'a her karede
  tüm durum değil, yalnızca **değişiklikler** (kamyon konumları, nakit,
  olaylar) gönderilir.
- Harita katmanı, kamyon konumlarını iki simülasyon adımı arasında
  **interpolasyonla** çizer → 60 FPS akıcı hareket, simülasyon adımı
  bundan bağımsız.
- Tohumlu (seeded) RNG → hatalar tekrarlanabilir, testler deterministik.
- Tüm denge değerleri tek bir `balance` yapılandırmasında.

### 5.3 Render ve performans kararları

**WebGL (PixiJS) — evet, baştan.**
- Harita: şehirler, yol ağı, kamyon ikonları, rota vurgusu, hava durumu
  (kar/kapalı yol) ve trafik yoğunluğu katmanları.
- Kamera: zoom/pan, mobilde dokunma (pinch) desteği; zoom seviyesine göre
  ayrıntı (uzakta bölge özetleri, yakında tek tek kamyonlar).
- Kamyon ve şehir ikonları **sprite atlas** üzerinden toplu (batched) çizilir.
- Ham WebGL yazılmaz; PixiJS soyutlaması kullanılır.
- **Paneller WebGL'e taşınmaz:** metin/tablo ağırlıklı yönetim ekranları
  React/DOM'da kalır (metin kalitesi, erişilebilirlik, geliştirme hızı).

**WebAssembly — şimdilik hayır, kapı açık.**
- Mevcut iş yükü (81 düğümlü grafta rota bulma, birkaç yüz kamyonun
  güncellenmesi) TypeScript'te milisaniyenin altındadır.
- Wasm'ın maliyeti: ikinci dil ve derleme zinciri, JS↔Wasm veri aktarım
  yükü, daha zor hata ayıklama.
- **Ne zaman devreye girer:** profil ölçümünde 16× hızda adım süresi bütçeyi
  (ör. 4 ms) aşarsa; tipik adaylar: binlerce ajanlı trafik simülasyonu,
  rakip yapay zekâların filo/rota optimizasyonu, çok oyunculu modda
  sunucuyla paylaşılan oyun mantığı.
- **Nasıl:** yalnızca ilgili modül Rust ile yazılıp `wasm-pack` ile
  derlenir ve Worker içinde aynı TypeScript arayüzünün arkasına konur;
  veri, kopyalamayı önlemek için düz dizilerle (typed array) aktarılır.
  Aynı testler her iki uygulamaya da koşulur.

**Neden tam oyun motoru (Unity/Godot/Bevy) değil?** Web çıktıları da
Wasm + WebGL'dir, ancak 10–40 MB indirme, yavaş açılış, tablo ağırlıklı
yönetim arayüzlerinin zahmetli oluşu ve zayıf mobil tarayıcı performansı
nedeniyle bu tür için uygun değil.

### 5.4 Sonsuz oyun için teknik gereksinimler
Kariyer aylarca/yıllarca (gerçek zaman) sürebileceği için:
- **Kayıt sürümleme ve göç (migration):** her kayıtta `version` alanı;
  oyun güncellendiğinde eski kayıtlar otomatik dönüştürülür. Hiçbir
  güncelleme mevcut kariyeri bozmamalı.
- **Sınırlı veri büyümesi:** muhasebe kayıtları kademeli özetlenir
  (günlük → aylık → yıllık); tamamlanan seferler, süresi geçen ilanlar ve
  eski bildirimler budanır. Kayıt boyutu oyun süresinden bağımsız kalmalı.
- **Para birimi:** tamsayı kuruş (kayan nokta hatası birikmesin). Değerler
  `Number.MAX_SAFE_INTEGER` (~90 trilyon ₺) sınırının çok altında kalacak;
  gerekirse `BigInt`.
- **Otomatik kayıt** + birden fazla kayıt yuvası + dışa/içe aktarma (yedek).
- **Uzun süreli performans:** 100+ kamyon ve rakiplerle 16× hızda akıcı
  çalışmalı (Web Worker + WebGL harita sayesinde UI akıcı kalır).
- **Uzun süreli denge testi:** çekirdek UI'sız çalıştığı için botla
  “50 oyun yılı” simülasyonu koşturulup ekonomi patlaması/çöküşü
  otomatik testlerle yakalanır.

### 5.5 Klasör yapısı (taslak)
```
kamyoncu/
├─ docs/                 # tasarım belgeleri
├─ src/
│  ├─ core/              # simülasyon çekirdeği (UI'sız)
│  │  ├─ state.ts        # GameState tipleri
│  │  ├─ sim.ts          # step(), tick döngüsü
│  │  ├─ commands.ts     # oyuncu komutları
│  │  ├─ routing.ts      # rota bulma
│  │  ├─ economy.ts      # fiyat, yakıt, maliyet hesapları
│  │  ├─ jobs.ts         # yük ilanı üretimi
│  │  ├─ drivers.ts
│  │  ├─ events.ts       # rastgele olaylar
│  │  ├─ world.ts        # ekonomik döngüler, şehir evrimi, altyapı, teknoloji
│  │  ├─ save.ts         # serileştirme, sürümleme, göç, budama
│  │  ├─ rng.ts
│  │  └─ balance.ts      # denge sabitleri
│  ├─ data/              # cities.json, roads.json, trucks.json, cargo.json
│  ├─ worker/            # simülasyonu çalıştıran Web Worker + mesaj protokolü
│  ├─ store/             # Zustand köprüsü
│  ├─ map/               # PixiJS harita: katmanlar, kamera, sprite'lar
│  ├─ ui/                # React bileşenleri (paneller, menüler, …)
│  └─ main.tsx
├─ tests/
└─ package.json
```

### 5.6 Temel veri modelleri (taslak)
```ts
interface City   { id: string; name: string; x: number; y: number;
                   produces: CargoTypeId[]; demands: CargoTypeId[]; }
interface Road   { id: string; from: string; to: string; km: number;
                   kind: 'otoyol' | 'devlet' | 'il'; toll: number; }
interface Truck  { id: string; modelId: string; condition: number; odometer: number;
                   location: Location; trailerId?: string; driverId?: string; }
interface Driver { id: string; name: string; salary: number; level: number;
                   skills: Skills; fatigue: number; morale: number; drivingToday: number; }
interface Job    { id: string; from: string; to: string; cargo: CargoTypeId;
                   tons: number; trailer: TrailerKind; deadline: number;
                   pay: number; penaltyPerHour: number; }
interface Trip   { id: string; truckId: string; jobId?: string; route: string[];
                   progressKm: number; phase: 'yüklemeye' | 'yolda' | 'mola' | 'boşaltma'; }
interface GameState { time: number; seed: number; money: number; reputation: number;
                      trucks: Truck[]; drivers: Driver[]; jobs: Job[]; trips: Trip[];
                      branches: Branch[]; loans: Loan[]; ledger: LedgerEntry[]; }
```

---

## 6. Geliştirme Yol Haritası

### Faz 0 — İskelet
- Vite + React + TS projesi, lint/format, Vitest.
- Simülasyon çekirdeği Web Worker'da; mesaj protokolü ve Zustand köprüsü.
- PixiJS harita: şehirler, yollar, zoom/pan.
- Oyun saati ve hız kontrolü.

### Faz 1 — Oynanabilir MVP 🎯
- 15 şehir + yol ağı, rota bulma.
- 1 araç (ikinci el kamyonet), 1 şoför (oyuncunun kendisi).
- Yük borsası → kabul et → kamyon haritada ilerler → teslim → para.
- Yakıt ve otoyol gideri, basit gelir-gider dökümü.
- Sürümlü kayıt/yükleme + otomatik kayıt (sonsuz kariyerin temeli baştan).
- **Başarı ölçütü:** 10 dakika oynanınca “bir sefer daha” hissi.

### Faz 2 — Filo ve Şoförler
- Araç pazarı (sıfır/ikinci el), birden fazla araç; sınıf 1–4 ve seviyeler.
- Hibrit görsel stilin parçalı kamyon çizim sistemi (garaj ekranı).
- Şoför işe alma, maaş, sürüş süresi/mola kuralları, yorgunluk.
- Tır (sınıf 6) ve dorse türleri (tenteli, frigorifik, tanker, konteyner); ehliyet sınıfları.
- Bakım ve kamyon durumu.

### Faz 3 — Ekonomi Derinliği
- Kredi, sigorta, dalgalanan yakıt fiyatı.
- Şubeler.
- İtibar sistemi, sözleşmeler.
- Finans raporları ve grafikler.

### Faz 4 — Olaylar ve Canlılık
- Rastgele olaylar (arıza, kaza, hava, trafik) ve seçimli olay kartları.
- Mevsimler, bayram yoğunluğu.
- Bildirim sistemi, otomatik duraklatma.

### Faz 5 — Otomasyon ve Geç Oyun
- Dispeçer: kurallara göre otomatik iş atama; bölge müdürleri.
- İhaleler, 81 ile genişleme.
- Kırkayak (sınıf 5) ve ağır nakliye (sınıf 7): şantiye sözleşmeleri, güzergâh izni, refakat.
- Sınırsız firma seviyesi, kademeli kilometre taşları, prosedürel görevler.
- Firma tarihçesi ve istatistikler.

### Faz 5.5 — Sonsuz Dünya
- Ekonomik döngüler, şehir evrimi, altyapı projeleri.
- Zamana bağlı teknoloji ilerlemesi ve mevzuat değişiklikleri.
- Rakip firmalar, satın alma/birleşme.
- Geç oyun yatırımları (lojistik merkezi, depo, istasyon).
- 50 oyun yılı bot simülasyonuyla uzun vadeli denge testleri.

### Faz 6 — Cila
- Ses/müzik, animasyonlar, eğitim (tutorial), mobil uyumluluk, denge ayarı.

### İleride (fikir havuzu)
- Uluslararası seferler (Avrupa, Orta Doğu) — gümrük, vize, döviz.
- Çok oyunculu ortak pazar.

---

## 7. Denge Hedefleri (ilk tahminler)

| Değer | Başlangıç tahmini |
|---|---|
| Başlangıç sermayesi | 250.000 ₺ + ikinci el kamyonet |
| İkinci el kamyon | 1,5 – 3 M₺ |
| Sıfır kamyon | 4 – 6 M₺ |
| Motorin | ~45 ₺/L (dalgalanır) |
| Ortalama tüketim | 28–35 L/100 km |
| Yük ödemesi | ~25–60 ₺/km (yük türüne göre) |
| Şoför maaşı | 50.000 – 90.000 ₺/ay |
| İlk ek kamyona ulaşma | ~1–2 saat oynanış |

> Tüm değerler `balance.ts` içinde tutulacak ve oyun testleriyle ayarlanacak.

---

## 8. Alınan Kararlar

| Konu | Karar |
|---|---|
| Oyun yapısı | Sonsuz (endless) kariyer; kazanma/bitiş yok |
| Platform | Tarayıcı: TypeScript + Vite + React |
| Harita render | WebGL (PixiJS) |
| Simülasyon | Saf TypeScript, Web Worker içinde |
| WebAssembly | Şimdilik yok; profil ölçümü gerektirirse modül bazında Rust/Wasm |
| Çevrimdışı ilerleme | Yok — zaman yalnızca oyun açıkken işler |
| Enflasyon | Yok — fiyatlar ekonomik döngülerle dalgalanır, sürekli artmaz |
| İflas | Varsayılan: yeniden yapılanma (kariyer devam eder) |
| Zor mod | Var — isteğe bağlı; iflas gerçek oyun sonudur |

## 9. Açık Sorular

1. **Görsel stil:** Hibrit öneri (bkz. 4.1) onaylanıyor mu?
2. **Kapsam:** Yalnızca Türkiye mi, yoksa ileride uluslararası mı?
3. **Oyuncu rolü:** Oyuncu başta kendisi de şoför mü (ilk kamyoneti kendisi
   sürer), yoksa doğrudan yönetici mi?
4. **Gerçekçilik seviyesi:** Sürüş süresi kuralları, vergi vb. ne kadar
   ayrıntılı olmalı?
5. **Dil:** Arayüz yalnızca Türkçe mi, yoksa Türkçe + İngilizce mi?
