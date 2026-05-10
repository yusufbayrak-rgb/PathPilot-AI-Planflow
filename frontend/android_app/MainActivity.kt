package com.planflow.ai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import com.planflow.ai.ui.DeepStepApp
import com.planflow.ai.viewmodel.DeepStepViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val viewModel: DeepStepViewModel = viewModel()
            DeepStepApp(viewModel = viewModel)
        }
    }
}
