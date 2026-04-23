import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWebinarLessonDto {
  @IsUUID()
  moduleId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

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

  @IsString()
  @IsUrl(
    {
      require_protocol: true,
    },
    { message: 'meetingLink must be a valid URL with protocol' },
  )
  meetingLink!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}
