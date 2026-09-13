import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ServiceResponse } from '@web/core/models/api';
import { Address, Channel, ContactDetail, CvPayload } from '../models/contact';

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly http = inject(HttpClient);

  addAddress(contactId: string | number, body: unknown): Observable<ServiceResponse<Address | null>> {
    return this.http.post<ServiceResponse<Address | null>>(`/api/contacts/${contactId}/addresses`, body);
  }

  removeAddress(contactId: string | number, addressId: string | number): Observable<ServiceResponse<null>> {
    return this.http.delete<ServiceResponse<null>>(`/api/contacts/${contactId}/addresses/${addressId}`);
  }

  addChannel(contactId: string | number, body: unknown): Observable<ServiceResponse<Channel | null>> {
    return this.http.post<ServiceResponse<Channel | null>>(`/api/contacts/${contactId}/channels`, body);
  }

  removeChannel(contactId: string | number, channelId: string | number): Observable<ServiceResponse<null>> {
    return this.http.delete<ServiceResponse<null>>(`/api/contacts/${contactId}/channels/${channelId}`);
  }

  replaceCv(contactId: string | number, body: CvPayload): Observable<ServiceResponse<ContactDetail | null>> {
    return this.http.put<ServiceResponse<ContactDetail | null>>(`/api/contacts/${contactId}/cv`, body);
  }
}