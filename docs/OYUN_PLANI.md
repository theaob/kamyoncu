# Kamyoncu — Oyun Planı

> Kamyon yönetimi simülasyonu. Bu belge oyunun tasarımını, teknik mimarisini ve
> geliştirme yol haritasını tanımlar. Yaşayan bir belgedir; kararlar netleştikçe
> güncellenir.

---

## 1. Vizyon

Oyuncu, tek bir ikinci el kamyon ve birikmiş az bir sermayeyle Türkiye'de bir
nakliye şirketi kurar. Yük ilanlarından iş alır, şoför işe alır, filosunu ve
şube ağını büyütür; yakıt fiyatları, bakım masrafları, teslim süreleri ve
müşteri itibarı arasında denge kurarak ülkenin en büyük lojistik firmasına
dönüşmeye çalışır.

- **Tür:** Tycoon / yönetim simülasyonu (sürüş simülasyonu **değil**).
- **Bakış:** Üstten harita + yönetim panelleri.
- **Platform:** Tarayıcı (masaüstü öncelikli, mobilde oynanabilir).
- **Oturum süresi:** 15–60 dk; kayıt/yükleme ile uzun kariyer.
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

### 3.2 Kamyonlar (Çekiciler)
| Özellik | Açıklama |
|---|---|
| Model / marka sınıfı | Kurgusal markalar (lisans sorunu olmaması için) |
| Fiyat | Sıfır / ikinci el pazarı |
| Yakıt tüketimi | L/100 km, yük oranıyla artar |
| Güvenilirlik | Arıza olasılığını etkiler |
| Durum (%) | Kilometreyle düşer; bakımla yükselir |
| Kilometre / yaş | İkinci el değerini ve arıza riskini etkiler |
| Emisyon sınıfı | İleride: bazı şehir/ihale kısıtları |

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
- Oyun içi saat; hız: **Duraklat / 1× / 2× / 4× / 8×**.
- 1× hızda 1 gerçek saniye ≈ 1 oyun dakikası (ayarlanacak).
- Sabit adımlı (fixed timestep) simülasyon — kare hızından bağımsız.
- Önemli olaylarda otomatik duraklatma (ayarlanabilir).

### 3.11 İlerleme ve Hedefler
- Firma seviyesi (toplam teslimat/ciro) yeni dorse türlerini, şehirleri,
  sözleşmeleri açar.
- Başarımlar / görevler: “İlk 10 teslimat”, “5 kamyonluk filo”,
  “Soğuk zincirde 50 hatasız teslimat”.
- **Senaryo modu (ileride):** belirli koşullarla hedef (ör. 2 yılda 1M ₺ net
  değer).
- **Serbest mod:** sonsuz kariyer.
- Kaybetme koşulu: iflas (uzun süre negatif nakit + kredi temerrüdü).

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

---

## 5. Teknik Mimari

### 5.1 Teknoloji yığını (öneri)
| Katman | Seçim | Gerekçe |
|---|---|---|
| Dil | **TypeScript** | Tip güvenliği; simülasyon modelleri için ideal |
| Derleme | **Vite** | Hızlı geliştirme sunucusu, basit kurulum |
| UI | **React** | Çok sayıda panel/tablo içeren yönetim arayüzü |
| Harita | **SVG** (başta), gerekirse **PixiJS/Canvas** | Basit başla, performans gerekirse geç |
| Durum yönetimi | **Zustand** | Hafif; simülasyon çekirdeğini sarmalar |
| Test | **Vitest** | Simülasyon çekirdeği için birim testleri |
| Kayıt | **localStorage / IndexedDB** + JSON dışa aktarma | Sunucu gerektirmez |

### 5.2 Mimari ilke: Simülasyon çekirdeği UI'dan bağımsız
```
┌──────────────────────────────────────────────┐
│ UI (React)  — paneller, harita, girdiler      │
└───────────────▲──────────────────┬───────────┘
                │ durum okur        │ komut gönderir
┌───────────────┴──────────────────▼───────────┐
│ Oyun köprüsü (store) — tick döngüsü, hız      │
└───────────────▲──────────────────┬───────────┘
                │                  │
┌───────────────┴──────────────────▼───────────┐
│ Simülasyon çekirdeği (saf TypeScript)         │
│  - deterministik (tohumlu RNG)                │
│  - step(state, dt) → state + olaylar          │
│  - komutlar: acceptJob, assignTruck, buy…     │
└──────────────────────────────────────────────┘
                ▲
       Statik veri (JSON): şehirler, yollar,
       kamyon modelleri, yük türleri
```
- Çekirdek DOM/React bilmez → kolay test, ileride Web Worker'a taşınabilir,
  kayıt dosyası sadece serileştirilmiş `GameState`'tir.
