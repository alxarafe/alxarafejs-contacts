export { contactController } from "./contactController.js";
export type {
	Address,
	AddressInput,
	Channel,
	ChannelInput,
	ChannelTypeRecord,
	Contact,
	ContactDetail,
	CvInput,
	Experience,
	ExperienceInput,
	Titulation,
	TitulationInput,
} from "./contactModel.js";
export {
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
	TitulationInputSchema,
	TitulationSchema,
	UpdateContactSchema,
} from "./contactModel.js";
export type { ContactRepository, ContactWithDetails } from "./contactRepository.js";
export { PrismaContactRepository } from "./contactRepository.js";
export { contactRegistry, contactRouter } from "./contactRouter.js";
export { ContactService, contactService } from "./contactService.js";
