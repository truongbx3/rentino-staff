import { Component } from "@angular/core";
import { AuthService } from "src/app/core/services/auth.service";

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent {
  user: any;

  constructor(public auth: AuthService) { }

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      this.user = user;
    });
  }
}