import { StatusCodes } from "http-status-codes";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContactWithDetails } from "../contactRepository.js";
import { ContactService } from "../contactService.js";

function makeContact(overrides: Partial<ContactWithDetails> = {}): ContactWithDetails {
	return {
		id: 1,
		name: "Ada",
		notes: null,
		createdAt: new Date("2026-01-01T10:00:00.000Z"),
		updatedAt: new Date("2026-01-01T10:00:00.000Z"),
		addresses: [],
		channels: [],
		...overrides,
	};
}

function createFakeRepository(overrides: Record<string, unknown> = {}) {
	return {
		findAllAsync: vi.fn(async () => []),
		countAsync: vi.fn(async () => 0),
		findByIdAsync: vi.fn(async () => null),
		createAsync: vi.fn(async () => null),
		updateAsync: vi.fn(async () => null),
		deleteAsync: vi.fn(async () => undefined),
		createAddressAsync: vi.fn(async () => null),
		createChannelAsync: vi.fn(async () => null),
		deleteAddressAsync: vi.fn(async () => false),
		deleteChannelAsync: vi.fn(async () => false),
		findChannelTypeByIdAsync: vi.fn(async () => null),
		findOrCreateChannelTypeAsync: vi.fn(async () => null),
		listChannelTypesAsync: vi.fn(async () => []),
		...overrides,
	};
}

const contact = makeContact();
const withAddress = makeContact({
	addresses: [
		{
			id: 11,
			label: "casa",
			street: "C/ Ejemplo 1",
			city: "Madrid",
			state: null,
			postalCode: "28001",
			country: "ES",
		},
	],
});
const withChannel = makeContact({
	channels: [
		{
			id: 21,
			channelTypeId: 2,
			channelType: { name: "PHONE" },
			value: "+34600000000",
			label: "móvil",
		},
	],
});
const phoneType = { id: 2, name: "PHONE", description: null };
const emailType = { id: 3, name: "EMAIL", description: null };

describe("ContactService.create", () => {
	let fakeRepo: ReturnType<typeof createFakeRepository>;
	let service: ContactService;

	beforeEach(() => {
		fakeRepo = createFakeRepository();
		service = new ContactService(fakeRepo as never);
	});

	it("creates a plain contact when no addresses/channels are provided", async () => {
		fakeRepo.createAsync.mockResolvedValue(contact);
		const response = await service.create({ name: "Ada" });
		expect(fakeRepo.createAsync).toHaveBeenCalledWith({ name: "Ada", notes: null });
		expect(response.statusCode).toBe(StatusCodes.CREATED);
		expect(response.responseObject?.name).toBe("Ada");
	});

	it("creates nested addresses and resolves channel types by name", async () => {
		fakeRepo.createAsync.mockResolvedValue(withChannel);
		fakeRepo.findOrCreateChannelTypeAsync.mockResolvedValue(emailType);

		const response = await service.create({
			name: "Ada",
			addresses: [{ street: "C/ Ejemplo 1", city: "Madrid", country: "ES" }],
			channels: [{ channelTypeName: "EMAIL", value: "ada@example.com" }],
		});

		expect(fakeRepo.findOrCreateChannelTypeAsync).toHaveBeenCalledWith("EMAIL");
		expect(fakeRepo.createAsync).toHaveBeenCalledWith({
			name: "Ada",
			notes: null,
			addresses: { create: [{ street: "C/ Ejemplo 1", city: "Madrid", country: "ES" }] },
			channels: { create: [{ channelType: { connect: { id: 3 } }, value: "ada@example.com", label: null }] },
		});
		expect(response.statusCode).toBe(StatusCodes.CREATED);
		expect(response.responseObject?.channels[0].channelTypeName).toBe("PHONE");
	});

	it("resolves channels by channelTypeId without creating the type", async () => {
		fakeRepo.createAsync.mockResolvedValue(contact);
		fakeRepo.findChannelTypeByIdAsync.mockResolvedValue(phoneType);

		const response = await service.create({
			name: "Ada",
			channels: [{ channelTypeId: 2, value: "+34600000000" }],
		});

		expect(fakeRepo.findChannelTypeByIdAsync).toHaveBeenCalledWith(2);
		expect(fakeRepo.findOrCreateChannelTypeAsync).not.toHaveBeenCalled();
		expect(fakeRepo.createAsync).toHaveBeenCalledWith({
			name: "Ada",
			notes: null,
			channels: { create: [{ channelType: { connect: { id: 2 } }, value: "+34600000000", label: null }] },
		});
		expect(response.statusCode).toBe(StatusCodes.CREATED);
	});

	it("rejects an unknown channelTypeId with 400 and does not create", async () => {
		fakeRepo.findChannelTypeByIdAsync.mockResolvedValue(null);

		const response = await service.create({
			name: "Ada",
			channels: [{ channelTypeId: 99, value: "+34600000000" }],
		});

		expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
		expect(fakeRepo.createAsync).not.toHaveBeenCalled();
	});

	it("maps a unique constraint violation to 409", async () => {
		fakeRepo.createAsync.mockRejectedValue({
			code: "P2002",
			meta: { target: ["contactId", "channelTypeId", "value"] },
		});
		fakeRepo.findOrCreateChannelTypeAsync.mockResolvedValue(emailType);

		const response = await service.create({
			name: "Ada",
			channels: [{ channelTypeName: "EMAIL", value: "ada@example.com" }],
		});

		expect(response.statusCode).toBe(StatusCodes.CONFLICT);
		expect(response.message).toContain("already exists");
	});
});

