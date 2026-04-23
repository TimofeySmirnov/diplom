import { LessonType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class LecturePayloadDto {
  @IsObject()
  content!: Record<string, unknown>;
}

class TestPayloadDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;

  @IsOptional()
  @IsBoolean()
  allowMultipleAttempts?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;
}

class WebinarPayloadDto {
  @IsOptional()
  @IsString()
  @IsUrl(
    {
      require_protocol: true,
    },
    { message: 'meetingLink must be a valid URL with protocol' },
  )
  meetingLink?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}

export class UpdateLessonDto {
  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  orderIndex?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LecturePayloadDto)
  lecture?: LecturePayloadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TestPayloadDto)
  test?: TestPayloadDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebinarPayloadDto)
  webinar?: WebinarPayloadDto;
}
