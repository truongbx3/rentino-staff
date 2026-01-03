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
    private readonly baseUrl = environment.apiUrl + environment.contextPath;
    private readonly contextPath = `${this.baseUrl}/deviceInfo`;
    private readonly attachFileUrl = `${this.baseUrl}/attach-file/create`;
    private readonly allQuestionsUrl = `${this.baseUrl}/deviceQuestion`;

    constructor(private http: HttpClient) { }

    getAllDevices(payload: any): Observable<any> {
        return this.http.post(`${this.contextPath}/search`, payload);
    }

    getAllDevicePrice(payload: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/devicePrice/search`, payload);
    }

    getDeviceDetail(id: number): Observable<any> {
        const params = new HttpParams().set('ids', id.toString());
        return this.http.get(`${this.contextPath}/findByIds`, { params });
    }

    getDeviceCheckDetail(transactionId: string): Observable<any> {
        const params = new HttpParams().set('transactionId', transactionId);
        return this.http.get(`${this.contextPath}/getCheckInfo`, { params });
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

    getAllQuestions(type: string): Observable<any> {
        return this.http.get(`${this.allQuestionsUrl}/getQuestion`, {
            params: {
                type: type
            }
        });
    }
}