import { Module } from '@nestjs/common';
import { PvkService } from './pvk.service';
import { PvkController } from './pvk.controller';
import { CryptoService } from '../common/crypto.service';

@Module({
  providers: [PvkService, CryptoService],
  controllers: [PvkController],
  exports: [PvkService],
})
export class PvkModule {}
