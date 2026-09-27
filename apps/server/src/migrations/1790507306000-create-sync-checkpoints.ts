import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSyncCheckpoints1790507306000
  implements MigrationInterface
{
  name = 'CreateSyncCheckpoints1790507306000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sync_checkpoints" (
        "key" varchar(100) NOT NULL,
        "next_page" integer NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_sync_checkpoints_next_page" CHECK ("next_page" >= 1),
        CONSTRAINT "PK_sync_checkpoints" PRIMARY KEY ("key")
      )
    `)

    await queryRunner.query(`
      INSERT INTO "sync_checkpoints" ("key", "next_page")
      VALUES ('zoko_customers', 1)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "sync_checkpoints"')
  }
}
