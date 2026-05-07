
export interface ImportRow {
  id: string;
  data: Record<string, any>;
  errors: Record<string, string>;
  status: 'pending' | 'valid' | 'invalid' | 'processing';
}

export interface ColumnMapping {
  fileHeader: string;
  targetField: string;
}

export interface TemplateMapping {
  hash: string;
  mappings: ColumnMapping[];
  lastUsed: number;
}
