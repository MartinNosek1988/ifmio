import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { RegistryController } from './registry.controller'

@Module({
  imports: [PrismaModule],
  controllers: [RegistryController],
})
export class RegistryModule {}
