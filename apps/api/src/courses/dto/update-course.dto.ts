import { CourseStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(260)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  @MinLength(30)
  @MaxLength(5000)
  fullDescription?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'coverImageUrl must be a valid URL with protocol' },
  )
  coverImageUrl?: string | null;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
