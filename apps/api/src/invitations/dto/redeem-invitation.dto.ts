import { IsString, MinLength } from 'class-validator';

export class RedeemInvitationDto {
  @IsString()
  @MinLength(8)
  token!: string;
}