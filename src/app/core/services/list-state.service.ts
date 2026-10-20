import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ListStateService {
  private state = new Map<string, any>();

  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }

  set(key: string, state: any): void {
    this.state.set(key, state);
  }

  clear(key: string): void {
    this.state.delete(key);
  }
}
