package com.planflow.ai.viewmodel

import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.planflow.ai.models.*
import com.planflow.ai.network.RetrofitClient
import kotlinx.coroutines.launch

class DeepStepViewModel : ViewModel() {

    private val _roadmapState = mutableStateOf<RoadmapResponse?>(null)
    val roadmapState: State<RoadmapResponse?> = _roadmapState

    private val _isLoading = mutableStateOf(false)
    val isLoading: State<Boolean> = _isLoading

    private val _focusCoins = mutableStateOf(0)
    val focusCoins: State<Int> = _focusCoins

    private val _progressResult = mutableStateOf<ProgressResponse?>(null)
    val progressResult: State<ProgressResponse?> = _progressResult

    fun generateRoadmap(target: String, duration: Int, dailyTime: Int, level: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val request = RoadmapRequest(target, duration, dailyTime, level)
                val response = RetrofitClient.apiService.generateRoadmap(request)
                if (response.isSuccessful) {
                    _roadmapState.value = response.body()
                } else {
                    // Hata yonetimi
                }
            } catch (e: Exception) {
                // Hata yonetimi
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun analyzeProgress(activeTask: TaskItem, userText: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val request = ProgressRequest(activeTask.title, userText)
                val response = RetrofitClient.apiService.analyzeProgress(request)
                if (response.isSuccessful) {
                    val result = response.body()
                    _progressResult.value = result
                    
                    if (result?.status == "completed") {
                        addCoins(activeTask.coin_reward)
                    }
                }
            } catch (e: Exception) {
                // Hata yonetimi
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addCoins(amount: Int) {
        _focusCoins.value += amount
    }

    fun clearProgressResult() {
        _progressResult.value = null
    }
}
