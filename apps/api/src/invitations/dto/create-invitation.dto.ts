import { IsInt, IsISO8601, IsOptional, Min } from 'class-validator';

export class CreateInvitationDto {
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}