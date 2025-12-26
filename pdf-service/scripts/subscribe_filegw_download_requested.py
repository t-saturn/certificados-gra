from __future__ import annotations

import asyncio
import json
from nats.aio.client import Client as NATS


# Listen broadly so we don't miss subjects if they change:
# - filegw.download.requested
# - files.download.requested
# - files.upload.requested
# - etc...
SUBJECTS = [
    "filegw.>",
    "files.>",
]


def _try_parse_json(raw: bytes):
    try:
        return json.loads(raw.decode("utf-8"))
    except Exception:
        try:
            return raw.decode("utf-8")
        except Exception:
            return raw


async def main() -> None:
    nc = NATS()
    await nc.connect("nats://127.0.0.1:4222")

    async def handler(msg):
        data = _try_parse_json(msg.data)

        print("\n" + "=" * 72)
        print(f"Received on subject: {msg.subject}")
        print("-" * 72)

        if isinstance(data, dict):
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(data)

    # Subscribe to wildcard subjects
    for s in SUBJECTS:
        await nc.subscribe(s, cb=handler)

    print(f"listening on: {', '.join(SUBJECTS)}")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("\nstopping subscriber...")
    finally:
        await nc.close()


if __name__ == "__main__":
    asyncio.run(main())
