import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  private readonly baseUrl = environment.apiUrl + environment.contextPath;
  private readonly contextPath = `${this.baseUrl}/shipment`;

  constructor(private http: HttpClient) {}

  searchShipments(payload: any): Observable<any> {
    return this.http.post(`${this.contextPath}/search`, payload);
  }

  getStatuses(): Observable<any> {
    return this.http.get(`${this.contextPath}/statuses`);
  }
}
