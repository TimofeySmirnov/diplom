import { IsObject } from 'class-validator';

export class ImportLessonDto {
  @IsObject()
  payload!: Record<string, unknown>;
}
