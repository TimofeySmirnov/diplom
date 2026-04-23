import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class ReorderModuleItemDto {
  @IsUUID()
  moduleId!: string;

  @IsInt()
  @Min(1)
  orderIndex!: number;
}

export class ReorderModulesDto {
  @IsUUID()
  courseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderModuleItemDto)
  items!: ReorderModuleItemDto[];
}