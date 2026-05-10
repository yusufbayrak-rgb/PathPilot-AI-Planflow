package com.planflow.ai.network

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {
    // Android emulatorden locale erismek icin genellikle 10.0.2.2 kullanilir.
    // Gercek cihaz ise bilgisayarin yerel IP adresi yazilmalidir (ornegin: http://192.168.1.100:8000/).
    private const val BASE_URL = "http://10.0.2.2:8000/"

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
