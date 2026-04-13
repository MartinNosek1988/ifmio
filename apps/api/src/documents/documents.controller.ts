import {
  Controller, Get, Post, Delete,
  Param, Query, Body, UseGuards, Req,
  HttpCode, HttpStatus, Res,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DocumentsService } from './documents.service'
import { JwtAuthGuard }     from '../common/guards/jwt-auth.guard'
import { Roles }            from '../common/decorators/roles.decorator'
import { CurrentUser }      from '../common/decorators/current-user.decorator'
import { AuditAction }      from '../common/decorators/audit.decorator'
import { ROLES_WRITE, ROLES_MANAGE } from '../common/constants/roles.constants'
import { DocumentListQueryDto } from './dto/documents.dto'
import type { AuthUser }    from '@ifmio/shared-types'
import * as fs   from 'fs'
import * as path from 'path'
import type { FastifyRequest, FastifyReply } from 'fastify'

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Seznam dokumentů' })
  list(@CurrentUser() user: AuthUser, @Query() query: DocumentListQueryDto) {
    return this.service.list(user, query)
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiky dokumentů' })
  stats(@CurrentUser() user: AuthUser, @Query('propertyId') propertyId?: string) {
    return this.service.getStats(user, propertyId)
  }

  @Post('upload')
  @Roles(...ROLES_WRITE)
  @AuditAction('Document', 'UPLOAD')
  @ApiOperation({ summary: 'Upload dokumentu' })
  async upload(
    @CurrentUser() user: AuthUser,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file()
    if (!data) {
      throw new Error('No file uploaded')
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Parse fields from multipart
    const fields: Record<string, string> = {}
    for (const [key, field] of Object.entries(data.fields)) {
      if (field && typeof field === 'object' && 'value' in field) {
        fields[key] = (field as any).value
      }
    }

    return this.service.upload(user, {
      buffer,
      originalname: data.filename,
      mimetype:     data.mimetype,
      size:         buffer.length,
    }, {
      name:        fields.name,
      category:    fields.category,
      description: fields.description,
      tags:        fields.tags ? JSON.parse(fields.tags) : [],
      entityType:  fields.entityType,
      entityId:    fields.entityId,
    })
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download dokumentu' })
  async download(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: FastifyReply,
  ) {
    const { storageKey, name, mimeType } = await this.service.getDownloadInfo(user, id)
    const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
    const filePath  = path.join(uploadDir, storageKey)

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found')
    }

    return res
      .header('Content-Disposition', `attachment; filename="${name}"`)
      .header('Content-Type', mimeType)
      .send(fs.readFileSync(filePath))
  }

  @Delete(':id')
  @Roles(...ROLES_MANAGE)
  @AuditAction('Document', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Smazat dokument' })
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.delete(user, id)
  }

  @Post(':id/links')
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Propojit dokument s entitou' })
  addLink(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { entityType: string; entityId: string },
  ) {
    return this.service.addLink(user, id, body.entityType, body.entityId)
  }
}
