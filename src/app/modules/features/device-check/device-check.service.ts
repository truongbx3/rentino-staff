import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

interface UploadResponse {
    code: string;
    message: string | null;
    data: {
        id: number;
        fileName: string;
        pathName: string;
    }[];
}

interface DeviceSearchRequest {
    page: number;
    size: number;
    lsCondition: any[];
    sortField: {
        fieldName: string;
        sort: string;
    }[];
}

@Injectable({
    providedIn: 'root'
})
export class DeviceCheckService {
    private readonly contextPath = `${environment.apiUrl}${environment.contextPath}/deviceInfo`;
    private readonly attachFileUrl = `${environment.apiUrl}${environment.contextPath}/attach-file/create`;

    constructor(private http: HttpClient) { }

    getAllDevices(
        page: number = 0,
        size: number = 10,
        lsCondition: any[] = [],
        sortField: { fieldName: string; sort: string }[] = [{ fieldName: 'createdDate', sort: 'DESC' }]
    ): Observable<any> {
        const body: DeviceSearchRequest = {
            page,
            size,
            lsCondition,
            sortField
        };
        return this.http.post(`${this.contextPath}/search`, body);
    }

    getDeviceDetail(id: number): Observable<any> {
        const params = new HttpParams().set('ids', id.toString());
        return this.http.get(`${this.contextPath}/findByIds`, { params });
    }

    attachFiles(formData: FormData): Observable<UploadResponse> {
        const headers = new HttpHeaders({
            Accept: '*/*'
        });

        return this.http.post<UploadResponse>(
            this.attachFileUrl,
            formData,
            { headers }
        );
    }


    saveDeviceInfor(payload: {
        deviceName: string;
        model: string;
        osVersion: string;
        storage: string;
        totalRam: string;
        transactionId: string;
        type: string;
    }): Observable<any> {
        return this.http.post(`${this.contextPath}/save`, payload);
    }

    saveCheckDeviceInfor(payload: {
        functionChecks: { item: string; value: boolean }[];
        mirrorChecks: { item: string; value: string }[];
        additionalChecks: { code: string; value: string }[];
        transactionID: string;
    }): Observable<any> {
        return this.http.post(`${this.contextPath}/saveCheckInfo`, payload);
    }

    checkDeviceStatus(transaction: string): Observable<any> {
        return this.http.post(`${this.contextPath}/checkDevice`, null, {
            params: {
                transaction: transaction
            }
        });
    }

    getTransactionId(): Observable<any> {
        return this.http.get(`${this.contextPath}/getTransaction`);
    }
}