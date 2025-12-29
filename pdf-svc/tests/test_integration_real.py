"""
Integration tests that require the service to be running.

These tests connect to REAL NATS and Redis, send actual events,
and verify the responses from the running pdf-svc.

REQUIREMENTS:
- Redis running on localhost:6379
- NATS running on localhost:4222
- pdf-svc running (make run or make dev)
- file-svc running with valid templates

USAGE:
    make test-int
"""

from __future__ import annotations

import asyncio
import json
from uuid import uuid4

import pytest
import nats
from nats.aio.client import Client as NatsClient


# Configuration

NATS_URL = "nats://127.0.0.1:4222"

# Template IDs from file-svc
VALID_TEMPLATE_ID = "4d8f77f6-e454-40f1-b441-320922a0c9cd"
INVALID_TEMPLATE_ID = "00000000-0000-0000-0000-000000000000"

# NATS Subjects
REQUEST_SUBJECT = "pdf.batch.requested"
COMPLETED_SUBJECT = "pdf.batch.completed"


# Fixtures


@pytest.fixture
async def nats_client() -> NatsClient:
    """Connect to NATS server."""
    nc = await nats.connect(NATS_URL)
    yield nc
    await nc.close()


# Helper Functions


def print_separator(title: str, char: str = "=") -> None:
    """Print formatted separator."""
    print(f"\n{char * 70}")
    print(f"  {title}")
    print(f"{char * 70}")


def print_json(label: str, data: dict) -> None:
    """Print formatted JSON."""
    print(f"\n{label}:")
    print(json.dumps(data, indent=2, ensure_ascii=False, default=str))


def create_item(
    serial_code: str,
    template_id: str = VALID_TEMPLATE_ID,
    nombre_participante: str = "JUAN CARLOS PÉREZ GARCÍA",
    firma_1_nombre: str = "Dr. Carlos Rodríguez Mendoza",
    firma_1_cargo: str = "Director General de Capacitación",
    fecha: str = "29 de diciembre de 2024",
) -> dict:
    """Create a test item with the correct PDF fields."""
    return {
        "user_id": str(uuid4()),
        "template_id": template_id,
        "serial_code": serial_code,
        "is_public": True,
        "pdf": [
            {"key": "nombre_participante", "value": nombre_participante},
            {"key": "firma_1_nombre", "value": firma_1_nombre},
            {"key": "firma_1_cargo", "value": firma_1_cargo},
            {"key": "fecha", "value": fecha},
        ],
        "qr": [
            {"base_url": "https://verify.gob.pe"},
            {"verify_code": serial_code},
        ],
        "qr_pdf": [
            {"qr_size_cm": "2.5"},
            {"qr_page": "0"},
        ],
    }


async def wait_for_response(
    nc: NatsClient,
    subject: str,
    pdf_job_id: str,
    timeout: float = 30.0,
) -> dict | None:
    """Wait for a response on given subject matching pdf_job_id."""
    result = None
    event = asyncio.Event()

    async def handler(msg):
        nonlocal result
        try:
            data = json.loads(msg.data.decode())
            payload = data.get("payload", {})
            if str(payload.get("pdf_job_id")) == pdf_job_id:
                result = data
                event.set()
        except Exception as e:
            print(f"  ⚠️  Error parsing message: {e}")

    sub = await nc.subscribe(subject, cb=handler)

    try:
        await asyncio.wait_for(event.wait(), timeout=timeout)
    except asyncio.TimeoutError:
        print(f"  ⏱️  Timeout waiting for response on {subject}")
    finally:
        await sub.unsubscribe()

    return result


# Integration Tests


