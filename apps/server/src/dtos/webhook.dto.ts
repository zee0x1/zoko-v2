import { z } from "zod";

const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});

const agentSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string(),
});

const messageFields = {
  id: z.string().min(1),
  platform: z.string().min(1),
  platformTimestamp: z.coerce.date(),
  text: z.string().nullable().optional(),
  type: z.string().min(1),
  fileUrl: z.string().nullable().optional(),
  fileCaption: z.string().nullable().optional(),
  deliveryStatus: z.string().min(1),
};

const incomingMessageSchema = z.object({
  event: z.literal("message:user:in"),
  customer: customerSchema,
  phone: z.string().min(1),
  direction: z.literal("FROM_CUSTOMER"),
  ...messageFields,
});

const outgoingMessageSchema = z.object({
  event: z.literal("message:store:out"),
  customer: customerSchema,
  phone: z.string().min(1),
  direction: z.literal("FROM_STORE"),
  agentEmail: z.email().optional(),
  ...messageFields,
});

const deliveryUpdateSchema = z.object({
  event: z.literal("message:delivery:update"),
  id: z.string().min(1),
  deliveryStatus: z.string().min(1),
  platformTimestamp: z.coerce.date(),
});

const assignedSchema = z.object({
  event: z.literal("zoko:chat:assigned"),
  customerId: z.string().min(1),
  eventAt: z.coerce.date(),
  status: z.string().min(1),
  agent: agentSchema,
});

const closedSchema = z.object({
  event: z.literal("zoko:chat:closed"),
  customerId: z.string().min(1),
  eventAt: z.coerce.date(),
  status: z.string().min(1),
  agent: agentSchema,
  closedBy: z.object({
    type: z.literal("agent"),
    agent: agentSchema,
  }),
});

export const webhookDtoSchema = z.discriminatedUnion("event", [
  incomingMessageSchema,
  outgoingMessageSchema,
  deliveryUpdateSchema,
  assignedSchema,
  closedSchema,
]);

export type IncomingMessageDto = z.infer<typeof incomingMessageSchema>;
export type OutgoingMessageDto = z.infer<typeof outgoingMessageSchema>;
export type DeliveryUpdateDto = z.infer<typeof deliveryUpdateSchema>;
export type ChatAssignedDto = z.infer<typeof assignedSchema>;
export type ChatClosedDto = z.infer<typeof closedSchema>;

export const webhookBaseSchema = z.object({
  event: z.string().min(1),
});

export type WebhookDto = z.infer<typeof webhookDtoSchema>;
