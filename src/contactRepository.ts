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
}

export class ContactRepository {
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
			include: {
				addresses: { orderBy: { label: "asc" } },
				channels: { include: { channelType: true }, orderBy: { channelTypeId: "asc" } },
			},
		}) as Promise<ContactWithDetails | null>;
	}

	async createAsync(
		data: Prisma.ContactCreateInput,
	): Promise<{ id: number; name: string; notes: string | null; createdAt: Date; updatedAt: Date }> {
		return prisma.contact.create({ data });
	}

	async updateAsync(
		id: number,
		data: Prisma.ContactUpdateInput,
	): Promise<{ id: number; name: string; notes: string | null; createdAt: Date; updatedAt: Date }> {
		return prisma.contact.update({ where: { id }, data });
	}

	async deleteAsync(id: number): Promise<void> {
		await prisma.contact.delete({ where: { id } });
	}
}
