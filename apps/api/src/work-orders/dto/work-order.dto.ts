import {
  IsString,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsBoolean,
} from 'class-validator'

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Název úkolu je povinný' })
  title!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsIn(['corrective', 'preventive', 'inspection', 'emergency'], {
    message: 'workType musí být: corrective, preventive, inspection, emergency',
  })
  workType?: string

  @IsOptional()
  @IsIn(['nizka', 'normalni', 'vysoka', 'kriticka'], {
    message: 'priority musí být: nizka, normalni, vysoka, kriticka',
  })
  priority?: string

  @IsOptional()
  @IsString()
  propertyId?: string

  @IsOptional()
  @IsString()
  unitId?: string

  @IsOptional()
  @IsString()
  assetId?: string

  @IsOptional()
  @IsString()
  helpdeskTicketId?: string

  @IsOptional()
  @IsString()
  assignee?: string

  @IsOptional()
  @IsString()
  requester?: string

  @IsOptional()
  @IsString()
  assigneeUserId?: string

  @IsOptional()
  @IsString()
  requesterUserId?: string

  @IsOptional()
  @IsString()
  dispatcherUserId?: string

  @IsOptional()
  @IsDateString()
  deadline?: string

  @IsOptional()
  @IsNumber()
  estimatedHours?: number

  @IsOptional()
  @IsNumber()
  laborCost?: number

  @IsOptional()
  @IsNumber()
  materialCost?: number

  @IsOptional()
  @IsString()
  note?: string
}

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsIn(['corrective', 'preventive', 'inspection', 'emergency'])
  workType?: string

  @IsOptional()
  @IsIn(['nizka', 'normalni', 'vysoka', 'kriticka'])
  priority?: string

  @IsOptional()
  @IsString()
  propertyId?: string

  @IsOptional()
  @IsString()
  unitId?: string

  @IsOptional()
  @IsString()
  assetId?: string

  @IsOptional()
  @IsString()
  assignee?: string

  @IsOptional()
  @IsString()
  requester?: string

  @IsOptional()
  @IsString()
  assigneeUserId?: string

  @IsOptional()
  @IsString()
  requesterUserId?: string

  @IsOptional()
  @IsString()
  dispatcherUserId?: string

  @IsOptional()
  @IsDateString()
  deadline?: string

  @IsOptional()
  @IsNumber()
  estimatedHours?: number

  @IsOptional()
  @IsNumber()
  actualHours?: number

  @IsOptional()
  @IsNumber()
  laborCost?: number

  @IsOptional()
  @IsNumber()
  materialCost?: number

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  @IsString()
  workSummary?: string

  @IsOptional()
  @IsString()
  findings?: string

  @IsOptional()
  @IsString()
  recommendation?: string

  @IsOptional()
  @IsBoolean()
  requirePhoto?: boolean

  @IsOptional()
  @IsBoolean()
  requireHours?: boolean

  @IsOptional()
  @IsBoolean()
  requireSummary?: boolean

  @IsOptional()
  @IsBoolean()
  requireProtocol?: boolean
}

export class ChangeStatusDto {
  @IsString()
  @IsIn(['nova', 'v_reseni', 'vyresena', 'uzavrena', 'zrusena'], {
    message: 'status musí být: nova, v_reseni, vyresena, uzavrena, zrusena',
  })
  status!: string
}

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  text!: string
}
