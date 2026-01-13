import { Component, EventEmitter, Input, OnChanges, Output, TemplateRef } from '@angular/core';
import { SearchCondition, TableColumn } from '../../models/table-column.model';
@Component({
  selector: 'app-table-custom',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})

export class TableCustomComponent {
  @Input() pageIndex = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() columns: any[] = [];
  @Input() data: any[] = [];
  @Input() actionTemplate: TemplateRef<any> | null = null;

  @Output() search = new EventEmitter<any>();
  @Output() pageIndexChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  searchValues: Record<string, string | number | Date | null> = {};

  private lastSearchSnapshot = '';

  triggerSearch(): void {
    const conditions: SearchCondition[] = [];

    this.columns.forEach(col => {
      if (!col.searchable) return;

      const value = this.searchValues[col.key];
      if (value === null || value === undefined || value === '') return;

      if (col.type === 'date' && col.filter?.type === 'date_picker') {
        conditions.push({
          operator: 'EQUAL',
          property: col.key,
          propertyType: 'date',
          value: value ? new Date(value).getTime() : value
        });
        return;
      }

      if (col.type === 'select') {
        conditions.push({
          operator: 'EQUAL',
          property: col.key,
          propertyType: col.propertyType ?? 'string',
          value
        });
        return;
      }

      conditions.push({
        operator: 'LIKE',
        property: col.key,
        propertyType: col.propertyType ?? 'string',
        value: typeof value === 'string' ? value.trim() : value
      });
    });

    const snapshot = JSON.stringify(conditions);

    if (snapshot === this.lastSearchSnapshot) {
      return;
    }

    this.lastSearchSnapshot = snapshot;

    const payload = {
      page: 0,
      size: this.pageSize,
      lsCondition: conditions,
      sortField: [
        {
          fieldName: 'updatedDate',
          sort: 'DESC'
        }
      ]
    };

    this.search.emit(payload);
  }


  getTagLabel(col: TableColumn, row: any): string {
    const value = row[col.key];

    if (!value || !col.filter?.options?.length) {
      return 'Chưa cập nhật';
    }

    const option = col.filter.options?.find(opt => opt.value === value);

    return option?.label ?? 'Chưa cập nhật';
  }

  getTagColor(col: TableColumn, row: any): string {
    const value = row[col.key];

    if (!value || !col.filter?.options?.length) {
      return 'default';
    }

    const option = col.filter.options?.find(opt => opt.value === value);

    return option?.color ?? 'default';
  }

}