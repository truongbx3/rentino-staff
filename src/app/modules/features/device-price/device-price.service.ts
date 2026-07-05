import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DevicePriceService {
  private readonly baseUrl = environment.apiUrl + environment.contextPath;
  private readonly contextPath = `${this.baseUrl}/devicePrice`;

  constructor(private http: HttpClient) {}

  searchDevicePrices(payload: any): Observable<any> {
    return this.http.post(`${this.contextPath}/search`, payload);
  }

  saveDevicePrice(payload: any): Observable<any> {
    return this.http.post(`${this.contextPath}/insert-update`, payload);
  }

  deleteDevicePrice(ids: any[]): Observable<any> {
    return this.http.post(`${this.contextPath}/deleteByIds`, ids);
  }

  exportDevicePrices(): Observable<Blob> {
    return this.http.get(`${this.contextPath}/export-excel`, { responseType: 'blob' });
  }
}
