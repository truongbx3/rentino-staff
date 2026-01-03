import {
  Component,
  Input,
  forwardRef
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR
} from '@angular/forms';

export interface SingleSelectOption {
  label?: string;
  answer?: string;
  value: any;
  disabled?: boolean;
  description?: string;
}

@Component({
  selector: 'app-single-select',
  templateUrl: './single-select.component.html',
  styleUrls: ['./single-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SingleSelectComponent),
      multi: true
    }
  ]
})
export class SingleSelectComponent implements ControlValueAccessor {
  @Input() options: SingleSelectOption[] = [];

  value: any = null;
  disabled = false;

  private onChange = (_: any) => {};
  private onTouched = () => {};

  writeValue(value: any): void {
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


  select(option: SingleSelectOption): void {
    if (this.disabled || option.disabled) return;

    this.value = option.value;
    this.onChange(this.value);
    this.onTouched();
  }
}
