import { QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class UpsertTestQuestionOptionDto {
  @IsString()
  @MinLength(1)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

class UpsertTestQuestionDto {
  @IsString()
  @MinLength(2)
  text!: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => UpsertTestQuestionOptionDto)
  options!: UpsertTestQuestionOptionDto[];
}

export class UpsertTestContentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;

  @IsOptional()
  @IsBoolean()
  allowMultipleAttempts?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertTestQuestionDto)
  questions!: UpsertTestQuestionDto[];
}
