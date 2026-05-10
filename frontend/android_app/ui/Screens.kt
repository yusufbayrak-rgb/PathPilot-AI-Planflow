package com.planflow.ai.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.planflow.ai.models.TaskItem
import com.planflow.ai.viewmodel.DeepStepViewModel

@Composable
fun TargetScreen(viewModel: DeepStepViewModel, onNavigateToRoadmap: () -> Unit) {
    var target by remember { mutableStateOf("") }
    var duration by remember { mutableStateOf("") }
    var dailyTime by remember { mutableStateOf("") }
    var level by remember { mutableStateOf("Orta") }

    Column(modifier = Modifier.padding(16.dp).fillMaxSize()) {
        Text("Yeni Hedef Belirle", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = target,
            onValueChange = { target = it },
            label = { Text("Büyük Hedefiniz (örn: Portfolyo Sitesi Yapmak)") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = duration,
            onValueChange = { duration = it },
            label = { Text("Kaç gün sürer?") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = dailyTime,
            onValueChange = { dailyTime = it },
            label = { Text("Günlük ayıracağınız vakit (dk)") },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                viewModel.generateRoadmap(
                    target,
                    duration.toIntOrNull() ?: 30,
                    dailyTime.toIntOrNull() ?: 60,
                    level
                )
                onNavigateToRoadmap()
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !viewModel.isLoading.value
        ) {
            Text("Yol Haritası Oluştur")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoadmapScreen(viewModel: DeepStepViewModel) {
    val roadmapState = viewModel.roadmapState.value
    var selectedTask by remember { mutableStateOf<TaskItem?>(null) }

    if (viewModel.isLoading.value && roadmapState == null) {
        CircularProgressIndicator()
    } else if (roadmapState != null) {
        LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            item {
                Text("Hedef: ${roadmapState.target}", style = MaterialTheme.typography.titleLarge)
                Spacer(modifier = Modifier.height(16.dp))
            }
            
            roadmapState.roadmap.forEach { phase ->
                item {
                    Text(phase.phase_name, style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                items(phase.tasks) { task ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(task.title, style = MaterialTheme.typography.bodyLarge)
                            Text("Adım: ${task.actionable_step}", style = MaterialTheme.typography.bodyMedium)
                            Text("Ödül: 🪙 ${task.coin_reward} Coin", style = MaterialTheme.typography.labelMedium)
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(onClick = { selectedTask = task }) {
                                Text("İlerlemeyi Gir")
                            }
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    } else {
        Text("Henüz bir yol haritası yok.")
    }

    selectedTask?.let { task ->
        ProgressDialog(
            task = task,
            viewModel = viewModel,
            onDismiss = { selectedTask = null }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProgressDialog(task: TaskItem, viewModel: DeepStepViewModel, onDismiss: () -> Unit) {
    var userText by remember { mutableStateOf("") }
    val progressResult = viewModel.progressResult.value

    ModalBottomSheet(onDismissRequest = { 
        onDismiss()
        viewModel.clearProgressResult()
    }) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Akıllı Günlük", style = MaterialTheme.typography.titleLarge)
            Text(task.title, style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(16.dp))

            if (progressResult == null) {
                OutlinedTextField(
                    value = userText,
                    onValueChange = { userText = it },
                    label = { Text("Bugün şunları yaptım...") },
                    modifier = Modifier.fillMaxWidth().height(150.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { viewModel.analyzeProgress(task, userText) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !viewModel.isLoading.value
                ) {
                    if (viewModel.isLoading.value) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    } else {
                        Text("Analiz Et")
                    }
                }
            } else {
                Text("Durum: ${progressResult.status}")
                Text("Tamamlanma: %${progressResult.completion_percentage}")
                Text("Geri Bildirim: ${progressResult.feedback}")
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { 
                    onDismiss()
                    viewModel.clearProgressResult()
                }) {
                    Text("Kapat")
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
