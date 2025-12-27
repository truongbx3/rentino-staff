import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VssFileService  {
  private readonly contextPath = `${environment.apiUrl}${environment.contextPath}/attach-file/create`;
  constructor(
    private http: HttpClient
  ) {}
  uploadMultiFile(file: File[]): Observable<any> {
    const formData = new FormData();
    for (let i = 0; i < file.length; i++) {
      formData.append('files', file[i]);
    }
    return this.http.post(this.contextPath + '/attach-file/create', formData);
  }

  uploadSingleFile(file: File | any): Observable<any> {
    const formData = new FormData();
    formData.append('files', file, file?.name);
    return this.http.post(this.contextPath + '/attach-file/create', formData);
  }

  putFile(url: string, file: File): Observable<any> {
    return this.http.put(url, file);
  }

  deleteFile(url: string, ids: string) {
    return this.http.delete(`${url}/${ids}`);
  }

  deleteFiles(url: string, ids: string[]) {
    return this.http.delete(`${url}/${ids.join(',')}`);
  }
}
