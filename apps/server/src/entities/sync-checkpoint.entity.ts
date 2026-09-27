import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'sync_checkpoints' })
export class SyncCheckpoint {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string

  @Column({ name: 'next_page', type: 'integer', nullable: false })
  nextPage: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
