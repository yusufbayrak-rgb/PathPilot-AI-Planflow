@echo off
echo DeepStep AI FastAPI Sunucusu Baslatiliyor...
echo Sunucu calisirken pencereyi kapatmayin.
echo Tarayicinizda http://127.0.0.1:8000 adresine giderek API'ye erisebilirsiniz.
echo Swagger UI (API Dokumantasyonu) icin: http://127.0.0.1:8000/docs
echo.

uvicorn main:app --reload

pause
