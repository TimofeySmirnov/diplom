import { Module } from '@nestjs/common';
import { StudentImportService } from './student-import.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, StudentImportService],
  exports: [UsersService, StudentImportService],
})
export class UsersModule {}
