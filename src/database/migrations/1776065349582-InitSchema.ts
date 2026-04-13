import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1776065349582 implements MigrationInterface {
  name = 'InitSchema1776065349582'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext"`);
    await queryRunner.query(`CREATE TABLE "promo_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" citext NOT NULL, "discount" smallint NOT NULL, "activation_limit" integer NOT NULL, "activation_count" integer NOT NULL DEFAULT '0', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_2f096c406a9d9d5b8ce204190c3" UNIQUE ("code"), CONSTRAINT "CHK_e01d8f44cf16ae221e3b7f7d03" CHECK ("activation_count" >= 0), CONSTRAINT "CHK_cfb3becddba6b1f87163a7729d" CHECK ("activation_limit" > 0), CONSTRAINT "CHK_186b462045d0b543f0ad023f79" CHECK ("discount" >= 0 AND "discount" <= 100), CONSTRAINT "PK_c7b4f01710fda5afa056a2b4a35" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_6a151432891697dc7337aadd27" ON "promo_codes" ("expires_at") `);
    await queryRunner.query(`CREATE TABLE "activations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "promo_code_id" uuid NOT NULL, "email" citext NOT NULL, "activated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_db9ffdd659f4ac699248030b596" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_ee1e3b5de9e79d35880669655d" ON "activations" ("promo_code_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_activation_promo_email" ON "activations" ("promo_code_id", "email") `);
    await queryRunner.query(`ALTER TABLE "activations" ADD CONSTRAINT "FK_ee1e3b5de9e79d35880669655db" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activations" DROP CONSTRAINT "FK_ee1e3b5de9e79d35880669655db"`);
    await queryRunner.query(`DROP INDEX "public"."uq_activation_promo_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ee1e3b5de9e79d35880669655d"`);
    await queryRunner.query(`DROP TABLE "activations"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6a151432891697dc7337aadd27"`);
    await queryRunner.query(`DROP TABLE "promo_codes"`);
  }

}