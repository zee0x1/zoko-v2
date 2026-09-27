import { z } from "zod";

export const conversationIdSchema = z.coerce.number().int().positive();

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
