import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activation } from './promo-codes/entities/activation.entity';
import { PromoCode } from './promo-codes/entities/promo-code.entity';
import { PromoCodesModule } from './promo-codes/promo-codes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: parseInt(config.getOrThrow<string>('DB_PORT'), 10),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_NAME'),
        entities: [PromoCode, Activation],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    PromoCodesModule,
  ],
})
export class AppModule {}
