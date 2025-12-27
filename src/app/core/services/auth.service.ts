import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { environment } from "src/environments/environment";

@Injectable({ providedIn: 'root' })
export class AuthService {
  contextPath = `${environment.apiUrl}${environment.authContextPath}/auth`;

  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    const user = localStorage.getItem('user');
    if (user) {
      this.userSubject.next(JSON.parse(user));
    }
  }

  login(payload: any) {
    return this.http.post<any>(this.contextPath + '/login', payload);
  }

  saveAuth(data: any) {
    localStorage.setItem('access_token', data.accessToken);
    localStorage.setItem(
      'expired_at',
      (Date.now() + data.expiresIn).toString()
    );

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      this.userSubject.next(data.user);
    }
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('access_token');
    const expiredAt = Number(localStorage.getItem('expired_at'));
    return !!token && Date.now() < expiredAt;
  }

  logout() {
    localStorage.clear();
    this.userSubject.next(null);
    location.href = '/auth/login';
  }

  get currentUser() {
    return this.userSubject.value;
  }
}
