import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DevicePriceDetailService {
  private readonly baseUrl = environment.apiUrl + environment.contextPath;
  private readonly contextPath = `${this.baseUrl}/devicePriceDetail`;

  constructor(private http: HttpClient) {}

  searchDevicePriceDetails(payload: any): Observable<any> {
    return this.http.post(`${this.contextPath}/search`, payload);
  }

  saveDevicePriceDetail(payload: any): Observable<any> {
    return this.http.post(`${this.contextPath}/create-update`, payload);
  }

  deleteDevicePriceDetail(ids: any[]): Observable<any> {
    return this.http.post(`${this.contextPath}/deleteByIds`, ids);
  }
}
