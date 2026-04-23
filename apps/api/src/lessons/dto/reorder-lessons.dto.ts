import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class ReorderLessonItemDto {
  @IsUUID()
  lessonId!: string;

  @IsInt()
  @Min(1)
  orderIndex!: number;
}

export class ReorderLessonsDto {
  @IsUUID()
  moduleId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderLessonItemDto)
  items!: ReorderLessonItemDto[];
}
