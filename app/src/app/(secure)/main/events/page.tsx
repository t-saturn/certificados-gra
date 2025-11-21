"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Edit2, Trash2, Eye } from "lucide-react"

interface Event {
  id: number
  name: string
  type: "Certificado" | "Constancia"
  startDate: string
  endDate: string
  hours: number
  participants: number
  status: "Programado" | "En Proceso" | "Completado" | "Cancelado"
  responsible: string
  hasEvaluation: boolean
}

const mockEvents: Event[] = [
  {
    id: 1,
    name: "Capacitación Q2 2024",
    type: "Certificado",
    startDate: "2024-02-15",
    endDate: "2024-02-18",
    hours: 12,
    participants: 120,
    status: "Completado",
    responsible: "Juan García",
    hasEvaluation: true,
  },
  {
    id: 2,
    name: "Taller de Seguridad",
    type: "Constancia",
    startDate: "2024-02-20",
    endDate: "2024-02-21",
    hours: 8,
    participants: 85,
    status: "En Proceso",
    responsible: "María López",
    hasEvaluation: false,
  },
  {
    id: 3,
    name: "Seminario de Compliance",
    type: "Certificado",
    startDate: "2024-03-01",
    endDate: "2024-03-03",
    hours: 16,
    participants: 200,
    status: "Programado",
    responsible: "Roberto Pérez",
    hasEvaluation: true,
  },
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("Todos")

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.responsible.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "Todos" || event.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const handleDelete = (id: number) => {
    setEvents(events.filter((e) => e.id !== id))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestión de Eventos</h1>
          <p className="text-muted-foreground">Crea y administra tus eventos de certificación</p>
        </div>
        <Link href="/dashboard/admin/events/new">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Evento
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o responsable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-muted border-border"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option>Todos</option>
          <option>Programado</option>
          <option>En Proceso</option>
          <option>Completado</option>
          <option>Cancelado</option>
        </select>
      </div>

      {/* Events Table */}
      <Card className="p-6 border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Evento</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fechas</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Participantes</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event) => (
              <tr key={event.id} className="border-b border-border hover:bg-muted/50">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-medium text-foreground">{event.name}</p>
                    <p className="text-xs text-muted-foreground">Responsable: {event.responsible}</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-foreground">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      event.type === "Certificado" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    {event.type}
                  </span>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  <div className="text-sm">{event.startDate}</div>
                  <div className="text-xs text-muted-foreground">{event.hours}h</div>
                </td>
                <td className="py-3 px-4 text-foreground font-medium">{event.participants}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === "Completado"
                        ? "bg-green-100 text-green-700"
                        : event.status === "En Proceso"
                          ? "bg-blue-100 text-blue-700"
                          : event.status === "Programado"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Total de Eventos</p>
          <p className="text-2xl font-bold text-foreground mt-2">{events.length}</p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">En Proceso</p>
          <p className="text-2xl font-bold text-foreground mt-2">
            {events.filter((e) => e.status === "En Proceso").length}
          </p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Total de Participantes</p>
          <p className="text-2xl font-bold text-foreground mt-2">
            {events.reduce((sum, e) => sum + e.participants, 0)}
          </p>
        </Card>
        <Card className="p-4 border-border">
          <p className="text-muted-foreground text-sm">Completados</p>
          <p className="text-2xl font-bold text-foreground mt-2">
            {events.filter((e) => e.status === "Completado").length}
          </p>
        </Card>
      </div>
    </div>
  )
}
