import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLectureLessonDto {
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

  @IsObject()
  content!: Record<string, unknown>;
}
