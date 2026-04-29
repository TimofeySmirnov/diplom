import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class SubmitMatchingPairDto {
  @IsUUID()
  leftId!: string;

  @IsUUID()
  rightId!: string;
}

export class SubmitQuestionAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  optionIds?: string[];

  @IsOptional()
  @IsString()
  textAnswer?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitMatchingPairDto)
  matchingPairs?: SubmitMatchingPairDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  orderingItemIds?: string[];
}

export class SubmitTestAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitQuestionAnswerDto)
  answers!: SubmitQuestionAnswerDto[];
}
