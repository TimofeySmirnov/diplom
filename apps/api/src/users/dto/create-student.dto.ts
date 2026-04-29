import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function normalizeGroupValue(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : undefined;
}

export class CreateStudentDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeGroupValue(value))
  @IsString()
  @MaxLength(64)
  group?: string;
}
