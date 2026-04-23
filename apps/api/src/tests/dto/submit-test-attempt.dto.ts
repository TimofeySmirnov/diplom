import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SubmitQuestionAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  optionIds!: string[];
}

export class SubmitTestAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuestionAnswerDto)
  answers!: SubmitQuestionAnswerDto[];
}