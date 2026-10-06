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
dönüşmeye çalışır. Oyun sonsuz olduğu için hikâye Türkiye'de bitmez: firma
önce komşu ülkelere ve Avrupa'ya açılır, sonra gemi ve uçakla kıtalar arası
taşımacılığa geçer; uzay çağı başladığında da Ay'a, Mars'a ve daha ötesine
yük taşır. Ton başta gerçekçidir, çağlar ilerledikçe tamamen bilimkurguya
döner: solucan delikleri, kara delik lojistiği, megayapılar ve paralel
evrenler (Bölüm 3.13).

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
| Gezegenlerarası | Çok dünyalı | Gezegen müdürleri, fırlatma pencereleri, tedarik zincirleri |

Otomasyon araçları (dispeçer, bölge müdürleri, otomatik bakım/filo yenileme
kuralları) her aşamada bir önceki aşamanın mikro yönetimini devralır.

### 3.13 Çağlar: Küresel ve Gezegenlerarası Genişleme
Sonsuz oyunun uzun vadeli ufku. Oyun, birbirini izleyen **çağlardan** oluşur;
her çağ yeni bir **dünya** (ayrı harita) ve yeni kurallar ekler. Önceki dünyalar
kapanmaz: hepsi aynı anda çalışmaya devam eder ve birbirine yük sağlar.

**Temel ilke: oyun her yerde kamyonculuktur.** Gemi, uçak ve uzay gemisi
**ana hat** rolündedir; kapıdan kapıya işin ilk ve son ayağı her zaman
karayoludur. Ana hatta oyuncu önce başka firmanın gemisinde/uçağında **yer
kiralar** (taşeron), sonra kendi filosunu kurar. Bu kalıp her çağda tekrar
eder: Ro-Ro → blok tren → konteyner gemisi → kargo uçağı → uzay çekicisi (tır mantığının
uzaydaki karşılığı: **çekici (itki modülü) + dorseler (kargo modülleri)**).

