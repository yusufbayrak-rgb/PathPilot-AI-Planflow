package com.planflow.ai.models

data class RoadmapRequest(
    val target: String,
    val duration: Int,
    val daily_time: Int,
    val level: String
)

data class TaskItem(
    val task_id: String,
    val title: String,
    val estimated_minutes: Int,
    val actionable_step: String,
    val coin_reward: Int
)

data class PhaseItem(
    val phase_name: String,
    val tasks: List<TaskItem>
)

data class RoadmapResponse(
    val target: String,
    val roadmap: List<PhaseItem>
)

data class ProgressRequest(
    val active_task: String,
    val user_text: String
)

data class ProgressResponse(
    val status: String,
    val completion_percentage: Int,
    val feedback: String,
    val next_action: String
)
