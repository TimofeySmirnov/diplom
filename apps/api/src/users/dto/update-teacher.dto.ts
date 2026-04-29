import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTeacherDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;
}
