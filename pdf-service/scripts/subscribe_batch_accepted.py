import asyncio
from nats.aio.client import Client as NATS
import json


async def main():
    nc = NATS()
    await nc.connect("nats://127.0.0.1:4222")

    async def handler(msg):
        data = json.loads(msg.data.decode())
        print("received pdf.batch.accepted:")
        print(json.dumps(data, indent=2))

    await nc.subscribe("pdf.batch.accepted", cb=handler)
    print("listening on pdf.batch.accepted ...")
    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
