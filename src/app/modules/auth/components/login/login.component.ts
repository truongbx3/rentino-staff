import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs/operators';
import { AuthService } from 'src/app/core/services/auth.service';
import { LoadingService } from 'src/app/core/services/loading.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  passwordVisible = false;
  password?: string;

  form = this.fb.group({
    phone: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private message: NzMessageService,
    private loading: LoadingService
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.show();

    this.authService.login(this.form.value)
      .pipe(finalize(() => this.loading.hide()))
      .subscribe({
        next: res => {
          if (res.code === '00') {
            this.authService.saveAuth(res.data);
            this.message.success('Đăng nhập thành công');
            this.router.navigate(['/device-check']);
          } else {
            this.message.error('Đăng nhập thất bại');
          }
        },
        error: () => {
          this.message.error('Sai tài khoản hoặc mật khẩu');
        }
      });
  }
}
