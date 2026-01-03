import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { Breadcrumb, BreadcrumbService } from 'src/app/core/services/breadcrumb.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  @Input() showBackButton = true;
  @Input() showHomeButton = true;
  @Input() homeUrl = '/';
  @Input() homeLabel = 'Trang chủ';
  @Input() homeIcon = 'bi-house-door';

  breadcrumbs: Breadcrumb[] = [];
  private subscription?: Subscription;

  constructor(
    private breadcrumbService: BreadcrumbService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.subscription = this.breadcrumbService.breadcrumbs$.subscribe(
      breadcrumbs => {
        this.breadcrumbs = breadcrumbs;
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  goBack(): void {
    this.location.back();
  }

  navigateTo(url: string): void {
    this.router.navigate([url]);
  }

  goHome(): void {
    this.router.navigate([this.homeUrl]);
  }

  isLastItem(index: number): boolean {
    return index === this.breadcrumbs.length - 1;
  }
}