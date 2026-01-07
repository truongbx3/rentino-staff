import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private labelSubject = new BehaviorSubject<string>('Đang xử lý...');

  loading$ = this.loadingSubject.asObservable();
  label$ = this.labelSubject.asObservable();

  show(label: string = 'Đang xử lý...'): void {
    this.labelSubject.next(label);
    this.loadingSubject.next(true);
  }

  hide(): void {
    this.loadingSubject.next(false);
  }
}
