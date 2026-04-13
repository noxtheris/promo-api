import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePromoCodeDto {
  @ApiProperty({ example: 'SUMMER20', minLength: 3, maxLength: 50 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discount: number;

  @ApiProperty({ example: 100, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  activationLimit: number;

  @ApiProperty({ example: '2030-12-31T23:59:59.000Z' })
  @IsDateString()
  expiresAt: string;
}
