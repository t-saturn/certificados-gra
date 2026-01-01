export type Step = 1 | 2 | 3;

export type ScheduleForm = {
  start_datetime: string;
  end_datetime: string;
};

export type TemplatePreviewKind = 'image' | 'pdf' | 'text' | null;

export type TemplatePreviewState = {
  src: string | null;
  kind: TemplatePreviewKind;
  loading: boolean;
  error: string | null;
};

export type ParticipantForm = {
  national_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  registration_source: string;
};
