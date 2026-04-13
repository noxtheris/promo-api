import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { ActivatePromoCodeDto } from './dto/activate-promo-code.dto';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Activation } from './entities/activation.entity';
import { PromoCode } from './entities/promo-code.entity';

const PG_UNIQUE_VIOLATION = '23505';

export type ActivationResult = Activation & { discount: number };

@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoCodeRepo: Repository<PromoCode>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const promoCode = this.promoCodeRepo.create({
      code: dto.code,
      discount: dto.discount,
      activationLimit: dto.activationLimit,
      expiresAt: new Date(dto.expiresAt),
    });

    try {
      return await this.promoCodeRepo.save(promoCode);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(`Promo code "${dto.code}" already exists`);
      }

      throw error;
    }
  }

  async findAll(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PromoCode>> {
    const { page, limit } = query;

    const [data, total] = await this.promoCodeRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(code: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepo.findOne({
      where: { code },
    });

    if (!promoCode) {
      throw new NotFoundException(`Promo code "${code}" not found`);
    }

    return promoCode;
  }

  async activate(
    code: string,
    dto: ActivatePromoCodeDto,
  ): Promise<ActivationResult> {
    return this.dataSource.transaction(async (manager) => {
      const promoCode = await manager.findOne(PromoCode, {
        where: { code },
        lock: { mode: 'pessimistic_write' },
      });

      if (!promoCode) {
        throw new NotFoundException(`Promo code "${code}" not found`);
      }

      if (promoCode.expiresAt <= new Date()) {
        throw new ConflictException('Promo code has expired');
      }

      if (promoCode.activationCount >= promoCode.activationLimit) {
        throw new ConflictException('Promo code activation limit reached');
      }

      let activation: Activation;

      try {
        activation = await manager.save(
          manager.create(Activation, {
            promoCodeId: promoCode.id,
            email: dto.email,
          }),
        );
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
        ) {
          throw new ConflictException(
            `Promo code already activated for email "${dto.email}"`,
          );
        }

        throw error;
      }

      await manager.increment(
        PromoCode,
        { id: promoCode.id },
        'activationCount',
        1,
      );

      return {
        ...activation,
        discount: promoCode.discount,
      };
    });
  }
}