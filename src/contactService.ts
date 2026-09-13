import type { FilterNode, FilterValue, PaginatedList, PaginationQuery } from "@alxarafe/core";
import { buildPaginationMeta, logger, parseFilter, ServiceResponse } from "@alxarafe/core";
import type { Prisma } from "@alxarafe/database";
import { StatusCodes } from "http-status-codes";

import type {
	Address,
	AddressInput,
	Channel,
	ChannelInput,
	ChannelTypeRecord,
	Contact,
	ContactDetail,
	CvInput,
	CreateContactInput,
	Experience,
	ExperienceInput,
	Titulation,
	TitulationInput,
	UpdateContactInput,
} from "./contactModel.js";
import {
	type AddressRecord,
	type ChannelRecord,
	type ContactRepository,
	type ContactWithDetails,
	type ExperienceRecord,
	PrismaContactRepository,
	type TitulationRecord,
} from "./contactRepository.js";

const FILTERABLE_FIELDS = ["id", "name", "notes", "isCustomer", "createdAt", "updatedAt"] as const;
type FilterableField = (typeof FILTERABLE_FIELDS)[number];

class ChannelTypeNotFoundError extends Error {}

function isUniqueConstraintError(ex: unknown): boolean {
	return (ex as { code?: string })?.code === "P2002";
}

function toAddressCreate(input: AddressInput): Prisma.AddressCreateWithoutContactInput {
	return {
		label: input.label ?? undefined,
		street: input.street,
		city: input.city,
		state: input.state ?? undefined,
		postalCode: input.postalCode ?? undefined,
		country: input.country,
	};
}

function coerceFilterValue(field: FilterableField, value: FilterValue): unknown {
	if (value === null) {
		return null;
	}
	if (field === "id") {
		return Number(value);
	}
	if (field === "createdAt" || field === "updatedAt") {
		return new Date(String(value));
	}
	if (field === "isCustomer") {
		if (typeof value === "boolean") {
			return value;
		}
		return String(value).toLowerCase() === "true";
	}
	return value;
}

function conditionToWhere(condition: {
	field: string;
	operator: string;
	value: FilterValue;
}): Prisma.ContactWhereInput {
	const field = condition.field as FilterableField;
	const value = coerceFilterValue(field, condition.value);

	switch (condition.operator) {
		case "eq":
			return value === null ? { [field]: null } : { [field]: value };
		case "ne":
			return value === null ? { [field]: { not: null } } : { [field]: { not: value } };
		case "gt":
			return { [field]: { gt: value } };
		case "ge":
			return { [field]: { gte: value } };
		case "lt":
			return { [field]: { lt: value } };
		case "le":
			return { [field]: { lte: value } };
		case "contains":
			return { [field]: { contains: value } };
		case "startswith":
			return { [field]: { startsWith: value } };
		case "endswith":
			return { [field]: { endsWith: value } };
		default:
			return {};
	}
}

function filterToWhere(node: FilterNode): Prisma.ContactWhereInput {
	if (node.type === "group") {
		const children = node.children.map(filterToWhere);
		if (children.length === 1) {
			return children[0];
		}
		return node.logic === "and" ? { AND: children } : { OR: children };
	}

	const { field, operator, value } = node;
	if (!FILTERABLE_FIELDS.includes(field as FilterableField)) {
		throw new Error(`Invalid $filter: field "${field}" is not filterable`);
	}
	return conditionToWhere({ field, operator, value });
}

function orderByToPrisma(orderBy: string): Prisma.ContactOrderByWithRelationInput[] {
	return orderBy.split(",").map((part) => {
		const [field, direction] = part.trim().split(/\s+/);
		if (!field || !FILTERABLE_FIELDS.includes(field as FilterableField)) {
			throw new Error(`Invalid $orderby: field "${field ?? ""}" is not sortable`);
		}
		const dir = direction?.toLowerCase() === "desc" ? "desc" : "asc";
		return { [field]: dir } as Prisma.ContactOrderByWithRelationInput;
	});
}

