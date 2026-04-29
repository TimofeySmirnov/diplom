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
  IsUUID,
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

class UpsertMatchingPairDto {
  @IsOptional()
  @IsUUID()
  leftId?: string;

  @IsOptional()
  @IsUUID()
  rightId?: string;

  @IsString()
  @MinLength(1)
  left!: string;

  @IsString()
  @MinLength(1)
  right!: string;
}

class UpsertOrderingItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MinLength(1)
  text!: string;
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertTestQuestionOptionDto)
  options?: UpsertTestQuestionOptionDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedAnswers?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertMatchingPairDto)
  matchingPairs?: UpsertMatchingPairDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertOrderingItemDto)
  orderingItems?: UpsertOrderingItemDto[];
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
