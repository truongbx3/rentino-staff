import { Component, EventEmitter, Input, OnInit, Output, TemplateRef } from '@angular/core';
import { SearchCondition, TableColumn } from '../../models/table-column.model';
import { ListStateService } from 'src/app/core/services/list-state.service';

type SortDirection = 'ASC' | 'DESC' | null;
@Component({
  selector: 'app-table-custom',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})


export class TableCustomComponent implements OnInit {
  @Input() stateKey?: string;
  @Input() pageIndex = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  @Input() columns: any[] = [];
  @Input() data: any[] = [];
  @Input() actionTemplate: TemplateRef<any> | null = null;
  @Input() scrollX: string | null = '1200px';
  @Input() scrollY: string | null = 'calc(100vh - 370px)';

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

  constructor(private listStateService: ListStateService) {}

  ngOnInit(): void {
    if (this.stateKey) {
      const saved = this.listStateService.get<{
        searchValues: Record<string, string | number | Date | null>;
        sortFields: Array<{ fieldName: string; sort: SortDirection }>;
        lastSearchSnapshot: string;
      }>(`table:${this.stateKey}`);
      if (saved) {
        if (saved.searchValues) {
          this.searchValues = { ...saved.searchValues };
        }
        if (saved.sortFields) {
          this.sortFields = saved.sortFields.map(s => ({ ...s }));
        }
        if (saved.lastSearchSnapshot !== undefined) {
          this.lastSearchSnapshot = saved.lastSearchSnapshot;
        }
      }
    }
  }

  private saveState(): void {
    if (!this.stateKey) return;
    this.listStateService.set(`table:${this.stateKey}`, {
      searchValues: { ...this.searchValues },
      sortFields: this.sortFields.map(s => ({ ...s })),
      lastSearchSnapshot: this.lastSearchSnapshot
    });
  }

  reset(): void {
    this.searchValues = {};
    this.sortFields = [];
    this.lastSearchSnapshot = '';
    if (this.stateKey) {
      this.listStateService.clear(`table:${this.stateKey}`);
    }
  }

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

    this.saveState();
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

    if (!force && snapshot === this.lastSearchSnapshot) {
      this.saveState();
      return;
    }

    this.lastSearchSnapshot = snapshot;
    this.saveState();

    const payload = {
      page: 1,
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