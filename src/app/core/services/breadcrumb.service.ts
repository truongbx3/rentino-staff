import { Injectable } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';

export interface Breadcrumb {
  label: string;
  url: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<Breadcrumb[]>([]);
  public breadcrumbs$: Observable<Breadcrumb[]> = this.breadcrumbsSubject.asObservable();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged()
      )
      .subscribe(() => {
        const breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
        this.breadcrumbsSubject.next(breadcrumbs);
      });
  }

  private buildBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumb[] = []
  ): Breadcrumb[] {
    const label = route.routeConfig?.data?.['breadcrumb'];
    const icon = route.routeConfig?.data?.['breadcrumbIcon'];
    const path = route.routeConfig?.path || '';

    const nextUrl = path ? `${url}/${path}` : url;

    const newBreadcrumbs = label
      ? [...breadcrumbs, { label, url: nextUrl, icon }]
      : [...breadcrumbs];

    if (route.firstChild) {
      return this.buildBreadcrumbs(route.firstChild, nextUrl, newBreadcrumbs);
    }

    return newBreadcrumbs;
  }

  setBreadcrumbs(breadcrumbs: Breadcrumb[]): void {
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    const currentBreadcrumbs = this.breadcrumbsSubject.value;
    this.breadcrumbsSubject.next([...currentBreadcrumbs, breadcrumb]);
  }

  removeLastBreadcrumb(): void {
    const currentBreadcrumbs = this.breadcrumbsSubject.value;
    this.breadcrumbsSubject.next(currentBreadcrumbs.slice(0, -1));
  }

  clearBreadcrumbs(): void {
    this.breadcrumbsSubject.next([]);
  }

  getCurrentBreadcrumbs(): Breadcrumb[] {
    return this.breadcrumbsSubject.value;
  }
}