#### Çağlar
| Çağ | Kapsam | Yeni kural / mekanik | Açılma koşulu (öneri) |
|---|---|---|---|
| 1 | **Türkiye** | Temel oyun | Başlangıç |
| 2 | **Uluslararası karayolu**: Avrupa, Balkanlar, Kafkasya, Orta Doğu, Orta Asya | Gümrük, sınır kapısı kuyrukları, TIR karnesi/CMR, geçiş belgesi kotaları, ülke kuralları, döviz kuru, **Ro-Ro**, **blok tren** ve ilk **hava kargo** (yer kiralama) | Tır (sınıf 6) + firma seviyesi |
| 3 | **Kıtalar arası**: Asya, Afrika, Amerika, Okyanusya | **Konteyner gemisi**, **kargo uçağı** ve kıtalar arası demiryolu (Çin–Avrupa); kapıdan kapıya çok modlu işler; diğer kıtalarda yerel kara ağları ve şubeler; kendi gemi/uçak/tren filosu | Uluslararası şube ağı + liman/havalimanı terminali yatırımı |
| 4 | **Uzay üssü** (Dünya'da) | Roket kademesi taşıma: ağır nakliye, gemi ve uçağın en büyük işleri | Kıtalar arası ağ + “Uzay Üssü” mega sözleşmesi |
| 5 | **Ay** | 1/6 yerçekimi, vakum, 14 günlük gece, regolit tozu aşınması, **yolları oyuncu inşa eder** | Uzay üssü işleri + elektrikli/hidrojen teknolojisi |
| 6 | **Mars** | Toz fırtınaları, ince atmosfer, **4–24 dk iletişim gecikmesi → otonom araç zorunlu**, ~26 ayda bir fırlatma penceresi | Ay'da yerleşik şube + otonom teknolojisi |
| 7 | **Dış Güneş Sistemi** (asteroit kuşağı, Europa, Titan) | Yolsuz yüzeyler, buz kabuğu, metan gölleri (amfibi araçlar), kendi uzay çekicilerin | Mars ağı + uzay çekicisi teknolojisi |
| 8 | **Yıldızlararası** (prosedürel yıldız sistemleri) | **Solucan deliği kapıları** ağı; kapılar ana hat, gezegen yüzeyleri yine kamyon işi; tohumdan üretilen gezegenler | Füzyon itki + ilk kapı mega projesi |
| 9 | **Kara delik lojistiği** | **Zaman genişlemesi**, kara delik sapanı, olay ufku riski, kara delikten enerji (Penrose süreci) | Kapı ağı + kütle çekimi mühendisliği |
| 10 | **Megayapılar**: Dyson sürüsü, halka dünyalar | Yıldızın çevresindeki dev inşaatlara malzeme; halka dünyanın iç yüzeyinde binlerce km'lik otoyollar | Kara delik enerjisi |
| ∞ | **Paralel evrenler** (prosedürel) | Her evren farklı fizik sabitleriyle üretilir (yerçekimi, ışık hızı, zamanın akışı); evrenler arası nakliye | Boyut kapısı teknolojisi |

#### Taşıma modları
| Mod | Hız | Ton başı maliyet | Esneklik | Tipik yük | Açılış |
|---|---|---|---|---|---|
| Karayolu | Orta | Orta | Kapıdan kapıya | Her şey | Çağ 1 |
| Ro-Ro (tır gemide) | Orta | Orta–düşük | Tarifeli liman–liman | Dorse; şoförlü veya şoförsüz | Çağ 2 |
| Hava kargo | Çok hızlı (1–2 gün) | Çok yüksek | Tarifeli, ağırlık/hacim sınırlı | İlaç, elektronik, yedek parça, çiçek, acil işler | Çağ 2 (yer kiralama), Çağ 3 (kendi uçağı) |
| Konteyner gemisi | Çok yavaş (2–6 hafta) | Çok düşük | Tarifeli, liman beklemesi | 20'/40' konteyner, frigorifik konteyner | Çağ 3 |
| Demiryolu (blok tren) | Orta–yavaş | Düşük | Tarifeli terminal–terminal, hat kapasitesi sınırlı | Konteyner, maden, akaryakıt, otomotiv; Ro-La ile tır | Çağ 2 (yer kiralama), Çağ 3 (kendi treni) |
| Uzay ana hattı | Aylar | Aşırı yüksek | Fırlatma penceresine bağlı | Koloni ihtiyaçları, değerli madenler | Çağ 4+ |
| Solucan deliği kapısı | Anında (kuyruk hariç) | Kapı geçiş ücreti | Kapı kapasitesi ve slot | Her şey | Çağ 8 |
| Kara delik sapanı | Gemi için kısa, dış dünya için uzun | Değişken | Yörünge hesabına bağlı | “Geleceğe teslim” yükleri, enerji | Çağ 9 |

- **Çok modlu (intermodal) işler:** ör. Bursa'dan Şangay'a: kamyonla
  Gemlik limanına → konteyner gemisi → Şangay'da yerel kamyon. Oyuncu ayakları
  tek tek veya “kapıdan kapıya” paket olarak planlar; paket işler daha kârlıdır
  ama zinciri bozan her gecikme cezaya yol açar.
- **Ro-Ro'nun özel önemi:** şoförsüz dorse gönderme, sürüş süresi limitlerini
  ve sınır/vize kısıtlarını aşmanın yoludur; varış limanında yerel şube ya da
  ortak firma dorseyi teslim alır.
- **Tarifeler ve kesim saatleri (cut-off):** gemi ve uçak seferleri belirli
  gün ve saatlerde kalkar. Yükü kesim saatine yetiştirmek, uzaydaki fırlatma
  penceresinin küçük ölçekli provasıdır.
- **Hat (line) yönetimi:** kendi gemi ve uçaklarında oyuncu durakları ve
  sıklığı belirleyerek bir hat tanımlar; araçlar hat üzerinde otomatik
  döner. Doluluk oranı hattın kârlılığını belirler.
- **Hub yatırımları:** liman konteyner terminali, havalimanı kargo terminali,
  antrepo, gümrüklü depo; kendi hub'ı olan firma bekleme ve elleçleme
  maliyetinden kurtulur.

#### Demiryolu
- **Blok tren ve vagon kiralama:** önce demiryolu işletmesinden vagon veya
  tren slotu kiralanır; sonra kendi lokomotif ve vagonları alınır.
- **Hat kapasitesi:** demiryolu hatları paylaşımlıdır; günlük slot sayısı
  sınırlıdır, yoğun hatlarda slot pahalıdır.
- **Terminaller:** Halkalı, Köseköy, Kars gibi lojistik merkezlerinde
  kamyon ↔ tren aktarması; kendi terminalini kurmak elleçleme maliyetini düşürür.
- **Ray açıklığı değişimi:** Avrupa (1435 mm) ile Kafkasya/Orta Asya
  (1520 mm) arasında aktarma veya aks değişimi gerekir (Kars–Ahılkelek);
  zaman ve maliyet ekler.
- **Orta Koridor:** Kars–Tiflis–Bakü treni → Hazar feribotu → Orta Asya
  treni → Çin. Karayolu, demiryolu ve deniz modlarını birleştiren klasik
  çok modlu güzergâh.
- **Ro-La (yürüyen yol):** tırın kendisi trene yüklenir; şoför trende
  dinlenir, sürüş süresi limitine sayılmaz.

| Tren / vagon | Kapasite | Rol |
|---|---|---|
| Dizel ana hat lokomotifi | ~30–40 vagon çeker | Elektriksiz hatlar |
| Elektrikli lokomotif | ~40–50 vagon çeker | Elektrikli ana hatlar, düşük işletme maliyeti |
| Konteyner vagonu | 2 × 40' veya 3 × 20' | Çok modlu işler |
| Tanker / açık / kapalı vagon | Akaryakıt, maden, tahıl | Dökme yük sözleşmeleri |
| Ro-La vagonu | 1 tır | Dorse + çekici taşıma |

Demiryolu geç oyunda da sürer: hiper hızlı vakum tüp hatlar (Dünya),
Ay'da **elektromanyetik fırlatıcı** (kütle sürücüsü), Mars'ta maglev
hatları, halka dünyalarda kıtalar boyu tren ağları.

#### Uluslararası kurallar (Çağ 2–3)
- **Gümrük ve sınır kapıları:** Kapıkule, Sarp, Habur gibi kapılarda
  değişken kuyruk süreleri; gümrük beyannamesi, TIR karnesi, CMR belgesi.
- **Geçiş belgeleri:** bazı ülkelere yıllık sınırlı sayıda geçiş belgesi;
  kota yönetimi rota seçimini etkiler.
- **Ülke kuralları:** hafta sonu kamyon yasakları, farklı geçiş ücretleri
  ve yakıt fiyatları, düşük emisyon bölgeleri.
- **Şoför belgeleri:** vize ve uluslararası belge gereksinimi; yabancı
  şubelerde yerel şoför işe alma.
- **Döviz:** gelir ve gider farklı para birimlerinde olabilir (₺, €, $);
  kurlar döngüsel dalgalanır (sürekli enflasyon yok). Kur riskine karşı
  basit vadeli sözleşme seçeneği.

#### Gemi ve uçak sınıfları (taslak)
Hibrit stilin parçalı çizim sistemiyle çizilir (gövde + köprüüstü/kokpit +
yük düzeni + firma boyası).

| Gemi | Kapasite | Rol |
|---|---|---|
| Ro-Ro | ~200–300 dorse | Türkiye–Avrupa limanları |
| Feeder konteyner | 1.000–3.000 TEU | Bölgesel liman bağlantıları |
| Ana hat konteyner | 8.000–15.000 TEU | Kıtalar arası |
| Ultra büyük konteyner | 20.000+ TEU | Asya–Avrupa ana hattı |

| Uçak | Yük | Rol |
|---|---|---|
| Dönüştürülmüş dar gövde | ~20–25 t | Bölgesel ekspres |
| Orta geniş gövde | ~50–60 t | Kıtalar arası |
| Büyük geniş gövde | ~100–130 t | Ana hat, yüksek hacim |
| Süper ağır | ~120–150 t, gabari dışı | Türbin, uzay üssü parçaları |

Gemi, uçak ve tren ekipleri (kaptan/mürettebat, pilot/kokpit ekibi, makinist) şoförler gibi
işe alınır; ancak ayrıntı seviyesi daha düşüktür (ekip olarak yönetilir).

Çağ 8'den itibaren içerik **prosedüreldir**: yıldız sistemleri, gezegenler
ve son çağda evrenlerin kendisi tohumlu üreteçle oluşturulur; böylece içerik
gerçekten tükenmez.

#### Gezegene özgü kurallar (değiştiriciler)
Her dünya, çekirdek simülasyona bir **değiştirici seti** olarak eklenir; yeni
kod değil, çoğunlukla yeni veri:

| Değiştirici | Etkisi |
|---|---|
| Yerçekimi | Taşıma kapasitesi ↑, fren/tutuş ve devrilme riski |
| Atmosfer | Basınçlı kabin, içten yanmalı motor kullanılamaz |
| Gün uzunluğu | Güneş enerjili araçların gece duruşu, şoför vardiyaları |
| Sıcaklık | Akü verimi, frigorifik yerine “ısıtmalı” yük ihtiyacı |
| Yüzey | Yol yoksa düşük hız ve yüksek aşınma; yol inşası mümkün mü |
| İletişim gecikmesi | Uzaktan sürüş imkânsız → otonom araç gereksinimi |
| Tehlikeler | Toz fırtınası, meteor, radyasyon fırtınası, buz çatlağı, gelgit kuvvetleri, olay ufku |
| Zaman akışı | Kara delik yakınında zaman genişlemesi; paralel evrenlerde farklı zaman hızı |
| Fizik sabitleri | Yalnızca paralel evrenlerde: yerçekimi sabiti, ışık hızı, sürtünme |

#### Yeni mekanikler
- **Yol inşası:** Dünya'da yollar hazırdır; Ay'dan itibaren oyuncu (veya
  konsorsiyum ortaklarıyla) yol, şarj istasyonu ve depo inşa eder. Yol ağının
  kendisi stratejik bir yatırım olur.
- **Fırlatma pencereleri:** gezegenler basit dairesel yörüngelerde döner;
  ucuz transfer yalnızca belirli aralıklarla mümkündür (Mars ~26 ay).
  Pencere dışı fırlatma çok pahalıdır. Yükü pencereye yetiştirmek yeni tip
  bir teslim süresi baskısıdır.
- **Gezegenlerarası tedarik zincirleri:** koloniler Dünya'dan yüksek
  teknoloji, ilaç, gıda ister; Dünya'ya Ay helyum-3'ü, asteroit metalleri
  gibi değerli ürünler gelir. Kıtlık yüksek navlun demektir.
- **Taşeron → kendi filosu:** önce ana hat için başka firmanın gemisinden yer
  kiralanır (feribot gibi); sonra kendi uzay çekicileri ve kargo modülleri
  alınır.
- **Astronot şoförler:** yeni ehliyet/belge sınıfları (yüzey aracı, uzay
  çekicisi); eğitim akademisi yatırımının geç oyun karşılığı. Mars'ta
  şoförlerin yerini otonom araç operatörleri alır.
- **Dünya'nın önemi sürer:** uzay endüstrisi Dünya'da da yeni talep yaratır
  (roket parçaları, üs malzemesi); Dünya operasyonları bölge müdürleriyle
  otomatik yönetilir.

#### Ton: gerçekçiden bilimkurguya
Ton çağlar boyunca kademeli olarak değişir. Oyuncu, gerçekçi bir nakliye
firmasından başlayıp farkına varmadan evrenler arası bir lojistik devine
dönüşür.

| Çağlar | Ton | Bilim seviyesi |
|---|---|---|
| 1–4 | **Gerçekçi** | Bugünün teknolojisi, gerçek kurallar ve gerçek coğrafya |
| 5–6 (Ay, Mars) | **Yakın gelecek** | Bugünün uzay programlarının planları: yörünge pencereleri, iletişim gecikmesi, yaşam desteği |
| 7 (Dış Güneş Sistemi) | **Sert bilimkurgu** | Fiziğe aykırı olmayan ama henüz var olmayan teknolojiler: füzyon itki, uzay asansörü |
| 8–9 (Yıldızlararası, kara delikler) | **Bilimkurgu** | Spekülatif fizik: solucan delikleri, zaman genişlemesini iş modeline çevirmek |
| 10–∞ (Megayapılar, paralel evrenler) | **Tamamen bilimkurgu** | Dyson sürüleri, halka dünyalar, başka fizik kurallarıyla evrenler |

Bilimkurgu kısmı da mümkün olduğunca **gerçek fizik kavramlarından** beslenir
(zaman genişlemesi, Penrose süreci, gelgit kuvvetleri); oyuncu oynarken bir
şey de öğrenir.

**Kara delik lojistiği (Çağ 9) örnek mekanikleri:**
- **Zaman genişlemesi:** kara deliğe yakın yörüngeden geçen gemide birkaç
  gün geçerken dış evrende yıllar geçer. Bu, yeni bir iş türü yaratır:
  **“geleceğe teslim”** yükleri (zaman kapsülü kargo, uzun vadeli yatırım
  malları). Mürettebat az yaşlanır, ama döndüklerinde pazar değişmiştir.
- **Kara delik sapanı:** kütle çekimiyle hızlanıp yakıtsız uzak sistemlere
  fırlatma; yörünge hesabı hatalıysa yük kaybedilir.
- **Penrose süreci:** dönen kara delikten enerji çekmek; megayapı çağının
  enerji kaynağı ve en pahalı yatırım.
- **Olay ufku riski:** gelgit kuvvetleri ve dönüşü olmayan sınır; sigorta
  primleri astronomik.

Samimi, yerel hava hiç kaybolmaz: koloni adları (“Yeni Kayseri”, “Ay Ankara
Lojistik Merkezi”), Mars kamyonlarının arkasında “Ana duası — 225 milyon km”,
kara delik gemisinde “Olay ufkunda sollama yapılmaz”.

**Görsel karşılığı:** hibrit stil korunur, ama palet ve arayüz ayrıntıları
çağla birlikte değişir. Dünya'da otoyol tabelası yeşili ve sarısı, uzayda
daha soğuk tonlar ve ışıma efektleri, kara delik çağında kütleçekimsel
mercek gibi WebGL efektleri.

#### Araçlar
Hibrit stilin parçalı çizim sistemi doğrudan genişler: basınçlı kabin,
tel örgü tekerler, güneş paneli, RTG, palet, amfibi gövde gibi yeni parçalar.
Uzay araç sınıfları her dünyanın kendi sınıf tablosuyla tanımlanır
(ör. Ay: hafif rover → basınçlı kamyon → regolit damperi → modül taşıyıcı).

#### Tempo hedefi (gerçek oyun saati, ayarlanacak)
| Hedef | Yaklaşık süre |
|---|---|
| İlk tır | 5–10 saat |
| Uluslararası karayolu | 10–20 saat |
| Kıtalar arası (gemi + uçak) | 25–40 saat |
| Uzay üssü çağı | 45–60 saat |
| Ay | 60–80 saat |
| Mars | 100–140 saat |
| Yıldızlararası (solucan delikleri) | 180–250 saat |
| Kara delik lojistiği | 250–350 saat |
| Megayapılar ve paralel evrenler | 350+ saat |

> Not: 1× hızda “1 sn = 1 oyun dakikası” ile bir oyun yılı ~146 gerçek saat
> eder; teknoloji takvimi (yıllar) bu tempoya uymaz. Saat kalibrasyonu ve
> teknoloji takvimi Faz 1 denge testlerinde birlikte ayarlanacak (ör.
> 1 sn = 5 oyun dakikası veya teknoloji ilerlemesini takvim yerine firma
> gelişimine bağlamak).

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
// Çok dünyalı yapı: şehir/yol/ilan/sefer her zaman bir dünyaya aittir.
// Faz 1'de tek dünya ('tr') olsa da model baştan böyle kurulur.
interface World  { id: string; name: string; era: number; modifiers: WorldModifiers;
                   cities: City[]; roads: Road[]; generatorSeed?: number; }
interface WorldModifiers { gravity: number; atmosphere: 'yok' | 'ince' | 'normal' | 'yoğun';
                   dayLengthH: number; tempC: number; commsDelayMin: number;
                   hazards: HazardId[]; roadsPrebuilt: boolean;
                   timeRate?: number;              // dış evrene göre zaman akışı (1 = normal)
                   physics?: PhysicsConstants; }   // yalnızca paralel evrenler
// Tarifeli ana hat: Ro-Ro, tren, konteyner gemisi, hava kargo, uzay, solucan
// deliği ve kara delik aynı modelle. Düğümler liman/terminal/havalimanı/üs/kapı
// olabilir; dünyalar arası da olabilir.
interface ScheduledLink { id: string;
                   mode: 'roro' | 'demiryolu' | 'konteyner' | 'hava' | 'uzay' | 'solucan' | 'karadelik';
                   from: NodeRef; to: NodeRef; operator: 'taşeron' | 'oyuncu';
                   periodDays: number;   // sefer sıklığı veya fırlatma penceresi döngüsü
                   windowDays: number;   // kalkış penceresi (gemi/uçak için ~0)
                   cutoffHours: number; transitDays: number;
                   properTimeDays?: number; // aracın/mürettebatın yaşadığı süre (zaman genişlemesi)
                   capacity: number; costPerUnit: number; vehicleIds?: string[]; }
interface Region { id: string; worldId: string; name: string; era: number;
                   currency: 'TRY' | 'EUR' | 'USD' | string; rules: CountryRules; }
interface GameState { time: number; seed: number; money: number; reputation: number;
                      worlds: World[]; regions: Region[]; links: ScheduledLink[];
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

### Faz 7 — Uluslararası Karayolu
- Bölge (ülke) modeli, Avrupa/Balkanlar/Kafkasya/Orta Doğu/Orta Asya
  haritaları; dünya ölçeğinde harita yakınlaştırma.
- Gümrük, sınır kuyrukları, belgeler, geçiş belgesi kotaları, ülke kuralları.
- Döviz ve kur dalgalanması; yabancı şubeler.
- Ro-Ro hatları (yer kiralama), hava kargoda yer kiralama.
- Demiryolu: vagon/slot kiralama, terminaller, Ro-La, ray açıklığı değişimi.

### Faz 8 — Kıtalar Arası: Gemi, Uçak ve Tren
- Tarifeli ana hat modeli (`ScheduledLink`), çok modlu kapıdan kapıya işler.
- Konteyner sistemi (20'/40', frigorifik).
- Kendi gemi, uçak ve tren filosu, hat yönetimi, ekipler.
- Orta Koridor ve Çin–Avrupa demiryolu güzergâhları.
- Liman/havalimanı terminali ve gümrüklü depo yatırımları.
- Diğer kıtaların yerel kara ağları.
- Olaylar: kanal tıkanması, liman grevi, fırtına, hava sahası kapanması.

### Faz 9 — Uzay Çağı I: Uzay Üssü ve Ay
- Çok dünyalı harita geçişi (dünya seçici, her dünyanın kendi haritası).
- Uzay üssü mega sözleşmesi; ağır nakliye, gemi ve süper ağır uçakla
  roket kademeleri.
- Ay: değiştiriciler, yol/şarj istasyonu inşası, Ay araç sınıfları.
- Uzay ana hattı: taşeron gemide yer kiralama.

### Faz 10 — Uzay Çağı II: Mars ve Ötesi
- Fırlatma pencereleri ve yörünge modeli.
- Mars: toz fırtınaları, iletişim gecikmesi, otonom zorunluluğu.
- Kendi uzay çekicileri + kargo modülleri; gezegenlerarası tedarik zincirleri.
- Dış Güneş Sistemi dünyaları.
- Performans: çok dünyalı simülasyon için profil ölçümü; gerekirse
  sıcak noktaların Rust/WebAssembly'ye taşınması (bkz. 5.3).

### Faz 11 — Yıldızlararası
- Füzyon itki, solucan deliği kapı ağı, kapı slotları ve geçiş ücretleri.
- Prosedürel yıldız sistemi ve ötegezegen üreteci (tohumlu): yüzey,
  koloni yerleşimi, kaynaklar, değiştiriciler.

### Faz 12 — Kara Delik Lojistiği
- Zaman genişlemesi (`properTimeDays`), “geleceğe teslim” iş türü,
  kara delik sapanı, Penrose enerjisi, olay ufku riski.
- Kütleçekimsel mercek gibi WebGL efektleri.

### Faz 13 — Megayapılar ve Paralel Evrenler
- Dyson sürüsü ve halka dünya inşaat zincirleri; halka dünya haritaları.
- Fizik sabitleri farklı prosedürel evrenler; evrenler arası nakliye.
- Tüm çağları kapsayan 50+ oyun yılı bot denge testleri.

### İleride (fikir havuzu)
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
| Görsel stil | Hibrit: sade vektör harita + parçalı yan görünüm araç çizimleri |
| Uzun vadeli kapsam | Çağlar: Türkiye → uluslararası karayolu → kıtalar arası → uzay üssü → Ay → Mars → dış Güneş Sistemi → yıldızlararası → kara delikler → megayapılar → paralel evrenler |
| Taşıma modları | Karayolu, Ro-Ro, demiryolu, hava kargo, konteyner gemisi, uzay, solucan deliği, kara delik; önce yer kiralama, sonra kendi filosu |
| Ton | Başta gerçekçi; Ay/Mars yakın gelecek; sonra kademeli olarak tamamen bilimkurgu |
| Veri modeli | Baştan çok dünyalı (`World`), Faz 1'de tek dünya |

## 9. Açık Sorular

1. **Yalnız Dünya modu:** Uzayı hiç açmak istemeyen oyuncular için uzay
   çağlarını kapatan bir seçenek olsun mu?
2. **Hikâye:** Çağ geçişleri yalnızca mekanik mi kalsın, yoksa her geçişte
   kısa bir anlatı olsun mu (ör. ilk uzay sözleşmesini getiren gizemli müşteri)?
3. **Oyuncu rolü:** Oyuncu başta kendisi de şoför mü (ilk kamyoneti kendisi
   sürer), yoksa doğrudan yönetici mi?
4. **Gerçekçilik seviyesi:** Sürüş süresi kuralları, vergi vb. ne kadar
   ayrıntılı olmalı?
5. **Dil:** Arayüz yalnızca Türkçe mi, yoksa Türkçe + İngilizce mi?
