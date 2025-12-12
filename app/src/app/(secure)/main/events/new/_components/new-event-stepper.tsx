import type { FC } from 'react';
import type { Step } from './new-event-types';

export interface NewEventStepperProps {
  step: Step;
}

export const NewEventStepper: FC<NewEventStepperProps> = ({ step }) => {
  const steps = [
    {
      id: 1 as Step,
      title: 'Información del Evento',
      subtitle: 'Datos básicos y fechas',
    },
    { id: 2 as Step, title: 'Plantilla', subtitle: 'Documento asociado' },
    { id: 3 as Step, title: 'Participantes', subtitle: 'Registro opcional' },
  ];

  return (
    <div className="flex justify-center mb-6">
      <div className="flex w-full max-w-3xl items-center">
        {steps.map((s, index) => {
          const active = step === s.id;
          const completed = step > s.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={s.id} className="flex flex-col items-center flex-1 relative">
              <div className="relative flex items-center justify-center w-full">
                {!isLast && <div className="absolute left-[50%] top-1/2 w-full h-[2px] bg-border -translate-y-1/2 z-0" />}

                <div
                  className={`relative z-10 flex justify-center items-center rounded-full w-9 h-9 text-sm font-semibold border-2 
                  ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : completed
                      ? 'bg-primary/10 text-primary border-primary/10'
                      : 'bg-muted text-muted-foreground border-transparent'
                  }`}
                >
                  {s.id}
                </div>
              </div>

              <div className="mt-2 text-center">
                <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{s.title}</p>
                <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
