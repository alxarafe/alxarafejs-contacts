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

export type Titulation = z.infer<typeof TitulationSchema>;
export const TitulationSchema = z.object({
	id: z.number(),
	title: z.string(),
	institution: z.string().nullable(),
	year: z.number().int().nullable(),
	grade: z.number().nullable(),
});

export type Experience = z.infer<typeof ExperienceSchema>;
export const ExperienceSchema = z.object({
	id: z.number(),
	role: z.string(),
	company: z.string().nullable(),
	yearFrom: z.number().int().nullable(),
	yearTo: z.number().int().nullable(),
	level: z.number().int().nullable(),
});

export type ContactDetail = z.infer<typeof ContactDetailSchema>;
export const ContactDetailSchema = ContactSchema.extend({
	addresses: z.array(AddressSchema),
	channels: z.array(ChannelSchema),
	titulations: z.array(TitulationSchema),
	experiences: z.array(ExperienceSchema),
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

// Note: the CV is edited as a batch (PUT replaces both collections). An
// alternative per-line API (POST/DELETE /contacts/:id/titulations or
// /experiences/:lineId, the same pattern as addresses/channels) is kept for
// scenarios where the client only mutates one line at a time.
export type TitulationInput = z.infer<typeof TitulationInputSchema>;
export const TitulationInputSchema = z.object({
	title: z.string().trim().min(1, "Title is required").max(255),
	institution: z.string().trim().max(255).nullable().optional(),
	year: z.number().int().min(1900).max(2200).nullable().optional(),
	grade: z.number().min(0).max(10).nullable().optional(),
});

export type ExperienceInput = z.infer<typeof ExperienceInputSchema>;
export const ExperienceInputSchema = z.object({
	role: z.string().trim().min(1, "Role is required").max(255),
	company: z.string().trim().max(255).nullable().optional(),
	yearFrom: z.number().int().min(1900).max(2200).nullable().optional(),
	yearTo: z.number().int().min(1900).max(2200).nullable().optional(),
	level: z.number().int().min(1).max(5).nullable().optional(),
});

export type CvInput = z.infer<typeof CvInputSchema>;
export const CvInputSchema = z.object({
	titulations: z.array(TitulationInputSchema).max(50).default([]),
	experiences: z.array(ExperienceInputSchema).max(50).default([]),
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

export const ReplaceCvSchema = z.object({
	params: z.object({ id: commonValidations.id }),
	body: CvInputSchema,
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>["body"];
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>["body"];
export type GetContactParams = z.infer<typeof GetContactSchema>["params"];
export type CreateAddressParams = z.infer<typeof CreateAddressSchema>["params"];
export type DeleteAddressParams = z.infer<typeof DeleteAddressSchema>["params"];
export type CreateChannelParams = z.infer<typeof CreateChannelSchema>["params"];
export type DeleteChannelParams = z.infer<typeof DeleteChannelSchema>["params"];
export type ReplaceCvParams = z.infer<typeof ReplaceCvSchema>["params"];
