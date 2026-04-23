import { IsInt, IsOptional, Min } from 'class-validator';

export class ListPublicCoursesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 12;
}