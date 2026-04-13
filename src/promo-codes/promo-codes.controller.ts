import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ActivatePromoCodeDto } from './dto/activate-promo-code.dto';
import { ActivationResponseDto } from './dto/activation-response.dto';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PromoCodeResponseDto } from './dto/promo-code-response.dto';
import { PromoCodesService } from './promo-codes.service';

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create promo code' })
  @ApiCreatedResponse({ type: PromoCodeResponseDto })
  @ApiConflictResponse({ description: 'Promo code already exists' })
  create(@Body() dto: CreatePromoCodeDto): Promise<PromoCodeResponseDto> {
    return this.promoCodesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List promo codes' })
  @ApiOkResponse({ type: PaginatedResponseDto })
  findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PromoCodeResponseDto>> {
    return this.promoCodesService.findAll(query);
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get promo code by code' })
  @ApiOkResponse({ type: PromoCodeResponseDto })
  @ApiNotFoundResponse({ description: 'Promo code not found' })
  findOne(@Param('code') code: string): Promise<PromoCodeResponseDto> {
    return this.promoCodesService.findOne(code);
  }

  @Post(':code/activate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Activate promo code by email' })
  @ApiCreatedResponse({ type: ActivationResponseDto })
  @ApiNotFoundResponse({ description: 'Promo code not found' })
  @ApiConflictResponse({ description: 'Already activated or limit reached' })
  @ApiBadRequestResponse({ description: 'Invalid email' })
  activate(
    @Param('code') code: string,
    @Body() dto: ActivatePromoCodeDto,
  ): Promise<ActivationResponseDto> {
    return this.promoCodesService.activate(code, dto);
  }
}