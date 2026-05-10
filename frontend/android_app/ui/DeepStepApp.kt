package com.planflow.ai.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.planflow.ai.viewmodel.DeepStepViewModel

enum class Screen {
    TargetInput, Roadmap
}

@Composable
fun DeepStepApp(viewModel: DeepStepViewModel) {
    var currentScreen by remember { mutableStateOf(Screen.TargetInput) }
    val focusCoins = viewModel.focusCoins.value

    Scaffold(
        topBar = { TopBar(focusCoins = focusCoins) }
    ) { innerPadding ->
        androidx.compose.material3.Surface(modifier = Modifier.padding(innerPadding)) {
            when (currentScreen) {
                Screen.TargetInput -> TargetScreen(
                    viewModel = viewModel,
                    onNavigateToRoadmap = { currentScreen = Screen.Roadmap }
                )
                Screen.Roadmap -> RoadmapScreen(viewModel = viewModel)
            }
        }
    }
}
