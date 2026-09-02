import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Banner } from '../models/banner.model';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private readonly baseUrl = environment.apiUrl + environment.contextPath;
  private readonly contextPath = `${this.baseUrl}/banner`;

  constructor(private http: HttpClient) {}

  getAllBanners(): Observable<any> {
    return this.http.get(`${this.contextPath}/all`);
  }

  getBannersByStatus(status?: number): Observable<any> {
    let params = new HttpParams();
    if (status !== undefined && status !== null) {
      params = params.set('status', status.toString());
    }
    return this.http.get(`${this.contextPath}/by-status`, { params });
  }

  uploadBanners(files: File[], status?: number, deeplink?: string): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (status !== undefined && status !== null) {
      formData.append('status', status.toString());
    }
    if (deeplink) {
      formData.append('deeplink', deeplink);
    }
    return this.http.post(`${this.contextPath}/upload`, formData);
  }

  saveBanner(banner: Banner): Observable<any> {
    return this.http.post(`${this.contextPath}/insert-update`, banner);
  }

  updateOrders(banners: Banner[]): Observable<any> {
    return this.http.post(`${this.contextPath}/update-orders`, banners);
  }

  deleteBanners(ids: number[]): Observable<any> {
    return this.http.post(`${this.contextPath}/deleteByIds`, ids);
  }
}