- Tohumlu (seeded) RNG → hatalar tekrarlanabilir, testler deterministik.
- Tüm denge değerleri tek bir `balance` yapılandırmasında.

### 5.3 Klasör yapısı (taslak)
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
│  │  ├─ rng.ts
│  │  └─ balance.ts      # denge sabitleri
│  ├─ data/              # cities.json, roads.json, trucks.json, cargo.json
│  ├─ store/             # Zustand köprüsü
│  ├─ ui/                # React bileşenleri (map, panels, …)
│  └─ main.tsx
├─ tests/
└─ package.json
```

### 5.4 Temel veri modelleri (taslak)
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
- Boş harita ekranı, oyun saati ve hız kontrolü.

### Faz 1 — Oynanabilir MVP 🎯
- 15 şehir + yol ağı, rota bulma.
- 1 kamyon, 1 şoför (oyuncunun kendisi), tek dorse türü (tenteli).
- Yük borsası → kabul et → kamyon haritada ilerler → teslim → para.
- Yakıt ve otoyol gideri, basit gelir-gider dökümü.
- Kayıt/yükleme.
- **Başarı ölçütü:** 10 dakika oynanınca “bir sefer daha” hissi.

### Faz 2 — Filo ve Şoförler
- Kamyon pazarı (sıfır/ikinci el), birden fazla kamyon.
- Şoför işe alma, maaş, sürüş süresi/mola kuralları, yorgunluk.
- Dorse türleri (frigorifik, tanker, lowbed).
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
- Dispeçer: kurallara göre otomatik iş atama.
- İhaleler, 81 ile genişleme.
- Başarımlar, senaryo modu.

### Faz 6 — Cila
- Ses/müzik, animasyonlar, eğitim (tutorial), mobil uyumluluk, denge ayarı.

### İleride (fikir havuzu)
- Uluslararası seferler (Avrupa, Orta Doğu) — gümrük, vize, döviz.
- Rakip firmalar (yapay zekâ).
- Çok oyunculu ortak pazar.

---

## 7. Denge Hedefleri (ilk tahminler)

| Değer | Başlangıç tahmini |
|---|---|
| Başlangıç sermayesi | 250.000 ₺ + ikinci el kamyon |
| İkinci el kamyon | 1,5 – 3 M₺ |
| Sıfır kamyon | 4 – 6 M₺ |
| Motorin | ~45 ₺/L (dalgalanır) |
| Ortalama tüketim | 28–35 L/100 km |
| Yük ödemesi | ~25–60 ₺/km (yük türüne göre) |
| Şoför maaşı | 50.000 – 90.000 ₺/ay |
| İlk ek kamyona ulaşma | ~1–2 saat oynanış |

> Tüm değerler `balance.ts` içinde tutulacak ve oyun testleriyle ayarlanacak.

---

## 8. Açık Sorular

1. **Platform:** Tarayıcı tabanlı TypeScript yığını uygun mu, yoksa Unity /
   Godot gibi bir oyun motoru mu tercih edilir?
2. **Görsel stil:** Sade/minimal vektör harita mı, yoksa daha detaylı,
   piksel-art / illüstrasyon tarzı mı?
3. **Kapsam:** Yalnızca Türkiye mi, yoksa ileride uluslararası mı?
4. **Oyuncu rolü:** Oyuncu başta kendisi de şoför mü (ilk kamyonu kendisi
   sürer), yoksa doğrudan yönetici mi?
5. **Gerçekçilik seviyesi:** Sürüş süresi kuralları, vergi vb. ne kadar
   ayrıntılı olmalı?
6. **Dil:** Arayüz yalnızca Türkçe mi, yoksa Türkçe + İngilizce mi?
