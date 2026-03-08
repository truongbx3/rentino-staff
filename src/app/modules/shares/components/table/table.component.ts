import { Component, EventEmitter, Input, OnChanges, Output, TemplateRef } from '@angular/core';
import { SearchCondition, TableColumn } from '../../models/table-column.model';

type SortDirection = 'ASC' | 'DESC' | null;
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

  @Input() defaultSort: { fieldName: string; sort: 'ASC' | 'DESC' } = {
    fieldName: 'updatedDate',
    sort: 'DESC'
  };

  sortFields: Array<{
    fieldName: string;
    sort: SortDirection;
  }> = [];


  onSort(col: TableColumn): void {
    if (!col.isSort) return;

    const index = this.sortFields.findIndex(
      s => s.fieldName === col.key
    );

    if (index === -1) {
      this.sortFields.push({
        fieldName: col.key,
        sort: 'ASC'
      });
    }

    else if (this.sortFields[index].sort === 'ASC') {
      this.sortFields[index].sort = 'DESC';
    }

    else {
      this.sortFields.splice(index, 1);
    }

    this.triggerSearch(true);
  }



  triggerSearch(force = false): void {
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
          value: new Date(value).getTime()
        });
        return;
      }

      if (col.filter?.type === 'select') {
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

    if (!force && snapshot === this.lastSearchSnapshot) return;

    this.lastSearchSnapshot = snapshot;

    const payload = {
      page: 0,
      size: this.pageSize,
      lsCondition: conditions,
      sortField:
        this.sortFields.length > 0
          ? this.sortFields
          : [this.defaultSort]
    };

    this.search.emit(payload);
  }

  getTagLabel(col: TableColumn, row: any): string {
    const value = row[col.key];

    if (value === null || value === undefined || value === '') {
      return 'Chưa cập nhật';
    }

    if (!col.filter?.options?.length) {
      return value;
    }

    const option = col.filter.options?.find(opt => opt.value === value);
    return option?.label ?? value;
  }

  getTagColor(col: TableColumn, row: any): string {
    const value = row[col.key];

    if (!value || !col.filter?.options?.length) {
      return 'default';
    }

    const option = col.filter.options?.find(opt => opt.value === value);

    return option?.color ?? 'default';
  }

  getSortDirection(field: string): 'ASC' | 'DESC' | null {
    return this.sortFields.find(s => s.fieldName === field)?.sort ?? null;
  }

  getSortIndex(field: string): number | null {
    const index = this.sortFields.findIndex(
      s => s.fieldName === field
    );
    return index === -1 ? null : index;
  }
}