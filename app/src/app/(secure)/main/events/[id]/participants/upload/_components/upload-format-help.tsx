import React from 'react';
import { Card } from '@/components/ui/card';

export const UploadFormatHelp: React.FC = () => {
  return (
    <Card className="space-y-4 bg-muted/50 p-6 border-border">
      <div>
        <h3 className="mb-2 font-semibold text-foreground">Formato esperado (JSON)</h3>
        <pre className="bg-card p-3 rounded overflow-x-auto font-mono text-muted-foreground text-xs">
          {`[
  { "name": "Juan García", "dni": "123456789", "email": "juan@example.com", "area": "IT" },
  { "name": "María López", "dni": "987654321", "email": "maria@example.com", "area": "HR" }
]`}
        </pre>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-foreground">Formato esperado (YAML)</h3>
        <pre className="bg-card p-3 rounded overflow-x-auto font-mono text-muted-foreground text-xs">
          {`- name: Juan García
  dni: "123456789"
  email: juan@example.com
  area: IT

- name: María López
  dni: "987654321"
  email: maria@example.com
  area: HR`}
        </pre>
      </div>

      <div>
        <h3 className="mb-2 font-semibold text-foreground">Formato esperado (Excel)</h3>
        <pre className="bg-card p-3 rounded overflow-x-auto font-mono text-muted-foreground text-xs">
          {`| name          | dni       | email            | area |
|---------------|-----------|------------------|------|
| Juan García   | 123456789 | juan@example.com | IT   |
| María López   | 987654321 | maria@example.com| HR   |`}
        </pre>
        <p className="mt-2 text-muted-foreground text-xs">*La primera hoja será leída automáticamente.</p>
      </div>
    </Card>
  );
};
