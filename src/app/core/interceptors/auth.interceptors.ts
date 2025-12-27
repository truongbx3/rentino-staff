import { HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = localStorage.getItem('access_token');

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: token ? `Bearer ${token}` : '',
          'Accept-Language': 'vi'
        }
      });
    }
    return next.handle(req);
  }
}
