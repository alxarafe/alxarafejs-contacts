import { commonValidations } from "@alxarafe/core";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

// --- Output schemas ---

export type Contact = z.infer<typeof ContactSchema>;
export const ContactSchema = z.object({
	id: z.number(),
	name: z.string(),
	notes: z.string().nullable(),
	isCustomer: z.boolean(),
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

export type ChannelTypeRecord = z.infer<typeof ChannelTypeSchema>;
export const ChannelTypeSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string().nullable(),
});

export type ContactDetail = z.infer<typeof ContactDetailSchema>;
export const ContactDetailSchema = ContactSchema.extend({
	addresses: z.array(AddressSchema),
	channels: z.array(ChannelSchema),
});

// --- Input schemas (nested create items) ---

export type AddressInput = z.infer<typeof AddressInputSchema>;
export const AddressInputSchema = z.object({
	label: z.string().trim().max(100).nullable().optional(),
	street: z.string().trim().min(1, "Street is required").max(255),
	city: z.string().trim().min(1, "City is required").max(120),
	state: z.string().trim().max(120).nullable().optional(),
	postalCode: z.string().trim().max(20).nullable().optional(),
	country: z.string().trim().min(1, "Country is required").max(90),
});

export type ChannelInput = z.infer<typeof ChannelInputSchema>;
export const ChannelInputSchema = z
	.object({
		channelTypeId: z.number().int().positive().optional(),
		channelTypeName: z.string().trim().min(1).max(80).optional(),
		value: z.string().trim().min(1, "Value is required").max(255),
		label: z.string().trim().max(100).nullable().optional(),
	})
	.refine((channel) => channel.channelTypeId !== undefined || channel.channelTypeName !== undefined, {
		message: "Provide channelTypeId or channelTypeName",
	});

// --- Request schemas ---

export const CreateContactSchema = z.object({
	body: z.object({
		name: z.string().min(1).max(255),
		notes: z.string().nullable().optional(),
		isCustomer: z.boolean().optional(),
		addresses: z.array(AddressInputSchema).max(50).optional(),
		channels: z.array(ChannelInputSchema).max(50).optional(),
	}),
});

export const UpdateContactSchema = z.object({
	params: z.object({ id: commonValidations.id }),
	body: z.object({
		name: z.string().min(1).max(255).optional(),
		notes: z.string().nullable().optional(),
		isCustomer: z.boolean().optional(),
		addresses: z.array(AddressInputSchema).max(50).optional(),
		channels: z.array(ChannelInputSchema).max(50).optional(),
	}),
});

export const GetContactSchema = z.object({
	params: z.object({ id: commonValidations.id }),
});

export const CreateAddressSchema = z.object({
	params: z.object({ id: commonValidations.id }),
	body: AddressInputSchema,
});

export const DeleteAddressSchema = z.object({
	params: z.object({ id: commonValidations.id, addressId: commonValidations.id }),
});

export const CreateChannelSchema = z.object({
	params: z.object({ id: commonValidations.id }),
	body: ChannelInputSchema,
});

export const DeleteChannelSchema = z.object({
	params: z.object({ id: commonValidations.id, channelId: commonValidations.id }),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>["body"];
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>["body"];
export type GetContactParams = z.infer<typeof GetContactSchema>["params"];
export type CreateAddressParams = z.infer<typeof CreateAddressSchema>["params"];
export type DeleteAddressParams = z.infer<typeof DeleteAddressSchema>["params"];
export type CreateChannelParams = z.infer<typeof CreateChannelSchema>["params"];
export type DeleteChannelParams = z.infer<typeof DeleteChannelSchema>["params"];
