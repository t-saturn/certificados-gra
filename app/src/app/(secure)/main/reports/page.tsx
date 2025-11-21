'use client';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

const monthlyData = [
  { month: 'Ene', emitidos: 120, firmados: 100, pendientes: 20 },
  { month: 'Feb', emitidos: 190, firmados: 150, pendientes: 40 },
  { month: 'Mar', emitidos: 290, firmados: 200, pendientes: 90 },
  { month: 'Abr', emitidos: 390, firmados: 300, pendientes: 90 },
  { month: 'May', emitidos: 490, firmados: 400, pendientes: 90 },
  { month: 'Jun', emitidos: 590, firmados: 500, pendientes: 90 },
];

const areaData = [
  { area: 'IT', value: 450 },
  { area: 'HR', value: 320 },
  { area: 'Finance', value: 280 },
  { area: 'Operations', value: 200 },
  { area: 'Otros', value: 150 },
];

const typeData = [
  { name: 'Certificados', value: 65 },
  { name: 'Constancias', value: 35 },
];

const COLORS = ['#dd040d', '#0f0e0e', '#f5f5f5', '#999999', '#cccccc'];

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground text-3xl">Reportes</h1>
          <p className="text-muted-foreground">Análisis y estadísticas del sistema</p>
        </div>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-white">
          <Download className="w-4 h-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6 border-border">
          <p className="text-muted-foreground text-sm">Certificados Emitidos</p>
          <p className="mt-2 font-bold text-foreground text-3xl">2,060</p>
          <p className="mt-1 text-green-600 text-xs">+15% vs mes anterior</p>
        </Card>

        <Card className="p-6 border-border">
          <p className="text-muted-foreground text-sm">Certificados Firmados</p>
          <p className="mt-2 font-bold text-foreground text-3xl">1,650</p>
          <p className="mt-1 text-green-600 text-xs">80% de tasa de firma</p>
        </Card>

        <Card className="p-6 border-border">
          <p className="text-muted-foreground text-sm">Pendientes de Firma</p>
          <p className="mt-2 font-bold text-yellow-600 text-3xl">410</p>
          <p className="mt-1 text-yellow-600 text-xs">20% del total</p>
        </Card>

        <Card className="p-6 border-border">
          <p className="text-muted-foreground text-sm">Tasa de Error</p>
          <p className="mt-2 font-bold text-green-600 text-3xl">1.2%</p>
          <p className="mt-1 text-green-600 text-xs">Muy bueno</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card className="p-6 border-border">
          <h3 className="mb-4 font-semibold text-foreground text-lg">Tendencia Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="month" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="emitidos" stroke="#dd040d" strokeWidth={2} />
              <Line type="monotone" dataKey="firmados" stroke="#0f0e0e" strokeWidth={2} />
              <Line type="monotone" dataKey="pendientes" stroke="#f5f5f5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribution by Area */}
        <Card className="p-6 border-border">
          <h3 className="mb-4 font-semibold text-foreground text-lg">Distribución por Área</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="area" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Bar dataKey="value" fill="#dd040d" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Type Distribution */}
      <div className="gap-6 grid grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1 p-6 border-border">
          <h3 className="mb-4 font-semibold text-foreground text-lg">Distribución por Tipo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name} ${value}%`} outerRadius={75} fill="#8884d8" dataKey="value">
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Summary Table */}
        <Card className="lg:col-span-2 p-6 border-border">
          <h3 className="mb-4 font-semibold text-foreground text-lg">Resumen de Eventos</h3>
          <div className="space-y-3">
            {[
              { name: 'Capacitación Q2 2024', certs: 450, status: 'Completado' },
              { name: 'Taller de Seguridad', certs: 320, status: 'Completado' },
              { name: 'Seminario de Compliance', certs: 280, status: 'En Proceso' },
              { name: 'Workshop Avanzado', certs: 210, status: 'Programado' },
            ].map((event, idx) => (
              <div key={idx} className="flex justify-between items-center bg-muted p-3 border border-border rounded">
                <div>
                  <p className="font-medium text-foreground">{event.name}</p>
                  <p className="text-muted-foreground text-xs">{event.certs} certificados</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    event.status === 'Completado' ? 'bg-green-100 text-green-700' : event.status === 'En Proceso' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Export Options */}
      <Card className="p-6 border-border">
        <h3 className="mb-4 font-semibold text-foreground text-lg">Descargar Reportes</h3>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
          <Button variant="outline" className="justify-start gap-2 bg-transparent">
            <FileText className="w-4 h-4" />
            Reporte General (PDF)
          </Button>
          <Button variant="outline" className="justify-start gap-2 bg-transparent">
            <FileText className="w-4 h-4" />
            Estadísticas (Excel)
          </Button>
          <Button variant="outline" className="justify-start gap-2 bg-transparent">
            <FileText className="w-4 h-4" />
            Auditoría (CSV)
          </Button>
        </div>
      </Card>
    </div>
  );
}
