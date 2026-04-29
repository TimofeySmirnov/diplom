import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

function normalizeFilter(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : undefined;
}

export class SearchCourseStudentsQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeFilter(value))
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeFilter(value))
  @IsString()
  @MaxLength(64)
  group?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  limit?: number;
}
