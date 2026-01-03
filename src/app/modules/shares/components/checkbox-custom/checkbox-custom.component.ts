import {
  Component,
  Input,
  forwardRef
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

@Component({
  selector: 'app-custom-checkbox',
  templateUrl: './checkbox-custom.component.html',
  styleUrls: ['./checkbox-custom.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomCheckboxComponent),
      multi: true
    }
  ]
})
export class CustomCheckboxComponent implements ControlValueAccessor {
  @Input() label!: string;

  value = false;
  disabled = false;

  private onChange = (_: boolean) => {};
  private onTouched = () => {};

  writeValue(value: boolean): void {
    this.value = !!value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle(): void {
    if (this.disabled) return;

    this.value = !this.value;
    this.onChange(this.value);
    this.onTouched();
  }
}
