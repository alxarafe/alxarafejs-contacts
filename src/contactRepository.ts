import type { Prisma } from "@alxarafe/database";
import { prisma } from "@alxarafe/database";

export interface ContactListParams {
	where?: Prisma.ContactWhereInput;
	orderBy?: Prisma.ContactOrderByWithRelationInput[];
	skip?: number;
	take?: number;
}

export interface ContactWithAddresses {
	id: number;
	name: string;
	notes: string | null;
	isCustomer: boolean;
	createdAt: Date;
	updatedAt: Date;
	addresses: {
		id: number;
		label: string | null;
		street: string;
		city: string;
		state: string | null;
		postalCode: string | null;
		country: string;
	}[];
}

export interface ContactWithDetails extends ContactWithAddresses {
	channels: {
		id: number;
		channelTypeId: number;
		channelType: { name: string };
		value: string;
		label: string | null;
	}[];
	titulations: TitulationRecord[];
	experiences: ExperienceRecord[];
}

export interface TitulationRecord {
	id: number;
	title: string;
	institution: string | null;
	year: number | null;
	grade: number | null;
}

export interface ExperienceRecord {
	id: number;
	role: string;
	company: string | null;
	yearFrom: number | null;
	yearTo: number | null;
	level: number | null;
}

export interface AddressRecord {
	id: number;
	label: string | null;
	street: string;
	city: string;
	state: string | null;
	postalCode: string | null;
	country: string;
}

export interface ChannelRecord {
	id: number;
	channelTypeId: number;
	channelType: { name: string };
	value: string;
	label: string | null;
}

export interface ChannelTypeRecord {
	id: number;
	name: string;
	description: string | null;
}

export const CONTACT_DETAIL_INCLUDE = {
	addresses: { orderBy: { id: "asc" } },
	channels: { include: { channelType: true }, orderBy: { id: "asc" } },
	titulations: { orderBy: { id: "asc" } },
	experiences: { orderBy: { id: "asc" } },
} satisfies Prisma.ContactInclude;

export interface ContactRepository {
	findAllAsync(params?: ContactListParams): Promise<ContactWithAddresses[]>;
	countAsync(where?: Prisma.ContactWhereInput): Promise<number>;
	findByIdAsync(id: number): Promise<ContactWithDetails | null>;
	createAsync(data: Prisma.ContactCreateInput): Promise<ContactWithDetails>;
	updateAsync(id: number, data: Prisma.ContactUpdateInput): Promise<ContactWithDetails>;
	deleteAsync(id: number): Promise<void>;
	createAddressAsync(contactId: number, data: Prisma.AddressCreateWithoutContactInput): Promise<AddressRecord>;
	createChannelAsync(contactId: number, channelTypeId: number, value: string, label: string | null): Promise<ChannelRecord>;
	deleteAddressAsync(contactId: number, addressId: number): Promise<boolean>;
	deleteChannelAsync(contactId: number, channelId: number): Promise<boolean>;
	findChannelTypeByIdAsync(id: number): Promise<ChannelTypeRecord | null>;
	findOrCreateChannelTypeAsync(name: string): Promise<ChannelTypeRecord>;
	listChannelTypesAsync(): Promise<ChannelTypeRecord[]>;
}

export class PrismaContactRepository implements ContactRepository {
	async findAllAsync(params?: ContactListParams): Promise<ContactWithAddresses[]> {
		if (!params) {
			return prisma.contact.findMany({ include: { addresses: true }, orderBy: { id: "asc" } });
		}
		const { where, orderBy, skip, take } = params;
		return prisma.contact.findMany({ skip, take, where, orderBy, include: { addresses: true } });
	}

	async countAsync(where?: Prisma.ContactWhereInput): Promise<number> {
		return prisma.contact.count({ where });
	}

	async findByIdAsync(id: number): Promise<ContactWithDetails | null> {
		return prisma.contact.findUnique({
			where: { id },
			include: CONTACT_DETAIL_INCLUDE,
		}) as Promise<ContactWithDetails | null>;
	}

	async createAsync(data: Prisma.ContactCreateInput): Promise<ContactWithDetails> {
		return prisma.contact.create({ data, include: CONTACT_DETAIL_INCLUDE }) as Promise<ContactWithDetails>;
	}

	async updateAsync(id: number, data: Prisma.ContactUpdateInput): Promise<ContactWithDetails> {
		return prisma.contact.update({
			where: { id },
			data,
			include: CONTACT_DETAIL_INCLUDE,
		}) as Promise<ContactWithDetails>;
	}

	async deleteAsync(id: number): Promise<void> {
		await prisma.contact.delete({ where: { id } });
	}

	async createAddressAsync(contactId: number, data: Prisma.AddressCreateWithoutContactInput): Promise<AddressRecord> {
		return prisma.address.create({
			data: { ...data, contact: { connect: { id: contactId } } },
		}) as Promise<AddressRecord>;
	}

	async createChannelAsync(
		contactId: number,
		channelTypeId: number,
		value: string,
		label: string | null,
	): Promise<ChannelRecord> {
		return prisma.channel.create({
			data: {
				contact: { connect: { id: contactId } },
				channelType: { connect: { id: channelTypeId } },
				value,
				label,
			},
			include: { channelType: true },
		}) as Promise<ChannelRecord>;
	}

	async deleteAddressAsync(contactId: number, addressId: number): Promise<boolean> {
		const result = await prisma.address.deleteMany({ where: { id: addressId, contactId } });
		return result.count > 0;
	}

	async deleteChannelAsync(contactId: number, channelId: number): Promise<boolean> {
		const result = await prisma.channel.deleteMany({ where: { id: channelId, contactId } });
		return result.count > 0;
	}

	async findChannelTypeByIdAsync(id: number): Promise<ChannelTypeRecord | null> {
		return prisma.channelType.findUnique({ where: { id } });
	}

	async findOrCreateChannelTypeAsync(name: string): Promise<ChannelTypeRecord> {
		return prisma.channelType.upsert({
			where: { name },
			update: {},
			create: { name },
		}) as Promise<ChannelTypeRecord>;
	}

	async listChannelTypesAsync(): Promise<ChannelTypeRecord[]> {
		return prisma.channelType.findMany({ orderBy: { name: "asc" } });
	}
}
