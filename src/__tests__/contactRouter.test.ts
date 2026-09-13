import express from "express";
import { StatusCodes } from "http-status-codes";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { contactRouter } from "../contactRouter.js";

vi.mock("@alxarafe/users", () => ({
	requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
	requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const controller = vi.hoisted(() => {
	const handler =
		(label: string) =>
		(
			req: { params?: unknown; body?: unknown },
			res: { status: (code: number) => { send: (body: unknown) => void } },
		) => {
			res.status(200).send({ marker: label, params: req.params, body: req.body });
		};
	return {
		contactController: {
			getContacts: handler("get"),
			getContact: handler("getOne"),
			createContact: handler("create"),
			updateContact: handler("update"),
			deleteContact: handler("remove"),
			getChannelTypes: handler("channelTypes"),
			addAddress: handler("addAddress"),
			removeAddress: handler("removeAddress"),
			addChannel: handler("addChannel"),
			removeChannel: handler("removeChannel"),
			replaceCv: handler("replaceCv"),
		},
	};
});

vi.mock("../contactController.js", () => controller);

function buildApp() {
	const app = express();
	app.use(express.json());
	app.use("/contacts", contactRouter);
	return app;
}

describe("Contact API HTTP layer", () => {
	it("GET /contacts/channel-types is not shadowed by /:id", async () => {
		const response = await request(buildApp()).get("/contacts/channel-types");
		expect(response.status).toBe(StatusCodes.OK);
		expect(response.body.marker).toBe("channelTypes");
	});

	it("GET /contacts/:id rejects a non-numeric id", async () => {
		const response = await request(buildApp()).get("/contacts/abc");
		expect(response.status).toBe(StatusCodes.BAD_REQUEST);
		expect(response.body.success).toBe(false);
	});

	it("POST /contacts rejects an empty name", async () => {
		const response = await request(buildApp()).post("/contacts").send({ name: "" });
		expect(response.status).toBe(StatusCodes.BAD_REQUEST);
	});

	it("POST /contacts rejects a channel without a type", async () => {
		const response = await request(buildApp())
			.post("/contacts")
			.send({ name: "Ada", channels: [{ value: "+34600000000" }] });
		expect(response.status).toBe(StatusCodes.BAD_REQUEST);
	});

	it("POST /contacts accepts a nested create and forwards the body", async () => {
		const response = await request(buildApp())
			.post("/contacts")
			.send({
				name: "Ada",
				addresses: [{ street: "C/ X", city: "Madrid", country: "ES" }],
				channels: [{ channelTypeName: "EMAIL", value: "ada@example.com" }],
			});
		expect(response.status).toBe(StatusCodes.OK);
		expect(response.body.marker).toBe("create");
		expect(response.body.body.channels).toEqual([{ channelTypeName: "EMAIL", value: "ada@example.com" }]);
	});

	it("routes the channel sub-resources to their handlers", async () => {
		const addResponse = await request(buildApp())
			.post("/contacts/5/channels")
			.send({ channelTypeName: "PHONE", value: "+34600000000" });
		expect(addResponse.body.marker).toBe("addChannel");
		expect(addResponse.body.params).toEqual({ id: "5" });

		const removeResponse = await request(buildApp()).delete("/contacts/5/channels/7");
		expect(removeResponse.body.marker).toBe("removeChannel");
		expect(removeResponse.body.params).toEqual({ id: "5", channelId: "7" });
	});

	it("routes the address sub-resources to their handlers", async () => {
		const addResponse = await request(buildApp())
			.post("/contacts/5/addresses")
			.send({ street: "C/ X", city: "Madrid", country: "ES" });
		expect(addResponse.body.marker).toBe("addAddress");

		const removeResponse = await request(buildApp()).delete("/contacts/5/addresses/9");
		expect(removeResponse.body.marker).toBe("removeAddress");
	});

	it("DELETE /contacts/:channels/:channelId rejects an invalid channelId", async () => {
		const response = await request(buildApp()).delete("/contacts/5/channels/not-a-number");
		expect(response.status).toBe(StatusCodes.BAD_REQUEST);
	});

	it("PUT /contacts/:id/cv replaces the CV and forwards the body", async () => {
		const response = await request(buildApp())
			.put("/contacts/5/cv")
			.send({
				titulations: [{ title: "Ing. Informática", institution: "UPM", year: 2015, grade: 8.5 }],
				experiences: [{ role: "Desarrollador", company: "ACME", yearFrom: 2016, yearTo: 2020, level: 3 }],
			});
		expect(response.status).toBe(StatusCodes.OK);
		expect(response.body.marker).toBe("replaceCv");
		expect(response.body.params).toEqual({ id: "5" });
		expect(response.body.body.titulations[0].title).toBe("Ing. Informática");
	});

	it("PUT /contacts/:id/cv rejects a grade outside 0-10", async () => {
		const response = await request(buildApp())
			.put("/contacts/5/cv")
			.send({ titulations: [{ title: "Curso", grade: 11 }] });
		expect(response.status).toBe(StatusCodes.BAD_REQUEST);
	});

	it("PUT /contacts/:id/cv rejects a level outside 1-5", async () => {
		const response = await request(buildApp()).put("/contacts/5/cv").send({ experiences: [{ role: "R", level: 9 }] });
		expect(response.status).toBe(StatusCodes.BAD_REQUEST);
	});
});
