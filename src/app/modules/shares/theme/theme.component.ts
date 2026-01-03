import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { ThemeService } from 'src/app/core/services/theme.service';

@Component({
    selector: 'app-theme-toggle',
    templateUrl: './theme.component.html',
    styleUrls: ['./theme.component.scss',]
})
export class ThemeToggleComponent {
    isDarkMode = false;
    private subscription: Subscription;

    constructor(private themeService: ThemeService) {
        this.subscription = this.themeService.isDarkMode$.subscribe(
            isDark => this.isDarkMode = isDark
        );
    }

    toggleTheme(): void {
        this.themeService.toggleTheme();
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}