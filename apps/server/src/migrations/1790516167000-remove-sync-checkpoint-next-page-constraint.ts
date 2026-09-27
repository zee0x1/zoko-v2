import type { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveSyncCheckpointNextPageConstraint1790516167000
  implements MigrationInterface
{
  name = 'RemoveSyncCheckpointNextPageConstraint1790516167000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "sync_checkpoints" DROP CONSTRAINT "CHK_sync_checkpoints_next_page"',
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE "sync_checkpoints" SET "next_page" = 1 WHERE "next_page" < 1',
    )
    await queryRunner.query(
      'ALTER TABLE "sync_checkpoints" ADD CONSTRAINT "CHK_sync_checkpoints_next_page" CHECK ("next_page" >= 1)',
    )
  }
}
