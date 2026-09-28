import { z } from "zod";

export const conversationIdSchema = z.coerce.number().int().positive();

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1),
});

export const csatResponseSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type CsatResponseDto = z.infer<typeof csatResponseSchema>;
