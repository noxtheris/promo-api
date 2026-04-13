import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { Activation } from '@/promo-codes/entities/activation.entity';
import { PromoCode } from '@/promo-codes/entities/promo-code.entity';
import { PromoCodesModule } from '@/promo-codes/promo-codes.module';

const E2E_DB = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'promo',
  password: process.env.DB_PASSWORD ?? 'promo_secret',
  database: process.env.DB_NAME ?? 'promo_db',
};

describe('PromoCodesController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          ...E2E_DB,
          entities: [PromoCode, Activation],
          synchronize: true,
        }),
        PromoCodesModule,
      ],
    }).compile();

    app = module.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM activations');
    await dataSource.query('DELETE FROM promo_codes');
  });

  describe('POST /promo-codes', () => {
    it('creates promo code', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes')
        .send({
          code: 'summer10',
          discount: 10,
          activationLimit: 100,
          expiresAt: '2030-12-31T23:59:59.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('SUMMER10');
      expect(res.body.activationCount).toBe(0);
    });

    it('normalizes code', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes')
        .send({
          code: '  winter30  ',
          discount: 30,
          activationLimit: 5,
          expiresAt: '2030-01-01T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe('WINTER30');
    });

    it('returns 409 for duplicate code', async () => {
      const payload = {
        code: 'DUP',
        discount: 5,
        activationLimit: 1,
        expiresAt: '2030-01-01T00:00:00.000Z',
      };

      await request(app.getHttpServer()).post('/promo-codes').send(payload);
      const res = await request(app.getHttpServer()).post('/promo-codes').send(payload);

      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid discount', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes')
        .send({
          code: 'BAD',
          discount: 101,
          activationLimit: 1,
          expiresAt: '2030-01-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 for whitespace code', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes')
        .send({
          code: '   ',
          discount: 10,
          activationLimit: 1,
          expiresAt: '2030-01-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /promo-codes', () => {
    it('returns empty paginated result', async () => {
      const res = await request(app.getHttpServer()).get('/promo-codes');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('returns paginated list with total', async () => {
      await Promise.all(
        ['ALPHA', 'BETA', 'GAMMA'].map((code) =>
          request(app.getHttpServer())
            .post('/promo-codes')
            .send({ code, discount: 10, activationLimit: 10, expiresAt: '2030-01-01T00:00:00.000Z' }),
        ),
      );

      const res = await request(app.getHttpServer()).get('/promo-codes?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });

    it('returns second page correctly', async () => {
      await Promise.all(
        ['ALPHA', 'BETA', 'GAMMA'].map((code) =>
          request(app.getHttpServer())
            .post('/promo-codes')
            .send({ code, discount: 10, activationLimit: 10, expiresAt: '2030-01-01T00:00:00.000Z' }),
        ),
      );

      const res = await request(app.getHttpServer()).get('/promo-codes?page=2&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(2);
    });

    it('returns 400 for invalid pagination params', async () => {
      const res = await request(app.getHttpServer()).get('/promo-codes?page=0&limit=200');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /promo-codes/:code', () => {
    it('returns promo code', async () => {
      await request(app.getHttpServer()).post('/promo-codes').send({
        code: 'DETAIL',
        discount: 25,
        activationLimit: 5,
        expiresAt: '2030-01-01T00:00:00.000Z',
      });

      const res = await request(app.getHttpServer()).get('/promo-codes/DETAIL');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('DETAIL');
    });

    it('returns 404 if not found', async () => {
      const res = await request(app.getHttpServer()).get('/promo-codes/NOPE');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /promo-codes/:code/activate', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/promo-codes').send({
        code: 'PROMO',
        discount: 30,
        activationLimit: 2,
        expiresAt: '2030-01-01T00:00:00.000Z',
      });
    });

    it('activates promo code', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('user@test.com');
      expect(res.body.id).toBeDefined();
    });

    it('normalizes email', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'User@Test.COM' });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('user@test.com');
    });

    it('returns 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'dup@test.com' });

      const res = await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'dup@test.com' });

      expect(res.status).toBe(409);
    });

    it('returns 409 when limit reached', async () => {
      await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'a@test.com' });

      await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'b@test.com' });

      const res = await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'c@test.com' });

      expect(res.status).toBe(409);
    });

    it('returns 409 for expired promo', async () => {
      await request(app.getHttpServer()).post('/promo-codes').send({
        code: 'EXPIRED',
        discount: 10,
        activationLimit: 10,
        expiresAt: '2000-01-01T00:00:00.000Z',
      });

      const res = await request(app.getHttpServer())
        .post('/promo-codes/EXPIRED/activate')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(409);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes/PROMO/activate')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('returns 404 if promo not found', async () => {
      const res = await request(app.getHttpServer())
        .post('/promo-codes/UNKNOWN/activate')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(404);
    });

    it('race condition: concurrent activations never exceed the limit', async () => {
      const LIMIT = 3;

      await request(app.getHttpServer()).post('/promo-codes').send({
        code: 'RACE',
        discount: 10,
        activationLimit: LIMIT,
        expiresAt: '2030-01-01T00:00:00.000Z',
      });

      const emails = Array.from({ length: 10 }, (_, i) => `race${i}@test.com`);

      const results = await Promise.all(
        emails.map((email) =>
          request(app.getHttpServer())
            .post('/promo-codes/RACE/activate')
            .send({ email }),
        ),
      );

      const successful = results.filter((r) => r.status === 201);
      const failed = results.filter((r) => r.status === 409);

      expect(successful).toHaveLength(LIMIT);
      expect(failed).toHaveLength(emails.length - LIMIT);

      const promoRes = await request(app.getHttpServer()).get('/promo-codes/RACE');
      expect(promoRes.body.activationCount).toBe(LIMIT);
    });

    it('race condition: same email concurrently — only one activation succeeds', async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app.getHttpServer())
            .post('/promo-codes/PROMO/activate')
            .send({ email: 'concurrent@test.com' }),
        ),
      );

      const successful = results.filter((r) => r.status === 201);
      const failed = results.filter((r) => r.status === 409);

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(4);
    });
  });
});