describe("ContactService.update", () => {
	let fakeRepo: ReturnType<typeof createFakeRepository>;
	let service: ContactService;

	beforeEach(() => {
		fakeRepo = createFakeRepository();
		service = new ContactService(fakeRepo as never);
	});

	it("returns 404 when the contact does not exist", async () => {
		fakeRepo.findByIdAsync.mockResolvedValue(null);
		const response = await service.update(42, { name: "New" });
		expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
		expect(fakeRepo.updateAsync).not.toHaveBeenCalled();
	});

	it("replaces addresses and channels when provided", async () => {
		fakeRepo.findByIdAsync.mockResolvedValue(contact);
		fakeRepo.updateAsync.mockResolvedValue(withAddress);
		fakeRepo.findOrCreateChannelTypeAsync.mockResolvedValue(emailType);

		const response = await service.update(1, {
			addresses: [{ street: "Av. Nueva 2", city: "Barcelona", country: "ES" }],
			channels: [{ channelTypeName: "EMAIL", value: "nuevo@example.com" }],
		});

		expect(fakeRepo.updateAsync).toHaveBeenCalledWith(1, {
			addresses: {
				deleteMany: {},
				create: [{ street: "Av. Nueva 2", city: "Barcelona", country: "ES" }],
			},
			channels: {
				deleteMany: {},
				create: [{ channelType: { connect: { id: 3 } }, value: "nuevo@example.com", label: null }],
			},
		});
		expect(response.statusCode).toBe(StatusCodes.OK);
		expect(response.responseObject?.addresses).toHaveLength(1);
	});

	it("updates only the provided fields when no collections are sent", async () => {
		fakeRepo.findByIdAsync.mockResolvedValue(contact);
		fakeRepo.updateAsync.mockResolvedValue({ ...contact, name: "New" });

		const response = await service.update(1, { name: "New" });

		expect(fakeRepo.updateAsync).toHaveBeenCalledWith(1, { name: "New" });
		expect(response.responseObject?.name).toBe("New");
	});
});

describe("ContactService.addAddress", () => {
	it("adds an address to an existing contact", async () => {
		const fakeRepo = createFakeRepository({ findByIdAsync: vi.fn(async () => contact) });
		fakeRepo.createAddressAsync.mockResolvedValue(withAddress.addresses[0]);
		const service = new ContactService(fakeRepo as never);

		const response = await service.addAddress(1, { street: "C/ Ejemplo 1", city: "Madrid", country: "ES" });

		expect(fakeRepo.createAddressAsync).toHaveBeenCalledWith(1, {
			street: "C/ Ejemplo 1",
			city: "Madrid",
			country: "ES",
		});
		expect(response.statusCode).toBe(StatusCodes.CREATED);
		expect(response.responseObject?.street).toBe("C/ Ejemplo 1");
	});

	it("returns 404 when the contact does not exist", async () => {
		const fakeRepo = createFakeRepository();
		const service = new ContactService(fakeRepo as never);

		const response = await service.addAddress(42, { street: "X", city: "Y", country: "ES" });

		expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
		expect(fakeRepo.createAddressAsync).not.toHaveBeenCalled();
	});
});

