package services

import (
	"strings"
	"time"

	"server/internal/dto"
	"server/internal/models"
)

func BuildPdfFields(
	fields []models.DocumentTemplateField,
	participant models.UserDetail,
	ev models.Event,
) []dto.PdfField {
	out := make([]dto.PdfField, 0, len(fields))
	for _, f := range fields {
		out = append(out, dto.PdfField{
			Key:   f.Key,
			Value: resolvePdfValue(f.Key, participant, ev),
		})
	}
	return out
}

func resolvePdfValue(key string, participant models.UserDetail, ev models.Event) string {
	switch key {
	case "nombre_participante":
		full := strings.TrimSpace(strings.Join([]string{
			strings.TrimSpace(participant.FirstName),
			strings.TrimSpace(participant.LastName),
		}, " "))
		return strings.TrimSpace(full)

	case "fecha":
		return time.Now().Format("02/01/2006")

	case "codigo_evento":
		return strings.TrimSpace(ev.Code)

	case "firma_1_nombre":
		return "Dr. Carlos Mendoza"

	case "firma_1_cargo":
		return "Director de Bienestar Social"

	default:
		return ""
	}
}
