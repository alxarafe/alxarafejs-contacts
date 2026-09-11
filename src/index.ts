export { contactController } from "./contactController.js";
export type { Address, Channel, Contact, ContactDetail } from "./contactModel.js";
export {
	AddressSchema,
	ChannelSchema,
	ContactDetailSchema,
	ContactSchema,
	CreateContactSchema,
	GetContactSchema,
	UpdateContactSchema,
} from "./contactModel.js";
export { ContactRepository } from "./contactRepository.js";
export { contactRegistry, contactRouter } from "./contactRouter.js";
export { ContactService, contactService } from "./contactService.js";
