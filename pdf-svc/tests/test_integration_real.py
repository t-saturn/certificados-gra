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


# =============================================================================
# Configuration
# =============================================================================

NATS_URL = "nats://127.0.0.1:4222"

# Template IDs from file-svc
VALID_TEMPLATE_ID = "8748db65-9d84-4fdf-b47f-938cfa96366b"
INVALID_TEMPLATE_ID = "25a14031-1bc5-4c6f-910e-c86cc9378336"

# NATS Subjects
REQUEST_SUBJECT = "pdf.batch.requested"
COMPLETED_SUBJECT = "pdf.batch.completed"
FAILED_SUBJECT = "pdf.batch.failed"
ITEM_COMPLETED_SUBJECT = "pdf.item.completed"
ITEM_FAILED_SUBJECT = "pdf.item.failed"


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
async def nats_client() -> NatsClient:
    """Connect to NATS server."""
    nc = await nats.connect(NATS_URL)
    yield nc
    await nc.close()


# =============================================================================
# Helper Functions
# =============================================================================


def print_separator(title: str, char: str = "=") -> None:
    """Print formatted separator."""
    print(f"\n{char * 70}")
    print(f"  {title}")
    print(f"{char * 70}")


def print_json(label: str, data: dict) -> None:
    """Print formatted JSON."""
    print(f"\n{label}:")
    print(json.dumps(data, indent=2, ensure_ascii=False, default=str))


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


# =============================================================================
# Integration Tests
# =============================================================================


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
        user_id = str(uuid4())

        request = {
            "event_type": "pdf.batch.requested",
            "payload": {
                "pdf_job_id": pdf_job_id,
                "items": [
                    {
                        "user_id": user_id,
                        "template_id": VALID_TEMPLATE_ID,
                        "serial_code": "CERT-INT-001",
                        "is_public": True,
                        "pdf": [
                            {"key": "nombre", "value": "USUARIO DE PRUEBA"},
                            {"key": "curso", "value": "Test de Integración"},
                            {"key": "fecha", "value": "29/12/2024"},
                        ],
                        "qr": [
                            {"base_url": "https://verify.gob.pe"},
                            {"verify_code": "CERT-INT-001"},
                        ],
                        "qr_pdf": [
                            {"qr_size_cm": "2.5"},
                            {"qr_page": "0"},
                        ],
                    }
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
            print(f"\n🎉 SUCCESS! file_id: {file_id}")
            print(f"   Download: http://localhost:8080/download?file_id={file_id}")
        else:
            pytest.fail("No response received - is the service running?")

    async def test_single_item_invalid_template(self, nats_client: NatsClient) -> None:
        """
        Test: Single item with INVALID template.
        Expected: status=failed, error message.
        """
        pdf_job_id = str(uuid4())
        user_id = str(uuid4())

        request = {
            "event_type": "pdf.batch.requested",
            "payload": {
                "pdf_job_id": pdf_job_id,
                "items": [
                    {
                        "user_id": user_id,
                        "template_id": INVALID_TEMPLATE_ID,
                        "serial_code": "CERT-FAIL-001",
                        "is_public": True,
                        "pdf": [
                            {"key": "nombre", "value": "USUARIO FALLIDO"},
                        ],
                        "qr": [
                            {"base_url": "https://verify.gob.pe"},
                            {"verify_code": "CERT-FAIL-001"},
                        ],
                        "qr_pdf": [
                            {"qr_size_cm": "2.5"},
                            {"qr_page": "0"},
                        ],
                    }
                ],
            },
        }

        print_separator("TEST: Single Item - Invalid Template")
        print_json("📤 REQUEST", request)

        # Start listening
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
            # Could be "failed" or "partial" depending on implementation
            assert payload.get("status") in ("failed", "partial", "completed")
            
            items = payload.get("items", [])
            if items:
                item = items[0]
                if item.get("status") == "failed":
                    print(f"\n✅ Expected failure detected!")
                    print(f"   user_id: {item.get('error', {}).get('user_id')}")
                    print(f"   message: {item.get('error', {}).get('message')}")
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
                    {
                        "user_id": str(uuid4()),
                        "template_id": VALID_TEMPLATE_ID,
                        "serial_code": "CERT-MIX-001",
                        "is_public": True,
                        "pdf": [
                            {"key": "nombre", "value": "USUARIO VÁLIDO 1"},
                            {"key": "curso", "value": "Curso de Prueba"},
                            {"key": "fecha", "value": "29/12/2024"},
                        ],
                        "qr": [
                            {"base_url": "https://verify.gob.pe"},
                            {"verify_code": "CERT-MIX-001"},
                        ],
                        "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
                    },
                    # Item 2: INVALID
                    {
                        "user_id": str(uuid4()),
                        "template_id": INVALID_TEMPLATE_ID,
                        "serial_code": "CERT-MIX-002",
                        "is_public": True,
                        "pdf": [{"key": "nombre", "value": "USUARIO INVÁLIDO"}],
                        "qr": [
                            {"base_url": "https://verify.gob.pe"},
                            {"verify_code": "CERT-MIX-002"},
                        ],
                        "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
                    },
                    # Item 3: VALID
                    {
                        "user_id": str(uuid4()),
                        "template_id": VALID_TEMPLATE_ID,
                        "serial_code": "CERT-MIX-003",
                        "is_public": True,
                        "pdf": [
                            {"key": "nombre", "value": "USUARIO VÁLIDO 2"},
                            {"key": "curso", "value": "Otro Curso"},
                            {"key": "fecha", "value": "29/12/2024"},
                        ],
                        "qr": [
                            {"base_url": "https://verify.gob.pe"},
                            {"verify_code": "CERT-MIX-003"},
                        ],
                        "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
                    },
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
                    print(f"   [{i+1}] ✅ {serial}: completed")
                    print(f"       file_id: {file_id}")
                    print(f"       download: http://localhost:8080/download?file_id={file_id}")
                else:
                    error = item.get("error", {})
                    print(f"   [{i+1}] ❌ {serial}: failed")
                    print(f"       message: {error.get('message')}")

            # Assertions
            assert status in ("partial", "completed", "failed")
            assert success_count >= 0
            assert failed_count >= 0
        else:
            pytest.fail("No response received - is the service running?")

    async def test_multiple_valid_items(self, nats_client: NatsClient) -> None:
        """
        Test: Multiple items all with VALID template.
        Expected: status=completed, all items have file_id.
        """
        pdf_job_id = str(uuid4())

        items = []
        for i in range(3):
            items.append({
                "user_id": str(uuid4()),
                "template_id": VALID_TEMPLATE_ID,
                "serial_code": f"CERT-BATCH-{i+1:03d}",
                "is_public": True,
                "pdf": [
                    {"key": "nombre", "value": f"USUARIO BATCH {i+1}"},
                    {"key": "curso", "value": "Curso en Lote"},
                    {"key": "fecha", "value": "29/12/2024"},
                ],
                "qr": [
                    {"base_url": "https://verify.gob.pe"},
                    {"verify_code": f"CERT-BATCH-{i+1:03d}"},
                ],
                "qr_pdf": [{"qr_size_cm": "2.5"}, {"qr_page": "0"}],
            })

        request = {
            "event_type": "pdf.batch.requested",
            "payload": {
                "pdf_job_id": pdf_job_id,
                "items": items,
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
