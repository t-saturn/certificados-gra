#!/usr/bin/env python
"""
Development server with auto-reload.
Watches src/ directory and restarts the service on changes.
"""

import subprocess
import sys
from pathlib import Path

try:
    from watchfiles import watch
except ImportError:
    print("Installing watchfiles...")
    subprocess.run([sys.executable, "-m", "pip", "install", "watchfiles"], check=True)
    from watchfiles import watch


def main():
    """Run service with auto-reload."""
    src_path = Path(__file__).parent / "src"
    process = None

    print(f"👀 Watching {src_path} for changes...")
    print("Press Ctrl+C to stop\n")

    def start_service():
        return subprocess.Popen(
            [sys.executable, "-m", "pdf_svc.main"],
            cwd=Path(__file__).parent,
        )

    # Start initially
    process = start_service()

    try:
        for changes in watch(src_path):
            print(f"\n🔄 Detected changes: {len(changes)} file(s)")
            for change_type, path in changes:
                print(f"   {change_type.name}: {Path(path).name}")

            # Restart service
            if process:
                print("⏹️  Stopping service...")
                process.terminate()
                process.wait()

            print("▶️  Starting service...")
            process = start_service()

    except KeyboardInterrupt:
        print("\n👋 Stopping...")
        if process:
            process.terminate()
            process.wait()


if __name__ == "__main__":
    main()
