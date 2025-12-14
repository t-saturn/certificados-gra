package qrcode

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"sync"

	qrcode "github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
	xdraw "golang.org/x/image/draw"
	"golang.org/x/image/webp"
)

type Service struct {
	size int // ancho/alto final del PNG en px (ej. 512, 600, 1024)

	once     sync.Once
	logo     image.Image
	logoErr  error
	logoRate float64 // % del ancho del QR que ocupa el logo (ej: 0.22 = 22%)
}

// Option pattern
type Option func(*Service)

// WithSize define el tamaño final del PNG en píxeles (cuadrado).
func WithSize(px int) Option {
	return func(s *Service) {
		if px > 0 {
			s.size = px
		}
	}
}

// WithLogoScale define el tamaño relativo del logo respecto al QR.
// Rango recomendado: 0.18 a 0.28.
func WithLogoScale(scale float64) Option {
	return func(s *Service) {
		if scale > 0.05 && scale < 0.60 {
			s.logoRate = scale
		}
	}
}

func New(opts ...Option) *Service {
	s := &Service{
		size:     512,
		logoRate: 0.22,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

// standard.NewWithWriter requiere io.WriteCloser, bytes.Buffer solo es io.Writer.
// Este wrapper lo convierte en WriteCloser sin hacer nada en Close().
type nopWriteCloser struct {
	io.Writer
}

func (nopWriteCloser) Close() error { return nil }

func (s *Service) loadLogo() (image.Image, error) {
	s.once.Do(func() {
		if len(embeddedLogoWEBP) == 0 {
			s.logoErr = fmt.Errorf("logo webp embebido vacío: revisa pkgs/qrcode/gobierno-regional.webp")
			return
		}
		img, err := webp.Decode(bytes.NewReader(embeddedLogoWEBP))
		if err != nil {
			s.logoErr = fmt.Errorf("no se pudo decodificar logo webp: %w", err)
			return
		}
		s.logo = img
	})
	return s.logo, s.logoErr
}

// GeneratePNG retorna el PNG del QR (con logo centrado).
func (s *Service) GeneratePNG(content string) ([]byte, error) {
	var out bytes.Buffer
	if err := s.WritePNG(&out, content); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}

// WritePNG escribe el PNG del QR (con logo centrado) a cualquier io.Writer.
func (s *Service) WritePNG(w io.Writer, content string) error {
	if content == "" {
		return fmt.Errorf("content vacío: no se puede generar QR")
	}
	if s.size <= 0 {
		return fmt.Errorf("size inválido: %d", s.size)
	}

	// 1) Crear QR
	qr, err := qrcode.New(content)
	if err != nil {
		return fmt.Errorf("qrcode.New: %w", err)
	}

	// 2) Renderizar QR base a PNG en buffer con writer/standard
	//    OJO: WithQRWidth recibe uint8 => máximo 255.
	renderSize := s.size
	if renderSize > 255 {
		renderSize = 255
	}

	var buf bytes.Buffer
	wc := nopWriteCloser{Writer: &buf}

	stdw := standard.NewWithWriter(wc,
		standard.WithQRWidth(uint8(renderSize)),
		standard.WithBorderWidth(2),
	)

	if err = qr.Save(stdw); err != nil {
		return fmt.Errorf("qr.Save: %w", err)
	}

	baseImg, err := png.Decode(bytes.NewReader(buf.Bytes()))
	if err != nil {
		return fmt.Errorf("png.Decode(qr): %w", err)
	}

	// 3) Cargar logo .webp (embebido)
	logo, err := s.loadLogo()
	if err != nil {
		return err
	}

	// 4) Poner logo centrado sobre el QR
	composed := overlayCenteredLogo(baseImg, logo, s.logoRate)

	// 5) Escalar al tamaño final deseado (si el render base fue <=255)
	if composed.Bounds().Dx() != s.size {
		scaled := image.NewRGBA(image.Rect(0, 0, s.size, s.size))
		xdraw.CatmullRom.Scale(scaled, scaled.Bounds(), composed, composed.Bounds(), xdraw.Over, nil)
		composed = scaled
	}

	// 6) Encode final a PNG
	if err := png.Encode(w, composed); err != nil {
		return fmt.Errorf("png.Encode(final): %w", err)
	}
	return nil
}

func overlayCenteredLogo(qr image.Image, logo image.Image, logoRate float64) image.Image {
	qrBounds := qr.Bounds()
	qrW := qrBounds.Dx()
	qrH := qrBounds.Dy()

	// Trabajamos en RGBA
	dst := image.NewRGBA(qrBounds)
	xdraw.Draw(dst, qrBounds, qr, qrBounds.Min, xdraw.Src)

	// Tamaño del logo (cuadrado)
	target := int(float64(min(qrW, qrH)) * logoRate)
	if target < 32 {
		target = 32
	}

	// Fondo blanco (para mejorar contraste y reservar módulos)
	// Un poco más grande que el logo
	pad := max(6, target/10)
	bgSize := target + pad*2

	cx := qrBounds.Min.X + qrW/2
	cy := qrBounds.Min.Y + qrH/2

	bgRect := image.Rect(cx-bgSize/2, cy-bgSize/2, cx+bgSize/2, cy+bgSize/2)
	fillRect(dst, bgRect, color.RGBA{255, 255, 255, 255})

	// Redimensionar logo a target x target
	logoRGBA := image.NewRGBA(image.Rect(0, 0, target, target))
	xdraw.CatmullRom.Scale(logoRGBA, logoRGBA.Bounds(), logo, logo.Bounds(), xdraw.Over, nil)

	// Pegar logo centrado
	logoRect := image.Rect(cx-target/2, cy-target/2, cx+target/2, cy+target/2)
	xdraw.Draw(dst, logoRect, logoRGBA, image.Point{}, xdraw.Over)

	return dst
}

func fillRect(img *image.RGBA, r image.Rectangle, c color.RGBA) {
	r = r.Intersect(img.Bounds())
	for y := r.Min.Y; y < r.Max.Y; y++ {
		for x := r.Min.X; x < r.Max.X; x++ {
			img.SetRGBA(x, y, c)
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
