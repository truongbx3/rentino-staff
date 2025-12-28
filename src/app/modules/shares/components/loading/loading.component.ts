import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LoadingService } from 'src/app/core/services/loading.service';

@Component({
    selector: 'app-loading',
    template: `
        <div class="loading-overlay" *ngIf="loading$ | async">
            <nz-spin
                nzSize="large"
            ></nz-spin>
        </div>
    `,
    styleUrls: ['./loading.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingComponent {
    loading$ = this.loadingService.loading$;

    constructor(private loadingService: LoadingService) { }
}
