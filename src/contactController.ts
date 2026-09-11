import { parsePaginationQuery } from "@alxarafe/core";
import type { Request, RequestHandler, Response } from "express";

import { contactService } from "./contactService.js";

class ContactController {
	public getContacts: RequestHandler = async (req: Request, res: Response) => {
		const query = parsePaginationQuery(req.query as Record<string, unknown>);
		const basePath = `${req.baseUrl}${req.path}`;
		const serviceResponse = await contactService.findAll(query, basePath);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public getContact: RequestHandler = async (req: Request, res: Response) => {
		const id = Number.parseInt(req.params.id as string, 10);
		const serviceResponse = await contactService.findById(id);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public createContact: RequestHandler = async (req: Request, res: Response) => {
		const serviceResponse = await contactService.create({ name: req.body.name, notes: req.body.notes ?? null });
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public updateContact: RequestHandler = async (req: Request, res: Response) => {
		const id = Number.parseInt(req.params.id as string, 10);
		const serviceResponse = await contactService.update(id, req.body);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public deleteContact: RequestHandler = async (req: Request, res: Response) => {
		const id = Number.parseInt(req.params.id as string, 10);
		const serviceResponse = await contactService.remove(id);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const contactController = new ContactController();
