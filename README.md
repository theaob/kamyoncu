# Kamyoncu

Kamyon yönetimi simülasyonu oyunu. Tarayıcıda çalışır; TypeScript, React ve PixiJS (WebGL).

- [Oyun Planı](docs/OYUN_PLANI.md)
- [Görsel stil önerileri](docs/gorsel-stil.html)
- [Yayınlama: CI/CD, itch.io, Android](docs/YAYINLAMA.md)

## Geliştirme

Node.js 22 gerekir.

```sh
npm install
npm run dev          # geliştirme sunucusu (http://localhost:5173)
npm test             # birim testleri (Vitest)
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier
npm run build        # üretim derlemesi (dist/)
npx cap sync android # web derlemesini Android projesine kopyalar
```

## Yapı

```
src/
├─ core/      Simülasyon çekirdeği: saf TypeScript, arayüzden bağımsız, deterministik
├─ data/      Statik dünya verisi (şehirler, yollar, kıyı çizgisi)
├─ worker/    Simülasyonu çalıştıran Web Worker ve mesaj protokolü
├─ store/     Zustand köprüsü (worker ↔ arayüz)
├─ map/       PixiJS harita: kamera, katmanlar
├─ ui/        React bileşenleri
├─ i18n/      Çoklu dil altyapısı ve biçimlendirme
└─ locales/   tr.json, en.json
tests/        Vitest testleri
android/      Capacitor Android projesi (APK)
```

Kurallar:

- `src/core` React, PixiJS veya tarayıcı API'si kullanmaz (ESLint ile denetlenir).
- Çekirdek metin üretmez; olayları kod + parametre olarak yayınlar. Tüm metinler
  `src/locales` altındadır ve her iki dilde de bulunmalıdır (test ile denetlenir).
- Denge değerleri `src/core/balance.ts` içindedir.

## Kısayollar

- Boşluk: duraklat / devam
- 1–5: hız (1×, 2×, 4×, 8×, 16×)
- Fare tekerleği veya iki parmak: yakınlaştır; sürükle: kaydır
