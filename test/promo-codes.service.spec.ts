import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { ActivatePromoCodeDto } from '@/promo-codes/dto/activate-promo-code.dto';
import { CreatePromoCodeDto } from '@/promo-codes/dto/create-promo-code.dto';
import { PaginationQueryDto } from '@/promo-codes/dto/pagination-query.dto';
import { Activation } from '@/promo-codes/entities/activation.entity';
import { PromoCode } from '@/promo-codes/entities/promo-code.entity';
import { PromoCodesService } from '@/promo-codes/promo-codes.service';

const makePromoCode = (overrides: Partial<PromoCode> = {}): PromoCode => ({
  id: 'uuid-promo-1',
  code: 'SAVE20',
  discount: 20,
  activationLimit: 10,
  activationCount: 0,
  expiresAt: new Date(Date.now() + 86_400_000),
  createdAt: new Date(),
  ...overrides,
});

const makeActivation = (overrides: Partial<Activation> = {}): Activation => ({
  id: 'uuid-act-1',
  promoCodeId: 'uuid-promo-1',
  promoCode: makePromoCode(),
  email: 'user@example.com',
  activatedAt: new Date(),
  ...overrides,
});

const makeQueryFailedError = (code: string): QueryFailedError => {
  const error = new QueryFailedError('', [], new Error()) as QueryFailedError & {
    driverError: Error & { code: string };
  };

  error.driverError = Object.assign(new Error(), { code });

  return error;
};

const makePaginationQuery = (overrides: Partial<PaginationQueryDto> = {}): PaginationQueryDto => ({
  page: 1,
  limit: 20,
  ...overrides,
});

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let promoCodeRepo: jest.Mocked<Repository<PromoCode>>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        {
          provide: getRepositoryToken(PromoCode),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PromoCodesService);
    promoCodeRepo = module.get(getRepositoryToken(PromoCode));
    dataSource = module.get(DataSource);
  });

  describe('create', () => {
    const dto: CreatePromoCodeDto = {
      code: 'SAVE20',
      discount: 20,
      activationLimit: 10,
      expiresAt: '2030-01-01T00:00:00.000Z',
    };

    it('creates promo code', async () => {
      const promoCode = makePromoCode();

      promoCodeRepo.create.mockReturnValue(promoCode);
      promoCodeRepo.save.mockResolvedValue(promoCode);

      const result = await service.create(dto);

      expect(promoCodeRepo.create).toHaveBeenCalledWith({
        code: dto.code,
        discount: dto.discount,
        activationLimit: dto.activationLimit,
        expiresAt: new Date(dto.expiresAt),
      });

      expect(promoCodeRepo.save).toHaveBeenCalled();
      expect(result).toEqual(promoCode);
    });

    it('throws ConflictException on duplicate code', async () => {
      const promoCode = makePromoCode();

      promoCodeRepo.create.mockReturnValue(promoCode);
      promoCodeRepo.save.mockRejectedValue(makeQueryFailedError('23505'));

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected error', async () => {
      const promoCode = makePromoCode();

      promoCodeRepo.create.mockReturnValue(promoCode);
      promoCodeRepo.save.mockRejectedValue(makeQueryFailedError('99999'));

      await expect(service.create(dto)).rejects.toThrow(QueryFailedError);
    });
  });

  describe('findAll', () => {
    it('returns paginated result with defaults', async () => {
      const list = [makePromoCode()];

      promoCodeRepo.findAndCount.mockResolvedValue([list, 1]);

      const result = await service.findAll(makePaginationQuery());

      expect(promoCodeRepo.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });

      expect(result).toEqual({ data: list, total: 1, page: 1, limit: 20 });
    });

    it('applies correct skip for page > 1', async () => {
      promoCodeRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(makePaginationQuery({ page: 3, limit: 10 }));

      expect(promoCodeRepo.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        skip: 20,
        take: 10,
      });
    });

    it('returns empty data with correct total', async () => {
      promoCodeRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll(makePaginationQuery());

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('findOne', () => {
    it('returns promo code', async () => {
      const promoCode = makePromoCode();

      promoCodeRepo.findOne.mockResolvedValue(promoCode);

      const result = await service.findOne('SAVE20');

      expect(promoCodeRepo.findOne).toHaveBeenCalledWith({
        where: { code: 'SAVE20' },
      });

      expect(result).toEqual(promoCode);
    });

    it('throws NotFoundException if not found', async () => {
      promoCodeRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('NOPE')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    const dto: ActivatePromoCodeDto = {
      email: 'user@example.com',
    };

    const runActivate = (managerOverrides: any) => {
      dataSource.transaction.mockImplementation((cb: any) => cb(managerOverrides));

      return service.activate('SAVE20', dto);
    };

    it('successfully activates promo code', async () => {
      const promoCode = makePromoCode();
      const activation = makeActivation();

      const manager = {
        findOne: jest.fn().mockResolvedValue(promoCode),
        create: jest.fn().mockReturnValue(activation),
        save: jest.fn().mockResolvedValue(activation),
        increment: jest.fn(),
      };

      const result = await runActivate(manager);

      expect(manager.increment).toHaveBeenCalledWith(
        PromoCode,
        { id: promoCode.id },
        'activationCount',
        1,
      );

      expect(result).toEqual({ ...activation, discount: promoCode.discount });
    });

    it('throws NotFoundException if promo not found', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        save: jest.fn(),
        increment: jest.fn(),
      };

      await expect(runActivate(manager)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if expired', async () => {
      const expired = makePromoCode({ expiresAt: new Date(Date.now() - 1000) });

      const manager = {
        findOne: jest.fn().mockResolvedValue(expired),
        create: jest.fn(),
        save: jest.fn(),
        increment: jest.fn(),
      };

      await expect(runActivate(manager)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if limit reached', async () => {
      const exhausted = makePromoCode({ activationCount: 10, activationLimit: 10 });

      const manager = {
        findOne: jest.fn().mockResolvedValue(exhausted),
        create: jest.fn(),
        save: jest.fn(),
        increment: jest.fn(),
      };

      await expect(runActivate(manager)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on duplicate activation', async () => {
      const promoCode = makePromoCode();

      const manager = {
        findOne: jest.fn().mockResolvedValue(promoCode),
        create: jest.fn(),
        save: jest.fn().mockRejectedValue(makeQueryFailedError('23505')),
        increment: jest.fn(),
      };

      await expect(runActivate(manager)).rejects.toThrow(ConflictException);
    });
  });
});