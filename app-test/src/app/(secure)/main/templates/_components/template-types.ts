export type TemplatePreviewKind = 'image' | 'pdf' | 'text' | null;

export type TemplatePreviewState = {
  src: string | null;
  kind: TemplatePreviewKind;
  loading: boolean;
  error: string | null;
};

export type LoadTemplatesOptions = {
  page?: number;
  search?: string;
  type?: string;
};
