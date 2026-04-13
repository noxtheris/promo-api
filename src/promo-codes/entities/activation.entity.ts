import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PromoCode } from './promo-code.entity';

@Entity('activations')
@Index('uq_activation_promo_email', ['promoCodeId', 'email'], { unique: true })
export class Activation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'promo_code_id', type: 'uuid', nullable: false })
  promoCodeId: string;

  @ManyToOne(
    () => PromoCode,
    (promo) => promo.activations,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'promo_code_id' })
  promoCode: PromoCode;

  @Column({ type: 'citext', nullable: false })
  email: string;

  @CreateDateColumn({ name: 'activated_at', type: 'timestamptz' })
  activatedAt: Date;
}