function toAddress(record: AddressRecord): Address {
	return {
		id: record.id,
		label: record.label,
		street: record.street,
		city: record.city,
		state: record.state,
		postalCode: record.postalCode,
		country: record.country,
	};
}

function toChannel(record: ChannelRecord): Channel {
	return {
		id: record.id,
		channelTypeId: record.channelTypeId,
		channelTypeName: record.channelType.name,
		value: record.value,
		label: record.label,
	};
}

function toTitulation(record: TitulationRecord): Titulation {
	return {
		id: record.id,
		title: record.title,
		institution: record.institution,
		year: record.year,
		grade: record.grade,
	};
}

function toExperience(record: ExperienceRecord): Experience {
	return {
		id: record.id,
		role: record.role,
		company: record.company,
		yearFrom: record.yearFrom,
		yearTo: record.yearTo,
		level: record.level,
	};
}

function toContact(record: {
	id: number;
	name: string;
	notes: string | null;
	isCustomer: boolean;
	createdAt: Date;
	updatedAt: Date;
}): Contact {
	return {
		id: record.id,
		name: record.name,
		notes: record.notes,
		isCustomer: record.isCustomer,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function toContactDetail(record: ContactWithDetails): ContactDetail {
	return {
		...toContact(record),
		addresses: record.addresses.map(toAddress),
		channels: record.channels.map(toChannel),
		titulations: record.titulations.map(toTitulation),
		experiences: record.experiences.map(toExperience),
	};
}

export class ContactService {
	private contactRepository: ContactRepository;

	constructor(repository: ContactRepository = new PrismaContactRepository()) {
		this.contactRepository = repository;
	}

	async findAll(query: PaginationQuery, basePath: string): Promise<ServiceResponse<PaginatedList<Contact> | null>> {
		try {
			const where: Prisma.ContactWhereInput = query.filter ? filterToWhere(parseFilter(query.filter)) : {};
			const orderBy: Prisma.ContactOrderByWithRelationInput[] = query.orderBy
				? orderByToPrisma(query.orderBy)
				: [{ id: "asc" }];

			const [records, totalCount] = await Promise.all([
				this.contactRepository.findAllAsync({ where, orderBy, skip: query.offset, take: query.limit }),
				query.includeCount ? this.contactRepository.countAsync(where) : Promise.resolve(undefined),
			]);

			const pagination = buildPaginationMeta({
				limit: query.limit,
				offset: query.offset,
				returnedCount: records.length,
				totalCount,
				includeCount: query.includeCount,
				basePath,
				filter: query.filter,
				orderBy: query.orderBy,
			});

			return ServiceResponse.success<PaginatedList<Contact>>("Contacts found", {
				data: records.map(toContact),
				pagination,
			});
		} catch (ex) {
			const message = (ex as Error).message;
			if (message.startsWith("Invalid $filter") || message.startsWith("Invalid $orderby")) {
				return ServiceResponse.failure(message, null, StatusCodes.BAD_REQUEST);
			}
			logger.error(`Error finding all contacts: ${message}`);
			return ServiceResponse.failure(
				"An error occurred while retrieving contacts.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async findById(id: number): Promise<ServiceResponse<ContactDetail | null>> {
		try {
			const record = await this.contactRepository.findByIdAsync(id);
			if (!record) {
				return ServiceResponse.failure("Contact not found", null, StatusCodes.NOT_FOUND);
			}
			return ServiceResponse.success<ContactDetail>("Contact found", toContactDetail(record));
		} catch (ex) {
			logger.error(`Error finding contact with id ${id}: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while finding contact.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async create(input: CreateContactInput): Promise<ServiceResponse<ContactDetail | null>> {
		try {
			const data: Prisma.ContactCreateInput = {
				name: input.name,
				notes: input.notes ?? null,
			};
			if (input.isCustomer !== undefined) data.isCustomer = input.isCustomer;
			if (input.addresses?.length) {
				data.addresses = { create: input.addresses.map(toAddressCreate) };
			}
			if (input.channels?.length) {
				const resolved = await this.resolveChannelInputs(input.channels);
				data.channels = { create: resolved.map((channel) => toChannelCreate(channel)) };
			}
			const record = await this.contactRepository.createAsync(data);
			return ServiceResponse.success<ContactDetail>("Contact created", toContactDetail(record), StatusCodes.CREATED);
		} catch (ex) {
			return this.mapServiceError("creating", ex);
		}
	}

	async update(id: number, input: UpdateContactInput): Promise<ServiceResponse<ContactDetail | null>> {
		try {
			const existing = await this.contactRepository.findByIdAsync(id);
			if (!existing) {
				return ServiceResponse.failure("Contact not found", null, StatusCodes.NOT_FOUND);
			}
			const data: Prisma.ContactUpdateInput = {};
			if (input.name !== undefined) data.name = input.name;
			if (input.notes !== undefined) data.notes = input.notes;
			if (input.isCustomer !== undefined) data.isCustomer = input.isCustomer;
			if (input.addresses !== undefined) {
				data.addresses = { deleteMany: {}, create: input.addresses.map(toAddressCreate) };
			}
			if (input.channels !== undefined) {
				const resolved = await this.resolveChannelInputs(input.channels);
				data.channels = { deleteMany: {}, create: resolved.map((channel) => toChannelCreate(channel)) };
			}
			const record = await this.contactRepository.updateAsync(id, data);
			return ServiceResponse.success<ContactDetail>("Contact updated", toContactDetail(record));
		} catch (ex) {
			return this.mapServiceError("updating", ex);
		}
	}

	async remove(id: number): Promise<ServiceResponse<null>> {
		try {
			const existing = await this.contactRepository.findByIdAsync(id);
			if (!existing) {
				return ServiceResponse.failure("Contact not found", null, StatusCodes.NOT_FOUND);
			}
			await this.contactRepository.deleteAsync(id);
			return ServiceResponse.success<null>("Contact deleted", null);
		} catch (ex) {
			logger.error(`Error deleting contact with id ${id}: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while deleting contact.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	/**
	 * Replaces the whole CV in one call (deleteMany + create, atomic via Prisma
	 * update). Alternative per-line API (POST/DELETE titulations/experiences,
	 * like addresses/channels) could be added later for single-line mutations;
	 * see the note in contactModel.ts and the router.
	 */
	async replaceCv(contactId: number, input: CvInput): Promise<ServiceResponse<ContactDetail | null>> {
		try {
			const existing = await this.contactRepository.findByIdAsync(contactId);
			if (!existing) {
				return ServiceResponse.failure("Contact not found", null, StatusCodes.NOT_FOUND);
			}
			const data: Prisma.ContactUpdateInput = {
				titulations: {
					deleteMany: {},
					create: input.titulations.map(toTitulationCreate),
				},
				experiences: {
					deleteMany: {},
					create: input.experiences.map(toExperienceCreate),
				},
			};
			const record = await this.contactRepository.updateAsync(contactId, data);
			return ServiceResponse.success<ContactDetail>("CV replaced", toContactDetail(record));
		} catch (ex) {
			return this.mapServiceError("replacing CV", ex);
		}
	}

	async addAddress(contactId: number, input: AddressInput): Promise<ServiceResponse<Address | null>> {
		try {
			const existing = await this.contactRepository.findByIdAsync(contactId);
			if (!existing) {
				return ServiceResponse.failure("Contact not found", null, StatusCodes.NOT_FOUND);
			}
			const record = await this.contactRepository.createAddressAsync(contactId, toAddressCreate(input));
			return ServiceResponse.success<Address>("Address added", toAddress(record), StatusCodes.CREATED);
		} catch (ex) {
			return this.mapServiceError("adding address", ex);
		}
	}

	async addChannel(contactId: number, input: ChannelInput): Promise<ServiceResponse<Channel | null>> {
		try {
			const existing = await this.contactRepository.findByIdAsync(contactId);
			if (!existing) {
				return ServiceResponse.failure("Contact not found", null, StatusCodes.NOT_FOUND);
			}
			const [resolved] = await this.resolveChannelInputs([input]);
			const record = await this.contactRepository.createChannelAsync(
				contactId,
				resolved.channelTypeId,
				resolved.value,
				resolved.label,
			);
			return ServiceResponse.success<Channel>("Channel added", toChannel(record), StatusCodes.CREATED);
		} catch (ex) {
			return this.mapServiceError("adding channel", ex);
		}
	}

	async removeAddress(contactId: number, addressId: number): Promise<ServiceResponse<null>> {
		try {
			const deleted = await this.contactRepository.deleteAddressAsync(contactId, addressId);
			if (!deleted) {
				return ServiceResponse.failure("Address not found on contact", null, StatusCodes.NOT_FOUND);
			}
			return ServiceResponse.success<null>("Address deleted", null);
		} catch (ex) {
			logger.error(`Error deleting address ${addressId} from contact ${contactId}: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while deleting address.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async removeChannel(contactId: number, channelId: number): Promise<ServiceResponse<null>> {
		try {
			const deleted = await this.contactRepository.deleteChannelAsync(contactId, channelId);
			if (!deleted) {
				return ServiceResponse.failure("Channel not found on contact", null, StatusCodes.NOT_FOUND);
			}
			return ServiceResponse.success<null>("Channel deleted", null);
		} catch (ex) {
			logger.error(`Error deleting channel ${channelId} from contact ${contactId}: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while deleting channel.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async listChannelTypes(): Promise<ServiceResponse<ChannelTypeRecord[] | null>> {
		try {
			const records = await this.contactRepository.listChannelTypesAsync();
			return ServiceResponse.success<ChannelTypeRecord[]>("Channel types found", records);
		} catch (ex) {
			logger.error(`Error listing channel types: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while retrieving channel types.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	private mapServiceError(operation: string, ex: unknown): ServiceResponse<null> {
		if (ex instanceof ChannelTypeNotFoundError) {
			return ServiceResponse.failure(ex.message, null, StatusCodes.BAD_REQUEST);
		}
		if (isUniqueConstraintError(ex)) {
			return ServiceResponse.failure(
				"A channel with the same type and value already exists for this contact.",
				null,
				StatusCodes.CONFLICT,
			);
		}
		logger.error(`Error ${operation}: ${(ex as Error).message}`);
		return ServiceResponse.failure(
			`An error occurred while ${operation} contact.`,
			null,
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	private async resolveChannelInputs(channels: ChannelInput[]): Promise<ChannelResolved[]> {
		const resolved: ChannelResolved[] = [];
		for (const channel of channels) {
			let channelTypeId = channel.channelTypeId;
			if (channelTypeId === undefined) {
				const record = await this.contactRepository.findOrCreateChannelTypeAsync(channel.channelTypeName as string);
				channelTypeId = record.id;
			} else {
				const existing = await this.contactRepository.findChannelTypeByIdAsync(channelTypeId);
				if (!existing) {
					throw new ChannelTypeNotFoundError(`Channel type ${channelTypeId} does not exist`);
				}
			}
			resolved.push({ channelTypeId, value: channel.value, label: channel.label ?? null });
		}
		return resolved;
	}
}

interface ChannelResolved {
	channelTypeId: number;
	value: string;
	label: string | null;
}

function toChannelCreate(channel: ChannelResolved): Prisma.ChannelCreateWithoutContactInput {
	return {
		channelType: { connect: { id: channel.channelTypeId } },
		value: channel.value,
		label: channel.label,
	};
}

function toTitulationCreate(title: TitulationInput): Prisma.TitulationCreateWithoutContactInput {
	return {
		title: title.title,
		institution: title.institution ?? undefined,
		year: title.year ?? undefined,
		grade: title.grade ?? undefined,
	};
}

function toExperienceCreate(experience: ExperienceInput): Prisma.ExperienceCreateWithoutContactInput {
	return {
		role: experience.role,
		company: experience.company ?? undefined,
		yearFrom: experience.yearFrom ?? undefined,
		yearTo: experience.yearTo ?? undefined,
		level: experience.level ?? undefined,
	};
}

export const contactService = new ContactService();
