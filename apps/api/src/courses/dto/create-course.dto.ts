import { CourseStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(260)
  shortDescription!: string;

  @IsString()
  @MinLength(30)
  @MaxLength(5000)
  fullDescription!: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'coverImageUrl must be a valid URL with protocol' },
  )
  coverImageUrl?: string;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
