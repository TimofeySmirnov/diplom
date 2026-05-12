import { IsString, MinLength } from 'class-validator';

export class DeleteLectureFileDto {
  @IsString()
  @MinLength(1)
  fileUrl!: string;
}

