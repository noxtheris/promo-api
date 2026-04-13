import { ApiProperty } from '@nestjs/swagger';

export class ActivationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  promoCodeId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  activatedAt: Date;

  @ApiProperty()
  discount: number;
}