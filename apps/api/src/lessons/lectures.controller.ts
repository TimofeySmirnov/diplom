import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { DeleteLectureFileDto } from './dto/delete-lecture-file.dto';
import { LessonsService } from './lessons.service';

type UploadedLectureFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

@Controller('lectures')
export class LecturesController {
  constructor(private readonly lessonsService: LessonsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Post(':id/files')
  @UseInterceptors(
    FilesInterceptor('files', 6, {
      limits: {
        files: 6,
        fileSize: MAX_FILE_SIZE_BYTES,
      },
    }),
  )
  uploadLectureFiles(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) lessonId: string,
    @UploadedFiles() files: UploadedLectureFile[],
  ) {
    return this.lessonsService.uploadLectureFiles(user, lessonId, files ?? []);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Delete(':id/files')
  deleteLectureFile(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: DeleteLectureFileDto,
  ) {
    return this.lessonsService.deleteLectureFile(user, lessonId, dto.fileUrl);
  }
}
