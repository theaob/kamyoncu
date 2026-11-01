# Google Play Games Services

Android uygulaması Play Games Services v2 ile oturum açar, başarımları açar ve iki
skor tablosuna skor gönderir. Web sürümü bundan etkilenmez.

**Kimlikler tanımlanana kadar hiçbir şey olmaz:**
`android/app/src/main/res/values/games-ids.xml` içindeki `app_id` boşsa SDK
başlatılmaz, menüde Play Games satırı görünmez. Bir başarımın ya da tablonun
kimliği boşsa yalnızca o gönderim atlanır.

| Parça | Dosya |
|---|---|
| Kurallar (ne zaman kazanılır, hangi skor) | `src/platform/playProgress.ts` |
| JS köprüsü, gönderim sıklığı | `src/platform/playGames.ts` |
| Menü satırı (oturum aç / başarımlar / tablolar) | `src/ui/PlayGamesMenu.tsx` |
| Yerel eklenti | `android/app/src/main/java/io/github/theaob/kamyoncu/PlayGamesPlugin.java` |
| Kimlikler | `android/app/src/main/res/values/games-ids.xml` |

## Play Console kurulumu (bir kez)

1. **Play Console → Kamyoncu → Büyüme → Play Games Services → Kurulum ve yönetim →
   Yapılandırma.** "Hayır, oyunum Google API'lerini kullanmıyor" seçip yeni bir Play
   Games projesi oluştur (bir Google Cloud projesi de açılır).
2. **Kimlik bilgileri (Credentials) → Kimlik bilgisi ekle → Android.**
   - Paket adı: `io.github.theaob.kamyoncu`
   - OAuth istemcisi oluşturmak için Google Cloud'a yönlendirir. SHA-1 olarak
     **uygulama imzalama anahtarının** SHA-1'ini ver: Play Console → Test ve yayın →
     Uygulama bütünlüğü → Play uygulama imzalama. (CI'daki anahtar yalnızca yükleme
     anahtarıdır; Play'den kurulan uygulama Google'ın anahtarıyla imzalanır.)
   - CI'dan indirilen APK'yı doğrudan kurup denemek istersen yükleme anahtarının
     SHA-1'iyle ikinci bir Android kimlik bilgisi ekle (aynı sayfada "Yükleme
     anahtarı sertifikası").
   - OAuth izin ekranı (consent screen) sorulursa: uygulama adı Kamyoncu, destek
     e-postası, yayın durumu **Test**; aşağıdaki test kullanıcılarını ekle.
3. **Başarımlar** — aşağıdaki altısını oluştur (sıra ve puanlar öneri; ad/açıklama
   TR ve EN):

   | Anahtar | Koşul | Öneri ad (TR / EN) | Puan |
   |---|---|---|---|
   | `first_delivery` | İlk teslimat | İlk Sefer / First Haul | 5 |
   | `deliveries_100` | 100 teslimat | Yüz Sefer / Hundred Hauls | 20 |
   | `first_hire` | İlk şoförü işe al | İlk Şoför / First Hire | 5 |
   | `fleet_5` | Filoda 5 araç | Filo Sahibi / Fleet Owner | 15 |
   | `fleet_manager` | Filo müdürü işe al | Patron / The Boss | 10 |
   | `millionaire` | Kasada 1.000.000 ₺ | Milyoner / Millionaire | 30 |

   Her başarıma 512×512 bir simge gerekir (yoksa Play Console varsayılanı kullanır).
4. **Skor tabloları:**

   | Anahtar | Değer | Biçim | Sıralama |
   |---|---|---|---|
   | `career_revenue` | Kariyer navlun geliri | Para birimi (Currency), **2 ondalık**, TRY | Büyük daha iyi |
   | `deliveries` | Toplam teslimat | Sayı (Numeric), 0 ondalık | Büyük daha iyi |

   Gelir kuruş olarak gönderilir; 2 ondalık bu yüzden.
5. **Test kullanıcıları:** Kurulum ve yönetim → Test kullanıcıları. Yayınlanmamış
   bir Play Games projesinde yalnızca bunlar oturum açabilir. Kapalı test
   kanalındaki test kullanıcılarını buraya da ekle.
6. **Kaynakları al (Get resources)** — Başarımlar sayfasındaki düğme bir XML verir.
   İçindeki `app_id`, `achievement_*` ve `leaderboard_*` değerlerini
   `games-ids.xml`'deki aynı adlı satırlara kopyala. Play Console adları başarımın
   İngilizce adından üretir; adlar farklı çıkarsa değerleri yukarıdaki anahtarlara
   göre eşle (`package_name` satırını alma). Değerler gizli değildir, depoya girebilir.
7. Değişikliği gönder; CI'ın ürettiği AAB'yi kapalı teste yükle.
8. Her şey çalışınca Play Games projesini **Yayınla** (Kurulum ve yönetim →
   Yayınla). Yayınlanmadan yalnızca test kullanıcıları oturum açabilir.

## Veri güvenliği formu

Play Games kullanınca Play Console → Uygulama içeriği → Veri güvenliği yanıtları
güncellenmeli: oyun içi ilerleme (başarımlar, skorlar) Google'a gönderilir.
Hangi kutuların işaretleneceğini Play Games Services belgelerindeki
"Data safety" bölümü anlatır (developer.android.com/games/pgs).

Gizlilik politikası (`public/privacy.html`) buna göre güncellendi.

## Yeni başarım eklemek

1. `src/platform/playProgress.ts` → `ACHIEVEMENTS` listesine anahtar, `RULES`'a koşul.
2. `games-ids.xml`'e `achievement_<anahtar>` satırı (test bunu denetler).
3. Play Console'da başarımı oluşturup kimliği o satıra yaz.
