import { Module } from '@nestjs/common';
import { AssetQrService } from './asset-qr.service';
import { AssetQrController } from './asset-qr.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AssetQrService],
  controllers: [AssetQrController],
  exports: [AssetQrService],
})
export class AssetQrModule {}
