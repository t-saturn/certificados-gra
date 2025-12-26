from __future__ import annotations

import asyncio
from watchfiles import run_process


def _run() -> None:
    from pdfsvc.main import main
    asyncio.run(main())


def main() -> None:
    run_process("src", target=_run)


if __name__ == "__main__":
    main()
