import { Module } from '@nestjs/common';
import { TestsModule } from '../tests/tests.module';
import { LecturesController } from './lectures.controller';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [TestsModule],
  controllers: [LessonsController, LecturesController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
