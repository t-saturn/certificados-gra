export type PreviewKind = 'image' | 'pdf' | 'text' | null;

export type TemplateFormState = {
  code: string;
  name: string;
  document_type_id: string;
  category_id: string;
};

export type DocTypeOption = {
  id: string;
  code: string;
  name: string;
};

export type CategoryOption = {
  id: number;
  code: string;
  name: string;
};

export type TemplateFieldType = 'text' | 'date' | 'number' | 'boolean';

export type TemplateFieldForm = {
  key: string;
  label: string;
  field_type: TemplateFieldType;
  required: boolean;
};
