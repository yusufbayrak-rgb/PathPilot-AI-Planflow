# DeepStep AI

DeepStep AI, kullanıcıların büyük hedeflerini otonom olarak eyleme dönüştürülebilir mikro görevlere bölen ve bu görevlerdeki ilerlemeyi NLP (Doğal Dil İşleme) kullanarak analiz eden akıllı bir planlama ve oyunlaştırma (Focus Coin) uygulamasıdır. 36 saatlik bir hackathon MVP'si olarak geliştirilmiştir.

## Proje Mimarisi

- **Backend:** Python, FastAPI, Pydantic, OpenAI/Gemini API (LLM Entegrasyonu)
- **Frontend:** Kotlin, Jetpack Compose, MVVM, Retrofit

## Klasör Yapısı

- `backend/`: FastAPI sunucusu, endpointler ve prompt mühendisliği mantığı.
- `frontend/android_app/`: Android Jetpack Compose arayüzleri ve API bağlantıları.

---

## 🛠 Kurulum ve Çalıştırma

### 1. Backend (Python/FastAPI) Kurulumu

Eğer Windows kullanıyorsanız, `backend` klasöründeki otomatik kurulum ve çalıştırma scriptlerini kullanabilirsiniz:

**Otomatik Kurulum (Windows):**
1. `backend/setup.bat` dosyasına çift tıklayarak gerekli Python kütüphanelerini kurabilirsiniz.
2. `backend/.env` dosyasını bir metin editörü ile açın ve içerisine kendi API anahtarınızı ekleyin (`OPENAI_API_KEY` veya `GEMINI_API_KEY`).
3. `backend/run.bat` dosyasına çift tıklayarak yerel sunucuyu (`http://localhost:8000`) başlatabilirsiniz.

**Manuel Kurulum (Tüm İşletim Sistemleri):**
```bash
cd backend
pip install -r requirements.txt

# API anahtarınızı .env dosyasına ekledikten sonra:
uvicorn main:app --reload
```

### 2. Frontend (Android/Kotlin) Kurulumu

1. **Android Studio**'yu açın ve yeni bir **Empty Activity (Jetpack Compose)** projesi oluşturun.
2. `frontend/android_app/` dizinindeki tüm `.kt` dosyalarını kendi projenizin paket dizinine (`app/src/main/java/com/sizin_paket_isminiz/`) kopyalayın.
3. Kopyaladığınız dosyalardaki `package com.planflow.ai...` olan ilk satırları kendi paket isminize göre güncelleyin.
4. `AndroidManifest.xml` dosyanızda internet izninin olduğundan emin olun:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```
5. `app/build.gradle.kts` (veya `build.gradle`) dosyanıza gerekli bağımlılıkları ekleyin:
   ```kotlin
   dependencies {
       // Retrofit & Gson
       implementation("com.squareup.retrofit2:retrofit:2.9.0")
       implementation("com.squareup.retrofit2:converter-gson:2.9.0")
       
       // ViewModel Compose
       implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2")
   }
   ```
6. (Opsiyonel) Eğer uygulamanızı gerçek bir telefon yerine Android Studio emülatöründe test edecekseniz, Retrofit base URL değeri `http://10.0.2.2:8000/` olarak bırakılabilir. Eğer fiziksel bir cihazda test edecekseniz, `RetrofitClient.kt` içindeki IP adresini bilgisayarınızın yerel IP'si (örn: `http://192.168.1.55:8000/`) ile değiştirmeniz gerekir.
7. Uygulamayı derleyin (Run) ve emülatörde başlatın.

---

## 🎯 Temel Özellikler
- **AI Yol Haritası:** Kullanıcı hedefini, süresini, günlük ayıracağı vakti ve seviyesini girer. LLM, hedefi aşamalara ve coin ödüllü mikro görevlere böler.
- **Akıllı Günlük (NLP Logger):** Görevin tamamlanma durumu bir "Check-box" yerine, kullanıcının girdiği "Bugün X konusunu çalıştım..." gibi serbest bir metinle LLM tarafından analiz edilir. İlerleme yüzdesi, durum (tamamlandı/kısmi) ve geri bildirim hesaplanır.
- **Oyunlaştırma:** Başarıyla analiz edilip "tamamlandı" sayılan görevlerden kullanıcı "Focus Coin" kazanır.

**Hackathon'da başarılar!**
