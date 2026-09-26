import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateSupportEntities1790421158000 implements MigrationInterface {
  name = 'CreateSupportEntities1790421158000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "message_direction_enum" AS ENUM ('FROM_CUSTOMER', 'FROM_STORE')`)

    await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "phone" varchar(32) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "agents" (
        "id" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "email" varchar(320) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_agents_email" UNIQUE ("email"),
        CONSTRAINT "PK_agents" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" SERIAL NOT NULL,
        "customer_id" uuid NOT NULL,
        "opened_at" timestamptz NOT NULL,
        "closed_at" timestamptz,
        "closed_by_agent_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_conversations_customer"
          FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_conversations_closed_by_agent"
          FOREIGN KEY ("closed_by_agent_id") REFERENCES "agents"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "conversation_id" integer,
        "sender_agent_id" uuid,
        "direction" "message_direction_enum" NOT NULL,
        "platform" varchar(32) NOT NULL,
        "type" varchar(64) NOT NULL,
        "text" text,
        "file_url" text,
        "file_caption" text,
        "delivery_status" varchar(32) NOT NULL,
        "platform_timestamp" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_customer"
          FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_messages_conversation"
          FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_messages_sender_agent"
          FOREIGN KEY ("sender_agent_id") REFERENCES "agents"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `)

    await queryRunner.query(`
      CREATE TABLE "chat_assignments" (
        "id" SERIAL NOT NULL,
        "conversation_id" integer NOT NULL,
        "agent_id" uuid NOT NULL,
        "assigned_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_assignments_conversation"
          FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_assignments_agent"
          FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "chat_assignments"')
    await queryRunner.query('DROP TABLE "messages"')
    await queryRunner.query('DROP TABLE "conversations"')
    await queryRunner.query('DROP TABLE "agents"')
    await queryRunner.query('DROP TABLE "customers"')
    await queryRunner.query('DROP TYPE "message_direction_enum"')
  }
}
