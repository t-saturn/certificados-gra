export type PreviewKind = 'image' | 'pdf' | 'text' | null;

export type TemplateFormState = {
  code: string;
  name: string;
  document_type_id: string;
  category_id: string;
  description: string;
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
