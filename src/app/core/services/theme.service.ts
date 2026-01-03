import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkMode = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkMode.asObservable();

  constructor() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    this.setTheme(isDark);
  }

  toggleTheme(): void {
    const newTheme = !this.isDarkMode.value;
    this.setTheme(newTheme);
  }

  setTheme(isDark: boolean): void {
    this.isDarkMode.next(isDark);
    
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }

  getCurrentTheme(): boolean {
    return this.isDarkMode.value;
  }
}

