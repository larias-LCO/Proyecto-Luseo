import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    try {
      console.log('HTTP Request:', req.method, req.urlWithParams, 'body:', req.body);
    } catch (e) {}

    return next.handle(req).pipe(
      tap((evt) => {
        if (evt instanceof HttpResponse) {
          try { console.log('HTTP Response:', evt.status, evt.url, 'body:', evt.body); } catch (e) {}
        }
      }),
      catchError((err: HttpErrorResponse) => {
        try { console.error('HTTP Error Response:', err.status, err.url, 'body:', err.error); } catch (e) {}
        return throwError(() => err);
      })
    );
  }
}
