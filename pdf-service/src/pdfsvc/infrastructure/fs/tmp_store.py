from pathlib import Path
import tempfile
from dataclasses import dataclass

@dataclass(frozen=True)
class TmpStore:
    base_dir: Path

    @classmethod
    def default(cls) -> "TmpStore":
        base = Path(tempfile.gettempdir()) / "pdfsvc"
        base.mkdir(parents=True, exist_ok=True)
        return cls(base_dir=base)

    def assets_dir(self) -> Path:
        p = self.base_dir / "assets"
        p.mkdir(parents=True, exist_ok=True)
        return p

    def cached_logo_path(self) -> Path:
        return self.assets_dir() / "logo.png"

    def job_dir(self, job_id: str) -> Path:
        p = self.base_dir / job_id
        p.mkdir(parents=True, exist_ok=True)
        return p

    def template_pdf_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "template.pdf"

    def rendered_pdf_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "rendered.pdf"

    def qr_png_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "qr.png"

    def final_pdf_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "final.pdf"
