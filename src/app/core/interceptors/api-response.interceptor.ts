import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable()
export class ApiResponseInterceptor implements HttpInterceptor {
  constructor(private message: NzMessageService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          const body = event.body;
          if (body && body.code !== undefined && body.code !== '00' && body.message) {
            this.message.error(body.message);
          }
        }
      }),
      catchError((err: HttpErrorResponse) => {
        const body = err.error;
        if (body && body.message) {
          this.message.error(body.message);
        }
        return throwError(() => err);
      })
    );
  }
}
