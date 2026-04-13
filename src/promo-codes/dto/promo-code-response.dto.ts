import { ApiProperty } from '@nestjs/swagger';

export class PromoCodeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  discount: number;

  @ApiProperty()
  activationLimit: number;

  @ApiProperty()
  activationCount: number;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;
}