describe("ContactService.addChannel", () => {
	let fakeRepo: ReturnType<typeof createFakeRepository>;
	let service: ContactService;

	beforeEach(() => {
		fakeRepo = createFakeRepository();
		service = new ContactService(fakeRepo as never);
	});

	it("resolves the type by name and adds the channel", async () => {
		fakeRepo.findByIdAsync.mockResolvedValue(contact);
		fakeRepo.findOrCreateChannelTypeAsync.mockResolvedValue(phoneType);
		fakeRepo.createChannelAsync.mockResolvedValue(withChannel.channels[0]);

		const response = await service.addChannel(1, { channelTypeName: "PHONE", value: "+34600000000", label: "móvil" });

		expect(fakeRepo.createChannelAsync).toHaveBeenCalledWith(1, 2, "+34600000000", "móvil");
		expect(response.statusCode).toBe(StatusCodes.CREATED);
		expect(response.responseObject?.channelTypeName).toBe("PHONE");
	});

	it("maps a duplicate channel to 409", async () => {
		fakeRepo.findByIdAsync.mockResolvedValue(contact);
		fakeRepo.findOrCreateChannelTypeAsync.mockResolvedValue(emailType);
		fakeRepo.createChannelAsync.mockRejectedValue({ code: "P2002" });

		const response = await service.addChannel(1, { channelTypeName: "EMAIL", value: "ada@example.com" });

		expect(response.statusCode).toBe(StatusCodes.CONFLICT);
	});

	it("returns 404 when the contact does not exist", async () => {
		fakeRepo.findByIdAsync.mockResolvedValue(null);

		const response = await service.addChannel(42, { channelTypeName: "PHONE", value: "+34600000000" });

		expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
		expect(fakeRepo.createChannelAsync).not.toHaveBeenCalled();
	});

	it("returns 400 for an unknown channelTypeId", async () => {
		fakeRepo.findByIdAsync.mockResolvedValue(contact);
		fakeRepo.findChannelTypeByIdAsync.mockResolvedValue(null);

		const response = await service.addChannel(1, { channelTypeId: 99, value: "+34600000000" });

		expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
	});
});

describe("ContactService.removeAddress / removeChannel", () => {
	it("removes an address that belongs to the contact", async () => {
		const fakeRepo = createFakeRepository({ deleteAddressAsync: vi.fn(async () => true) });
		const service = new ContactService(fakeRepo as never);

		const response = await service.removeAddress(1, 11);

		expect(fakeRepo.deleteAddressAsync).toHaveBeenCalledWith(1, 11);
		expect(response.statusCode).toBe(StatusCodes.OK);
	});

	it("returns 404 when the address does not belong to the contact", async () => {
		const fakeRepo = createFakeRepository({ deleteAddressAsync: vi.fn(async () => false) });
		const service = new ContactService(fakeRepo as never);

		const response = await service.removeAddress(1, 999);

		expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
	});

	it("removes a channel that belongs to the contact", async () => {
		const fakeRepo = createFakeRepository({ deleteChannelAsync: vi.fn(async () => true) });
		const service = new ContactService(fakeRepo as never);

		const response = await service.removeChannel(1, 21);

		expect(fakeRepo.deleteChannelAsync).toHaveBeenCalledWith(1, 21);
		expect(response.statusCode).toBe(StatusCodes.OK);
	});

	it("returns 404 when the channel does not belong to the contact", async () => {
		const fakeRepo = createFakeRepository({ deleteChannelAsync: vi.fn(async () => false) });
		const service = new ContactService(fakeRepo as never);

		const response = await service.removeChannel(1, 999);

		expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
	});
});

describe("ContactService.listChannelTypes", () => {
	it("returns the available channel types", async () => {
		const fakeRepo = createFakeRepository({ listChannelTypesAsync: vi.fn(async () => [phoneType, emailType]) });
		const service = new ContactService(fakeRepo as never);

		const response = await service.listChannelTypes();

		expect(response.statusCode).toBe(StatusCodes.OK);
		expect(response.responseObject).toEqual([phoneType, emailType]);
	});
});
