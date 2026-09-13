import { createApiResponse, PaginatedListSchema, validateRequest } from "@alxarafe/core";
import { requireAuth } from "@alxarafe/users";
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import { z } from "zod";

import { contactController } from "./contactController.js";
import {
	AddressInputSchema,
	AddressSchema,
	ChannelInputSchema,
	ChannelSchema,
	ChannelTypeSchema,
	ContactDetailSchema,
	ContactSchema,
	CreateAddressSchema,
	CreateChannelSchema,
	CreateContactSchema,
	DeleteAddressSchema,
	DeleteChannelSchema,
	ExperienceInputSchema,
	ExperienceSchema,
	GetContactSchema,
	ReplaceCvSchema,
	TitulationSchema,
	UpdateContactSchema,
} from "./contactModel.js";

export const contactRegistry = new OpenAPIRegistry();
export const contactRouter: Router = express.Router();

const ContactListQuerySchema = z.object({
	$top: z.coerce.number().int().positive().max(500).optional(),
	$skip: z.coerce.number().int().min(0).optional(),
	$count: z.enum(["true", "false"]).optional(),
	$filter: z.string().optional(),
	$orderby: z.string().optional(),
});

// --- GET /contacts ---
contactRegistry.register("Contact", ContactSchema);

contactRegistry.registerPath({
	method: "get",
	path: "/contacts",
	tags: ["Contacts"],
	request: { query: ContactListQuerySchema },
	responses: createApiResponse(PaginatedListSchema(ContactSchema), "Success"),
});

contactRouter.get("/", requireAuth, contactController.getContacts);

// --- GET /contacts/channel-types (before /:id so it is not shadowed) ---
contactRegistry.register("ChannelType", ChannelTypeSchema);

contactRegistry.registerPath({
	method: "get",
	path: "/contacts/channel-types",
	tags: ["Contacts"],
	responses: createApiResponse(z.array(ChannelTypeSchema), "Success"),
});

contactRouter.get("/channel-types", requireAuth, contactController.getChannelTypes);

// --- GET /contacts/:id ---
contactRegistry.register("ContactDetail", ContactDetailSchema);

contactRegistry.registerPath({
	method: "get",
	path: "/contacts/{id}",
	tags: ["Contacts"],
	request: { params: GetContactSchema.shape.params },
	responses: createApiResponse(ContactDetailSchema, "Success"),
});

contactRouter.get("/:id", requireAuth, validateRequest(GetContactSchema), contactController.getContact);

// --- POST /contacts ---
contactRegistry.registerPath({
	method: "post",
	path: "/contacts",
	tags: ["Contacts"],
	request: { body: { content: { "application/json": { schema: CreateContactSchema.shape.body } } } },
	responses: createApiResponse(ContactDetailSchema, "Created", 201),
});

contactRouter.post("/", requireAuth, validateRequest(CreateContactSchema), contactController.createContact);

// --- PUT /contacts/:id ---
contactRegistry.registerPath({
	method: "put",
	path: "/contacts/{id}",
	tags: ["Contacts"],
	request: {
		params: UpdateContactSchema.shape.params,
		body: { content: { "application/json": { schema: UpdateContactSchema.shape.body } } },
	},
	responses: createApiResponse(ContactDetailSchema, "Updated"),
});

contactRouter.put("/:id", requireAuth, validateRequest(UpdateContactSchema), contactController.updateContact);

// --- DELETE /contacts/:id ---
contactRegistry.registerPath({
	method: "delete",
	path: "/contacts/{id}",
	tags: ["Contacts"],
	request: { params: GetContactSchema.shape.params },
	responses: createApiResponse(z.null(), "Deleted"),
});

contactRouter.delete("/:id", requireAuth, validateRequest(GetContactSchema), contactController.deleteContact);

// --- POST /contacts/:id/addresses ---
contactRegistry.registerPath({
	method: "post",
	path: "/contacts/{id}/addresses",
	tags: ["Contacts"],
	request: {
		params: CreateAddressSchema.shape.params,
		body: { content: { "application/json": { schema: AddressInputSchema } } },
	},
	responses: createApiResponse(AddressSchema, "Created", 201),
});

contactRouter.post("/:id/addresses", requireAuth, validateRequest(CreateAddressSchema), contactController.addAddress);

// --- DELETE /contacts/:id/addresses/:addressId ---
contactRegistry.registerPath({
	method: "delete",
	path: "/contacts/{id}/addresses/{addressId}",
	tags: ["Contacts"],
	request: { params: DeleteAddressSchema.shape.params },
	responses: createApiResponse(z.null(), "Deleted"),
});

contactRouter.delete(
	"/:id/addresses/:addressId",
	requireAuth,
	validateRequest(DeleteAddressSchema),
	contactController.removeAddress,
);

// --- POST /contacts/:id/channels ---
contactRegistry.registerPath({
	method: "post",
	path: "/contacts/{id}/channels",
	tags: ["Contacts"],
	request: {
		params: CreateChannelSchema.shape.params,
		body: { content: { "application/json": { schema: ChannelInputSchema } } },
	},
	responses: createApiResponse(ChannelSchema, "Created", 201),
});

contactRouter.post("/:id/channels", requireAuth, validateRequest(CreateChannelSchema), contactController.addChannel);

// --- DELETE /contacts/:id/channels/:channelId ---
contactRegistry.registerPath({
	method: "delete",
	path: "/contacts/{id}/channels/{channelId}",
	tags: ["Contacts"],
	request: { params: DeleteChannelSchema.shape.params },
	responses: createApiResponse(z.null(), "Deleted"),
});

contactRouter.delete(
	"/:id/channels/:channelId",
	requireAuth,
	validateRequest(DeleteChannelSchema),
	contactController.removeChannel,
);

// --- PUT /contacts/:id/cv ---
// Replaces the whole CV (titulations + experiences) in one batch. A per-line
// API (POST/DELETE /titulations/:titulationId, same pattern as the address and
// channel sub-resources) could be added for single-line mutations; see the note
// in contactModel.ts.
contactRegistry.register("Titulation", TitulationSchema);
contactRegistry.register("Experience", ExperienceSchema);

contactRegistry.registerPath({
	method: "put",
	path: "/contacts/{id}/cv",
	tags: ["Contacts"],
	request: {
		params: ReplaceCvSchema.shape.params,
		body: {
			content: { "application/json": { schema: ReplaceCvSchema.shape.body } },
		},
	},
	responses: createApiResponse(ContactDetailSchema, "Updated"),
});

contactRouter.put("/:id/cv", requireAuth, validateRequest(ReplaceCvSchema), contactController.replaceCv);
