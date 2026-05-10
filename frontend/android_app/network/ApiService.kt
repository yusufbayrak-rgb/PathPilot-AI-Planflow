package com.planflow.ai.network

import com.planflow.ai.models.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface ApiService {
    @POST("generate-roadmap")
    suspend fun generateRoadmap(@Body request: RoadmapRequest): Response<RoadmapResponse>

    @POST("analyze-progress")
    suspend fun analyzeProgress(@Body request: ProgressRequest): Response<ProgressResponse>
}
