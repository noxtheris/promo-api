import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Activation } from './activation.entity';

@Entity('promo_codes')
@Check(`"discount" >= 0 AND "discount" <= 100`)
@Check(`"activation_limit" > 0`)
@Check(`"activation_count" >= 0`)
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'citext', unique: true, nullable: false })
  code: string;

  @Column({ type: 'smallint', nullable: false })
  discount: number;

  @Column({ name: 'activation_limit', type: 'int', nullable: false })
  activationLimit: number;

  @Column({
    name: 'activation_count',
    type: 'int',
    default: 0,
    nullable: false,
  })
  activationCount: number;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(
    () => Activation,
    (activation) => activation.promoCode,
  )
  activations?: Activation[];
}
