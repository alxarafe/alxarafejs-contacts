export type Contact = {
  id: number;
  name: string;
  notes: string | null;
  isCustomer: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Address = {
  id: number;
  label: string | null;
  street: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
};

export type Channel = {
  id: number;
  channelTypeId: number;
  channelTypeName: string;
  value: string;
  label: string | null;
};

export type Titulation = {
  id: number;
  title: string;
  institution: string | null;
  year: number | null;
  grade: number | null;
};

export type Experience = {
  id: number;
  role: string;
  company: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  level: number | null;
};

export type ContactDetail = Contact & {
  addresses: Address[];
  channels: Channel[];
  titulations: Titulation[];
  experiences: Experience[];
};

export type CvPayload = {
  titulations: Omit<Titulation, 'id'>[];
  experiences: Omit<Experience, 'id'>[];
};