@pytest.mark.integration
class TestRealPipeline:
    """
    Integration tests that communicate with running pdf-svc.
    
    These tests send real NATS events and verify the responses.
    The service must be running for these tests to pass.
    """

    async def test_single_item_valid_template(self, nats_client: NatsClient) -> None:
        """
        Test: Single item with VALID template.
        Expected: status=completed, file_id returned.
        """
        pdf_job_id = str(uuid4())

        request = {
            "event_type": "pdf.batch.requested",
            "payload": {
                "pdf_job_id": pdf_job_id,
                "items": [
                    create_item(
                        serial_code="CERT-INT-001",
                        nombre_participante="USUARIO DE PRUEBA INTEGRACIÓN",
                        firma_1_nombre="Ing. María López Sánchez",
                        firma_1_cargo="Coordinadora de Certificación",
                    )
                ],
            },
        }

        print_separator("TEST: Single Item - Valid Template")
        print_json("📤 REQUEST", request)

        # Start listening before publishing
        response_task = asyncio.create_task(
            wait_for_response(nats_client, COMPLETED_SUBJECT, pdf_job_id)
        )

        # Publish request
        await nats_client.publish(
            REQUEST_SUBJECT,
            json.dumps(request).encode(),
        )
        print(f"\n✅ Published to {REQUEST_SUBJECT}")

        # Wait for response
        print(f"⏳ Waiting for response on {COMPLETED_SUBJECT}...")
        response = await response_task

        if response:
            print_json("📥 RESPONSE", response)

            payload = response.get("payload", {})
            assert payload.get("status") == "completed", f"Expected completed, got {payload.get('status')}"
            assert payload.get("success_count") == 1
            assert payload.get("failed_count") == 0

            items = payload.get("items", [])
            assert len(items) == 1

            item = items[0]
            assert item.get("status") == "completed"
            assert item.get("data", {}).get("file_id") is not None

            file_id = item["data"]["file_id"]
            download_url = item["data"].get("download_url", "")
            print(f"\n🎉 SUCCESS! file_id: {file_id}")
            print(f"   Download: {download_url}")
        else:
            pytest.fail("No response received - is the service running?")

    async def test_single_item_invalid_template(self, nats_client: NatsClient) -> None:
        """
        Test: Single item with INVALID template.
        Expected: status=failed, error message.
        """
        pdf_job_id = str(uuid4())

        request = {
            "event_type": "pdf.batch.requested",
            "payload": {
                "pdf_job_id": pdf_job_id,
                "items": [
                    create_item(
                        serial_code="CERT-FAIL-001",
                        template_id=INVALID_TEMPLATE_ID,
                        nombre_participante="USUARIO FALLIDO",
                    )
                ],
            },
        }

        print_separator("TEST: Single Item - Invalid Template")
        print_json("📤 REQUEST", request)

        # Listen
        response_task = asyncio.create_task(
            wait_for_response(nats_client, COMPLETED_SUBJECT, pdf_job_id)
        )

        # Publish
        await nats_client.publish(
            REQUEST_SUBJECT,
            json.dumps(request).encode(),
        )
        print(f"\n✅ Published to {REQUEST_SUBJECT}")

        # Wait
        print(f"⏳ Waiting for response...")
        response = await response_task

        if response:
            print_json("📥 RESPONSE", response)

            payload = response.get("payload", {})
            assert payload.get("status") == "failed"
            assert payload.get("failed_count") == 1
            
            items = payload.get("items", [])
            assert len(items) == 1

            item = items[0]
            assert item.get("status") == "failed"
            assert item.get("error") is not None

            error = item["error"]
            print(f"\n✅ Expected failure detected!")
            print(f"   user_id: {error.get('user_id')}")
            print(f"   message: {error.get('message')}")
        else:
            pytest.fail("No response received - is the service running?")

    async def test_mixed_batch_valid_and_invalid(self, nats_client: NatsClient) -> None:
        """
        Test: Batch with VALID and INVALID templates.
        Expected: status=partial, some succeed, some fail.
        """
        pdf_job_id = str(uuid4())

        request = {
            "event_type": "pdf.batch.requested",
            "payload": {
                "pdf_job_id": pdf_job_id,
                "items": [
                    # Item 1: VALID
                    create_item(
                        serial_code="CERT-MIX-001",
                        nombre_participante="USUARIO VÁLIDO 1",
                        firma_1_nombre="Lic. Ana García Torres",
                        firma_1_cargo="Secretaria Técnica",
                    ),
                    # Item 2: INVALID
                    create_item(
                        serial_code="CERT-MIX-002",
                        template_id=INVALID_TEMPLATE_ID,
                        nombre_participante="USUARIO INVÁLIDO",
                    ),
                    # Item 3: VALID
                    create_item(
                        serial_code="CERT-MIX-003",
                        nombre_participante="USUARIO VÁLIDO 2",
                        firma_1_nombre="Dr. Pedro Sánchez Ríos",
                        firma_1_cargo="Director Académico",
                    ),
                ],
            },
        }

        print_separator("TEST: Mixed Batch - Valid + Invalid Templates")
        print_json("📤 REQUEST", request)

        # Listen
        response_task = asyncio.create_task(
            wait_for_response(nats_client, COMPLETED_SUBJECT, pdf_job_id, timeout=60.0)
        )

        # Publish
        await nats_client.publish(
            REQUEST_SUBJECT,
            json.dumps(request).encode(),
        )
        print(f"\n✅ Published to {REQUEST_SUBJECT}")

        # Wait
        print(f"⏳ Waiting for response (up to 60s for batch)...")
        response = await response_task

        if response:
            print_json("📥 RESPONSE", response)

            payload = response.get("payload", {})
            status = payload.get("status")
            success_count = payload.get("success_count", 0)
            failed_count = payload.get("failed_count", 0)

            print(f"\n📊 SUMMARY:")
            print(f"   Status:        {status}")
            print(f"   Success count: {success_count}")
            print(f"   Failed count:  {failed_count}")

            # Show each item result
            print(f"\n📋 ITEMS:")
            for i, item in enumerate(payload.get("items", [])):
                serial = item.get("serial_code")
                item_status = item.get("status")
                
                if item_status == "completed":
                    file_id = item.get("data", {}).get("file_id")
                    download_url = item.get("data", {}).get("download_url", "")
                    print(f"   [{i+1}] ✅ {serial}: completed")
                    print(f"       file_id: {file_id}")
                    print(f"       download: {download_url}")
                else:
                    error = item.get("error", {})
                    print(f"   [{i+1}] ❌ {serial}: failed")
                    print(f"       message: {error.get('message')}")

            # Assertions
            assert status == "partial"
            assert success_count == 2
            assert failed_count == 1
        else:
            pytest.fail("No response received - is the service running?")

    async def test_multiple_valid_items(self, nats_client: NatsClient) -> None:
        """
        Test: Multiple items all with VALID template.
        Expected: status=completed, all items have file_id.
        """
        pdf_job_id = str(uuid4())

        request = {
            "event_type": "pdf.batch.requested",
            "payload": {
                "pdf_job_id": pdf_job_id,
                "items": [
                    create_item(
                        serial_code="CERT-BATCH-001",
                        nombre_participante="PARTICIPANTE LOTE 1",
                        firma_1_nombre="Mg. Roberto Díaz Luna",
                        firma_1_cargo="Jefe de Capacitación",
                    ),
                    create_item(
                        serial_code="CERT-BATCH-002",
                        nombre_participante="PARTICIPANTE LOTE 2",
                        firma_1_nombre="Mg. Roberto Díaz Luna",
                        firma_1_cargo="Jefe de Capacitación",
                    ),
                    create_item(
                        serial_code="CERT-BATCH-003",
                        nombre_participante="PARTICIPANTE LOTE 3",
                        firma_1_nombre="Mg. Roberto Díaz Luna",
                        firma_1_cargo="Jefe de Capacitación",
                    ),
                ],
            },
        }

        print_separator("TEST: Multiple Valid Items")
        print_json("📤 REQUEST", request)

        # Listen
        response_task = asyncio.create_task(
            wait_for_response(nats_client, COMPLETED_SUBJECT, pdf_job_id, timeout=60.0)
        )

        # Publish
        await nats_client.publish(
            REQUEST_SUBJECT,
            json.dumps(request).encode(),
        )
        print(f"\n✅ Published to {REQUEST_SUBJECT}")

        # Wait
        print(f"⏳ Waiting for response...")
        response = await response_task

        if response:
            print_json("📥 RESPONSE", response)

            payload = response.get("payload", {})
            
            print(f"\n📊 RESULTS:")
            for item in payload.get("items", []):
                serial = item.get("serial_code")
                status = item.get("status")
                if status == "completed":
                    file_id = item.get("data", {}).get("file_id")
                    print(f"   ✅ {serial}: {file_id}")
                else:
                    print(f"   ❌ {serial}: {item.get('error', {}).get('message')}")

            assert payload.get("status") == "completed"
            assert payload.get("success_count") == 3
        else:
            pytest.fail("No response received - is the service running?")

    async def test_connection_check(self, nats_client: NatsClient) -> None:
        """
        Test: Verify NATS connection is working.
        This is a basic sanity check.
        """
        print_separator("TEST: Connection Check")

        assert nats_client.is_connected, "NATS not connected!"
        print(f"✅ NATS connected to {NATS_URL}")
        print(f"   Client ID: {nats_client.client_id}")
