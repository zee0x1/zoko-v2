import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddMessageHistorySyncedAt1790468449000
  implements MigrationInterface
{
  name = 'AddMessageHistorySyncedAt1790468449000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "customers" ADD "message_history_synced_at" timestamptz',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "customers" DROP COLUMN "message_history_synced_at"',
    )
  }
}
