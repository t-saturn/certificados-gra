"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"

export default function NewEventPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    type: "Certificado",
    startDate: "",
    endDate: "",
    hours: "",
    responsible: "",
    description: "",
    hasEvaluation: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Evento creado:", formData)
    router.push("/dashboard/admin/events")
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Crear Nuevo Evento</h1>
          <p className="text-muted-foreground">Completa el formulario para crear un evento de certificación</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 border-border space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Información Básica</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nombre del Evento</label>
              <Input
                type="text"
                name="name"
                placeholder="Ej: Capacitación Q2 2024"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="bg-muted border-border"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tipo de Documento</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Certificado</option>
                  <option>Constancia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Horas de Duración</label>
                <Input
                  type="number"
                  name="hours"
                  placeholder="8"
                  value={formData.hours}
                  onChange={handleInputChange}
                  required
                  className="bg-muted border-border"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Responsable</label>
              <Input
                type="text"
                name="responsible"
                placeholder="Nombre del responsable"
                value={formData.responsible}
                onChange={handleInputChange}
                required
                className="bg-muted border-border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Descripción</label>
              <textarea
                name="description"
                placeholder="Descripción del evento..."
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground">Fechas</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fecha de Inicio</label>
                <Input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className="bg-muted border-border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fecha de Finalización</label>
                <Input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                  className="bg-muted border-border"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-foreground">Opciones Adicionales</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="hasEvaluation"
                checked={formData.hasEvaluation}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-border cursor-pointer"
              />
              <span className="text-foreground">El evento incluye evaluación</span>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
            Crear Evento
          </Button>
        </div>
      </form>
    </div>
  )
}
