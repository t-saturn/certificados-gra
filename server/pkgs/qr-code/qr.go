package qrcode

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"path/filepath"

	qrc "github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
	"github.com/yeqown/go-qrcode/writer/standard/shapes"
)

type Service struct {
	BaseURL         string
	LogoPath        string
	QRWidth         int
	BorderWidth     int
	LogoScaleFactor float64
	LogoPaddingPx   int
}

// NewService: si logoPath == "" usa el logo por defecto del repo (server/pkgs/qr-code/logo.png o pkgs/qr-code/logo.png)
func NewService(baseURL, logoPath string) *Service {
	if logoPath == "" {
		logoPath = defaultLogoPath()
	}

	return &Service{
		BaseURL:         baseURL,
		LogoPath:        logoPath,
		QRWidth:         20,
		BorderWidth:     20,
		LogoScaleFactor: 0.25,
		LogoPaddingPx:   10,
	}
}

func (s *Service) GeneratePNG(ctx context.Context, verificationCode string) ([]byte, error) {
	_ = ctx

	// Si por alguna razón aún está vacío, intenta resolverlo aquí también.
	if s.LogoPath == "" {
		s.LogoPath = defaultLogoPath()
	}

	target := fmt.Sprintf("%s?verify_code=%s", s.BaseURL, verificationCode)

	qrObj, err := qrc.NewWith(
		target,
		qrc.WithEncodingMode(qrc.EncModeByte),
		qrc.WithErrorCorrectionLevel(qrc.ErrorCorrectionHighest),
	)
	if err != nil {
		return nil, fmt.Errorf("crear QR: %w", err)
	}

	tmp, err := os.CreateTemp("", "certgra-qr-*.png")
	if err != nil {
		return nil, fmt.Errorf("crear temp: %w", err)
	}
	tmpPath := tmp.Name()
	_ = tmp.Close()
	defer os.Remove(tmpPath)

	customShape := shapes.Assemble(
		shapes.RoundedFinder(),
		shapes.LiquidBlock(),
	)

	w, err := standard.New(
		tmpPath,
		standard.WithBuiltinImageEncoder(standard.PNG_FORMAT),
		standard.WithBgColor(color.White),
		standard.WithFgColor(color.Black),
		standard.WithQRWidth(uint8(s.QRWidth)), // si tu versión pide int, cambia a standard.WithQRWidth(s.QRWidth)
		standard.WithBorderWidth(s.BorderWidth),
		standard.WithCustomShape(customShape),
	)
	if err != nil {
		return nil, fmt.Errorf("crear writer: %w", err)
	}

	if err = qrObj.Save(w); err != nil {
		_ = w.Close()
		return nil, fmt.Errorf("guardar QR base: %w", err)
	}
	_ = w.Close()

	// Leer QR base
	qrFile, err := os.Open(tmpPath)
	if err != nil {
		return nil, fmt.Errorf("abrir temp QR: %w", err)
	}
	qrImg, err := png.Decode(qrFile)
	_ = qrFile.Close()
	if err != nil {
		return nil, fmt.Errorf("decode QR: %w", err)
	}

	// Leer logo
	logoPath := s.LogoPath
	if _, statErr := os.Stat(logoPath); statErr != nil {
		// fallback extra por si cambió el cwd
		if alt := defaultLogoPath(); alt != "" {
			logoPath = alt
		}
	}
	if logoPath == "" {
		return nil, errors.New("logo no encontrado: proporciona LogoPath o agrega el archivo logo.png en server/pkgs/qr-code/logo.png")
	}

	logoFile, err := os.Open(logoPath)
	if err != nil {
		return nil, fmt.Errorf("abrir logo (%s): %w", logoPath, err)
	}
	logoImg, err := png.Decode(logoFile)
	_ = logoFile.Close()
	if err != nil {
		return nil, fmt.Errorf("decode logo: %w", err)
	}

	final := composeWithLogo(qrImg, logoImg, s.LogoScaleFactor, s.LogoPaddingPx)

	var buf bytes.Buffer
	if err := png.Encode(&buf, final); err != nil {
		return nil, fmt.Errorf("encode PNG final: %w", err)
	}

	return buf.Bytes(), nil
}

// defaultLogoPath intenta resolver el logo con rutas típicas cuando la app vive dentro de /server.
func defaultLogoPath() string {
	candidates := []string{
		filepath.FromSlash("server/pkgs/qr-code/logo.png"),
		filepath.FromSlash("pkgs/qr-code/logo.png"),
		filepath.FromSlash("./server/pkgs/qr-code/logo.png"),
		filepath.FromSlash("./pkgs/qr-code/logo.png"),
	}

	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

func composeWithLogo(qr image.Image, logo image.Image, scaleFactor float64, padding int) image.Image {
	qrBounds := qr.Bounds()
	qrW := qrBounds.Dx()
	qrH := qrBounds.Dy()

	logoMax := int(float64(qrW) * scaleFactor)

	lb := logo.Bounds()
	lw, lh := lb.Dx(), lb.Dy()
	scale := float64(logoMax) / float64(max(lw, lh))
	newW := int(float64(lw) * scale)
	newH := int(float64(lh) * scale)

	resized := resizeNearest(logo, newW, newH)
	logoPad := addWhiteBackground(resized, padding)

	out := image.NewRGBA(qrBounds)
	draw.Draw(out, qrBounds, qr, image.Point{}, draw.Src)

	pb := logoPad.Bounds()
	x := (qrW - pb.Dx()) / 2
	y := (qrH - pb.Dy()) / 2

	draw.Draw(out, image.Rect(x, y, x+pb.Dx(), y+pb.Dy()), logoPad, image.Point{}, draw.Over)
	return out
}

func resizeNearest(img image.Image, width, height int) image.Image {
	b := img.Bounds()
	srcW := b.Dx()
	srcH := b.Dy()

	dst := image.NewRGBA(image.Rect(0, 0, width, height))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			srcX := x * srcW / width
			srcY := y * srcH / height
			dst.Set(x, y, img.At(b.Min.X+srcX, b.Min.Y+srcY))
		}
	}
	return dst
}

func addWhiteBackground(img image.Image, padding int) image.Image {
	b := img.Bounds()
	w := b.Dx() + padding*2
	h := b.Dy() + padding*2

	bg := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(bg, bg.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
	draw.Draw(bg, image.Rect(padding, padding, padding+b.Dx(), padding+b.Dy()), img, b.Min, draw.Over)
	return bg
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
