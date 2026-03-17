import { Injectable, Logger } from '@nestjs/common'
import { GraphAuthService } from './graph-auth.service'

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name)

  constructor(private graphAuth: GraphAuthService) {}

  async createTask(params: {
    planId: string
    bucketId?: string
    title: string
    dueDate?: Date
    assigneeIds?: string[]
    description?: string
    priority?: number
  }): Promise<{ success: boolean; taskId?: string; error?: string }> {
    if (!this.graphAuth.isConfigured()) return { success: false, error: 'M365 není nakonfigurován' }

    try {
      const assignments: Record<string, any> = {}
      for (const id of params.assigneeIds ?? []) {
        assignments[id] = { '@odata.type': '#microsoft.graph.plannerAssignment', orderHint: ' !' }
      }

      const task = await this.graphAuth.graphRequest('POST', '/planner/tasks', {
        planId: params.planId,
        ...(params.bucketId ? { bucketId: params.bucketId } : {}),
        title: params.title,
        ...(params.dueDate ? { dueDateTime: params.dueDate.toISOString() } : {}),
        assignments,
        priority: params.priority ?? 5,
      })

      if (params.description && task?.id) {
        try {
          const detail = await this.graphAuth.graphRequest('GET', `/planner/tasks/${task.id}/details`)
          const token = await this.graphAuth.getToken()
          await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${task.id}/details`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'If-Match': detail['@odata.etag'] },
            body: JSON.stringify({ description: params.description }),
          })
        } catch (err: any) {
          this.logger.warn(`Failed to set task description: ${err.message}`)
        }
      }

      return { success: true, taskId: task?.id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async completeTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const task = await this.graphAuth.graphRequest('GET', `/planner/tasks/${taskId}`)
      const token = await this.graphAuth.getToken()
      await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'If-Match': task['@odata.etag'] },
        body: JSON.stringify({ percentComplete: 100 }),
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
