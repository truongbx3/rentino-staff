import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ShipmentService {
  private readonly baseUrl = environment.apiUrl + environment.contextPath;
  private readonly contextPath = `${this.baseUrl}/shipment`;
  private readonly deviceInfoUrl = `${this.baseUrl}/deviceInfo`;

  constructor(private http: HttpClient) { }

  searchShipments(payload: any): Observable<any> {
    return this.http.post(`${this.contextPath}/search`, payload);
  }

  getStatuses(): Observable<any> {
    return this.http.get(`${this.contextPath}/statuses`);
  }

  receiveShipment(trackingNumber: string): Observable<any> {
    return this.http.post(`${this.contextPath}/receiveShipment`, null, {
      params: { trackingNumber }
    });
  }

  getDevicesByShipment(trackingNumber: string, deviceStatus?: string): Observable<any> {
    const body: any = { trackingNumber };
    if (deviceStatus) {
      body.deviceStatus = deviceStatus;
    }
    return this.http.post(`${this.deviceInfoUrl}/search-by-shipment`, body);
  }

  exportDevices(payload: any): Observable<Blob> {
    return this.http.post(`${this.contextPath}/export-by-shipment`, payload, {
      responseType: 'blob'
    });
  }

  getShipmentByTrackingNumber(trackingNumber: string): Observable<any> {
    return this.http.get(`${this.contextPath}/getByTrackingNumber`, { params: { trackingNumber } });
  }

  findShipmentById(id: number): Observable<any> {
    const params = new HttpParams().set('ids', id.toString());
    return this.http.get(`${this.contextPath}/findByIds`, { params });
  }
}
