import {
  Controller, Post, Get, Body, Req,
  Res, HttpCode,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { ResidentsImportService } from './residents-import.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ROLES_WRITE } from '../../common/constants/roles.constants'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuthUser } from '@ifmio/shared-types';

@ApiTags('Residents Import')
@ApiBearerAuth()
@Controller('residents/import')
export class ResidentsImportController {
  constructor(private service: ResidentsImportService) {}

  @Get('template')
  @ApiOperation({ summary: 'Stahnout XLSX sablonu pro import' })
  downloadTemplate(@Res() res: FastifyReply) {
    const buffer = this.service.generateTemplate()
    res
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="import-najemniku-sablona.xlsx"')
      .send(buffer)
  }

  @Post('validate')
  @HttpCode(200)
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Validace souboru pred importem (preview)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async validate(
    @CurrentUser() user: AuthUser,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file()
    if (!data) throw new Error('Soubor je povinny')

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    const rows = this.service.parseFile(buffer, data.mimetype)
    return this.service.validate(rows, user.tenantId)
  }

  @Post('execute')
  @HttpCode(200)
  @Roles(...ROLES_WRITE)
  @ApiOperation({ summary: 'Provest import validovanych radku' })
  execute(
    @CurrentUser() user: AuthUser,
    @Body() body: { rows: any[] },
  ) {
    return this.service.executeImport(user, body.rows)
  }
}
