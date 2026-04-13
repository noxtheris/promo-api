import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { Activation } from '../promo-codes/entities/activation.entity';
import { PromoCode } from '../promo-codes/entities/promo-code.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'promo',
  password: process.env.DB_PASSWORD ?? 'promo_secret',
  database: process.env.DB_NAME ?? 'promo_db',
  entities: [PromoCode, Activation],
  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/database/migrations/*.js'
      : 'src/database/migrations/*.ts'
  ],
});
