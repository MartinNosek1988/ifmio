import { Module } from '@nestjs/common'
import { GraphAuthService } from './graph-auth.service'
import { TeamsService } from './teams.service'
import { PlannerService } from './planner.service'
import { M365CalendarService } from './calendar.service'
import { SharePointService } from './sharepoint.service'
import { M365AutomationService } from './m365-automation.service'

@Module({
  providers: [GraphAuthService, TeamsService, PlannerService, M365CalendarService, SharePointService, M365AutomationService],
  exports: [TeamsService, PlannerService, M365CalendarService, SharePointService, M365AutomationService],
})
export class Microsoft365Module {}
