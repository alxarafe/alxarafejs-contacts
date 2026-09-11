import type { FilterNode, FilterValue, PaginatedList, PaginationQuery } from "@alxarafe/core";
import { buildPaginationMeta, logger, parseFilter, ServiceResponse } from "@alxarafe/core";
import type { Prisma } from "@alxarafe/database";
import { StatusCodes } from "http-status-codes";

import type { Contact, ContactDetail, CreateContactInput, UpdateContactInput } from "./contactModel.js";
import { ContactRepository, type ContactWithDetails } from "./contactRepository.js";

const FILTERABLE_FIELDS = ["id", "name", "notes", "createdAt", "updatedAt"] as const;
type FilterableField = (typeof FILTERABLE_FIELDS)[number];

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

function toContact(record: {
	id: number;
	name: string;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}): Contact {
	return {
		id: record.id,
		name: record.name,
		notes: record.notes,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function toContactDetail(record: ContactWithDetails): ContactDetail {
	return {
		...toContact(record),
		addresses: record.addresses.map((a) => ({
			id: a.id,
			label: a.label,
			street: a.street,
			city: a.city,
			state: a.state,
			postalCode: a.postalCode,
			country: a.country,
		})),
		channels: record.channels.map((c) => ({
			id: c.id,
			channelTypeId: c.channelTypeId,
			channelTypeName: c.channelType.name,
			value: c.value,
			label: c.label,
		})),
	};
}

export class ContactService {
	private contactRepository: ContactRepository;

	constructor(repository: ContactRepository = new ContactRepository()) {
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

	async create(input: CreateContactInput): Promise<ServiceResponse<Contact | null>> {
		try {
			const record = await this.contactRepository.createAsync({ name: input.name, notes: input.notes ?? null });
			return ServiceResponse.success<Contact>("Contact created", toContact(record), StatusCodes.CREATED);
		} catch (ex) {
			logger.error(`Error creating contact: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while creating contact.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async update(id: number, input: UpdateContactInput): Promise<ServiceResponse<Contact | null>> {
		try {
			const existing = await this.contactRepository.findByIdAsync(id);
			if (!existing) {
				return ServiceResponse.failure("Contact not found", null, StatusCodes.NOT_FOUND);
			}
			const data: Prisma.ContactUpdateInput = {};
			if (input.name !== undefined) data.name = input.name;
			if (input.notes !== undefined) data.notes = input.notes;
			const record = await this.contactRepository.updateAsync(id, data);
			return ServiceResponse.success<Contact>("Contact updated", toContact(record));
		} catch (ex) {
			logger.error(`Error updating contact with id ${id}: ${(ex as Error).message}`);
			return ServiceResponse.failure(
				"An error occurred while updating contact.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
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
}

export const contactService = new ContactService();
