import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LoadingService } from 'src/app/core/services/loading.service';

@Component({
    selector: 'app-loading',
    template: `
        <div class="loading-overlay d-flex flex-column gap-4" *ngIf="loading$ | async">
            <nz-spin nzSize="large"></nz-spin>
            <div class="loading-label text-white">{{ label$ | async }}</div>
        </div>
    `,
    styleUrls: ['./loading.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingComponent {
    loading$ = this.loadingService.loading$;
    label$ = this.loadingService.label$;

    constructor(private loadingService: LoadingService) { }
}
