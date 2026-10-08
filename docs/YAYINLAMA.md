# Yayınlama (CI/CD)

`.github/workflows/ci.yml` her gönderimde şunları yapar:

| İş | Ne zaman | Çıktı |
|---|---|---|
| Kontrol | Her gönderim ve PR | Lint, biçim, tip denetimi, testler |
| Web derlemesi | Her gönderim ve PR | `kamyoncu-web` (Actions çıktısı) |
| Android APK | Her gönderim ve PR | `kamyoncu-android` (Actions çıktısı) |
| itch.io'ya yayın | `main` dalına gönderim, `v*` etiketi veya elle tetikleme | itch.io'da `html5` ve `android` kanalları |
| GitHub Release | `v*` etiketi | Web zip + APK |

**Sürüm numarası:** etiketlerde etiketin kendisi (`v0.2.0` → `0.2.0`), diğer
derlemelerde `package.json` sürümü + çalıştırma numarası (`0.1.0-build.42`).
Android `versionCode` her zaman çalıştırma numarasıdır, böylece her yeni APK
eskisinin üzerine kurulabilir. Sürüm, oyunda logonun üzerine gelince görünür.

## 1. itch.io kurulumu (bir kez)

1. itch.io'da yeni bir proje oluştur (Dashboard → Create new project).
   - **Kind of project:** HTML
   - Proje adresindeki kısa adı not et (ör. `theaob.itch.io/kamyoncu` → `kamyoncu`).
   - Şimdilik **Draft** olarak kaydet.
2. API anahtarı al: itch.io → Settings → API keys → **Generate new API key**.
3. GitHub deposunda: Settings → Secrets and variables → Actions → **Secrets** sekmesi:
   - `BUTLER_API_KEY` = API anahtarı
   - `ITCH_GAME` = `kullaniciadi/oyun-kisa-adi` (ör. `theaob/kamyoncu`)
4. İlk yayından sonra itch.io proje sayfasında:
   - `html5` dosyasının yanında **This file will be played in the browser** işaretle.
   - Embed options: **Viewport 1280 × 720**, **Fullscreen button** açık,
     **Mobile friendly** açık (yön: yatay ve dikey).
   - `android` dosyasının platformunu **Android** olarak işaretle.
   - Hazır olunca sayfayı **Public** yap.

Sonraki her yayın aynı kanallara yeni sürüm olarak eklenir; itch.io sayfa
ayarlarını korur.

## 2. Android imzalama (önerilir)

Anahtar tanımlı değilse CI **debug imzalı** bir APK üretir. Bu APK telefona
kurulabilir, ama her CI çalıştırıcısında farklı bir debug anahtarıyla imzalandığı
için bir sürümün üzerine diğeri kurulamaz (önce eskisini kaldırmak gerekir).
Kalıcı bir anahtarla imzalamak için:

```sh
keytool -genkeypair -v -keystore kamyoncu.keystore -alias kamyoncu \
  -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 kamyoncu.keystore > kamyoncu.keystore.b64
```

GitHub → Settings → Secrets and variables → Actions → **Secrets**:

| Sır | Değer |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `kamyoncu.keystore.b64` dosyasının içeriği |
| `ANDROID_KEYSTORE_PASSWORD` | Anahtar deposu parolası |
| `ANDROID_KEY_ALIAS` | `kamyoncu` |
| `ANDROID_KEY_PASSWORD` | Anahtar parolası |

> Anahtar deposunu ve parolaları güvenli bir yerde yedekle. Kaybedilirse aynı
> uygulamanın güncellemeleri artık imzalanamaz. Anahtar dosyasını depoya ekleme.

## 3. Yayın yapmak

- **Sürekli yayın:** `main` dalına birleştirilen her değişiklik itch.io'ya gider.
- **Sürüm yayını:** `package.json` sürümünü artır, sonra etiketle:
  ```sh
  git tag v0.2.0 && git push origin v0.2.0
  ```
  itch.io'ya yayınlanır ve APK ile web zip'i içeren bir GitHub Release oluşur.
- **Elle:** GitHub → Actions → CI/CD → **Run workflow** → dalı seç,
  "itch.io'ya yayınla" kutusunu işaretle.

## Yerelde Android

Android Studio ve Android SDK gerekir.

```sh
npm run build
npx cap sync android
npx cap open android     # Android Studio'da açar
# veya doğrudan:
cd android && ./gradlew assembleDebug
```

## Notlar

- Vite `base: './'` ile derlenir; oyun itch.io'nun alt dizininde ve Android
  WebView'da çalışır.
- Yazı tipleri pakete gömülüdür (`@fontsource`); oyun çevrimdışı çalışır.
- Android uygulama simgesi ve açılış ekranı şimdilik Capacitor varsayılanıdır.
