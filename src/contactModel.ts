import { commonValidations } from "@alxarafe/core";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// --- Response schemas ---

export type Contact = z.infer<typeof ContactSchema>;
export const ContactSchema = z.object({
	id: z.number(),
	name: z.string(),
	notes: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export type Address = z.infer<typeof AddressSchema>;
export const AddressSchema = z.object({
	id: z.number(),
	label: z.string().nullable(),
	street: z.string(),
	city: z.string(),
	state: z.string().nullable(),
	postalCode: z.string().nullable(),
	country: z.string(),
});

export type Channel = z.infer<typeof ChannelSchema>;
export const ChannelSchema = z.object({
	id: z.number(),
	channelTypeId: z.number(),
	channelTypeName: z.string(),
	value: z.string(),
	label: z.string().nullable(),
});

export type ContactDetail = z.infer<typeof ContactDetailSchema>;
export const ContactDetailSchema = ContactSchema.extend({
	addresses: z.array(AddressSchema),
	channels: z.array(ChannelSchema),
});

// --- Input schemas ---

export const CreateContactSchema = z.object({
	body: z.object({
		name: z.string().min(1).max(255),
		notes: z.string().nullable().optional(),
	}),
});

export const UpdateContactSchema = z.object({
	params: z.object({ id: commonValidations.id }),
	body: z.object({
		name: z.string().min(1).max(255).optional(),
		notes: z.string().nullable().optional(),
	}),
});

export const GetContactSchema = z.object({
	params: z.object({ id: commonValidations.id }),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>["body"];
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>["body"];
