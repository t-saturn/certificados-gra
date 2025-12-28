import asyncio
from nats.aio.client import Client as NATS
import json



PAYLOAD = {
    "request_id": "test-request-001",
    "items": [
        {
            "template_id": "8748db65-9d84-4fdf-b47f-938cfa96366b",
            "user_id": "f3b6c2a1-9e7d-4c5a-b2f1-6d8a9c0e7b24",
            "is_public": True,
            "serial_code": "EVT-2025-OTIC-0002-CERT-000001",
            "qr": [
                {"base_url": "https://regionayacucho.gob.pe/verify"},
                {"verify_code": "CERT-OTIC-2025-000102"},
            ],
            "qr_pdf": [
                {"qr_size_cm": "2.5"},
                {"qr_margin_y_cm": "1.0"},
                {"qr_margin_x_cm": "1.0"},
                {"qr_page": "0"},
                {"qr_rect": "460,40,540,120"},
            ],
            "pdf": [
                {"key": "nombre_participante", "value": "MARÍA LUQUE RIVERA QUISPE"},
                {"key": "fecha", "value": "16/12/2024"},
                {"key": "firma_1_nombre", "value": "Dr. Carlos Mendoza"},
                {"key": "firma_1_cargo", "value": "Director de Bienestar Social"},
            ],
        }
    ]
}


async def main():
    nc = NATS()
    await nc.connect("nats://127.0.0.1:4222")
    await nc.publish("pdf.batch.requested", json.dumps(PAYLOAD).encode())
    await nc.flush()
    await nc.close()
    print("published pdf.batch.requested")


if __name__ == "__main__":
    asyncio.run(main())
