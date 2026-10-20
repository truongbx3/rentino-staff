import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';
import { JobcardDesignerComponent } from '../components/jobcard-designer/jobcard-designer.component';

@Injectable({
  providedIn: 'root'
})
export class JobcardDesignerCanDeactivateGuard implements CanDeactivate<JobcardDesignerComponent> {
  canDeactivate(component: JobcardDesignerComponent): boolean | Observable<boolean> | Promise<boolean> {
    if (!component.isDirty) {
      return true;
    }
    return component.confirmLeave();
  }
}
