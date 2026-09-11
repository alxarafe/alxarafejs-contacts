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
		const serviceResponse = await contactService.create(req.body);
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

	public getChannelTypes: RequestHandler = async (_req: Request, res: Response) => {
		const serviceResponse = await contactService.listChannelTypes();
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public addAddress: RequestHandler = async (req: Request, res: Response) => {
		const contactId = Number.parseInt(req.params.id as string, 10);
		const serviceResponse = await contactService.addAddress(contactId, req.body);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public removeAddress: RequestHandler = async (req: Request, res: Response) => {
		const contactId = Number.parseInt(req.params.id as string, 10);
		const addressId = Number.parseInt(req.params.addressId as string, 10);
		const serviceResponse = await contactService.removeAddress(contactId, addressId);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public addChannel: RequestHandler = async (req: Request, res: Response) => {
		const contactId = Number.parseInt(req.params.id as string, 10);
		const serviceResponse = await contactService.addChannel(contactId, req.body);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public removeChannel: RequestHandler = async (req: Request, res: Response) => {
		const contactId = Number.parseInt(req.params.id as string, 10);
		const channelId = Number.parseInt(req.params.channelId as string, 10);
		const serviceResponse = await contactService.removeChannel(contactId, channelId);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const contactController = new ContactController();
