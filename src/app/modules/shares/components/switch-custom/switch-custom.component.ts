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
  selector: 'app-switch-custom',
  templateUrl: './switch-custom.component.html',
  styleUrls: ['./switch-custom.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchCustomComponent),
      multi: true
    }
  ]
})
export class SwitchCustomComponent implements ControlValueAccessor {
  @Input() title!: string;
  @Input() description?: string;

  value: boolean | null = null;
  disabled = false;

  private onChange = (_: boolean | null) => {};
  private onTouched = () => {};


  writeValue(value: boolean | null): void {
    this.value = value;
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

  select(val: boolean): void {
    if (this.disabled) return;

    this.value = val;
    this.onChange(val);
    this.onTouched();
  }

  reset(): void {
    if (this.disabled) return;

    this.value = null;
    this.onChange(null);
    this.onTouched();
  }
}
