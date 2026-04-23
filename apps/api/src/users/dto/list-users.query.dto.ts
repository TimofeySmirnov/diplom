import { UserRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}