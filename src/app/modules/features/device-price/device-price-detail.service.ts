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
  private readonly historyPath = `${this.baseUrl}/devicePriceImportHistory`;

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

  countActiveByDate(date: string): Observable<any> {
    return this.http.get(`${this.contextPath}/count-active`, { params: { date } });
  }

  expireByDate(date: string): Observable<any> {
    return this.http.post(`${this.contextPath}/expire-by-date`, { date });
  }

  validateImport(fromDate: string, toDate: string): Observable<any> {
    return this.http.get(`${this.contextPath}/validate-import`, { params: { fromDate, toDate } });
  }

  importExcel(file: File, fromDate: string, toDate: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fromDate', fromDate);
    formData.append('toDate', toDate);
    return this.http.post(`${this.contextPath}/import`, formData);
  }

  searchImportHistory(payload: any): Observable<any> {
    return this.http.post(`${this.historyPath}/search`, payload);
  }

  getFileUrl(fileId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/attach-file/${fileId}/presignedUrl`);
  }
}

