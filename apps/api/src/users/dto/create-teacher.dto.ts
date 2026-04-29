import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateTeacherDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;
}
