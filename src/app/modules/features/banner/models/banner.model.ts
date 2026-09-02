export interface Banner {
  id?: number;
  title?: string;
  imageUrl?: string;
  attachFileId?: number;
  deeplink?: string;
  displayOrder?: number;
  status?: number; // 1: Active (Hiệu lực), 0: Inactive (Không hiệu lực)
  createdDate?: string;
  updatedDate?: string;
}
