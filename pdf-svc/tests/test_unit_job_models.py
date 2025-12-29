"""
Unit tests for Job and Item models.

Tests model creation, status tracking, and response formatting.
Shows detailed information about generated IDs and states.
"""

from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from pdf_svc.models.job import (
    BatchItem,
    BatchJob,
    ItemData,
    ItemError,
    ItemStatus,
    JobStatus,
)


@pytest.mark.unit
class TestBatchItem:
    """Tests for BatchItem model."""

    def test_create_item_shows_generated_id(self) -> None:
        """Test item creation and show generated IDs."""
        user_id = uuid4()
        template_id = uuid4()

        item = BatchItem(
            user_id=user_id,
            template_id=template_id,
            serial_code="CERT-2025-000001",
        )

        # Show generated info
        print("\n" + "=" * 60)
        print("BatchItem Created:")
        print(f"  item_id:     {item.item_id}")
        print(f"  user_id:     {item.user_id}")
        print(f"  template_id: {item.template_id}")
        print(f"  serial_code: {item.serial_code}")
        print(f"  status:      {item.status.value}")
        print(f"  progress:    {item.progress_pct}%")
        print("=" * 60)

        assert isinstance(item.item_id, UUID)
        assert item.user_id == user_id
        assert item.status == ItemStatus.PENDING
        assert item.progress_pct == 0

    def test_item_status_progression(self) -> None:
        """Test item status progression and show state changes."""
        item = BatchItem(
            user_id=uuid4(),
            template_id=uuid4(),
            serial_code="CERT-2025-000001",
        )

        print("\n" + "=" * 60)
        print(f"Item ID: {item.item_id}")
        print("-" * 60)
        print("Status Progression:")

        statuses = [
            (ItemStatus.DOWNLOADING, 10),
            (ItemStatus.DOWNLOADED, 20),
            (ItemStatus.RENDERING, 30),
            (ItemStatus.RENDERED, 50),
            (ItemStatus.GENERATING_QR, 60),
            (ItemStatus.QR_GENERATED, 70),
            (ItemStatus.INSERTING_QR, 80),
            (ItemStatus.QR_INSERTED, 85),
            (ItemStatus.UPLOADING, 90),
            (ItemStatus.COMPLETED, 100),
        ]

        for status, expected_progress in statuses:
            item.update_status(status, expected_progress)
            print(f"  {status.value:15} → {item.progress_pct:3}%")

        print("=" * 60)

        assert item.status == ItemStatus.COMPLETED
        assert item.progress_pct == 100

    def test_item_set_completed(self) -> None:
        """Test marking item as completed with data."""
        item = BatchItem(
            user_id=uuid4(),
            template_id=uuid4(),
            serial_code="CERT-2025-000001",
        )

        data = ItemData(
            file_id=uuid4(),
            file_name="CERT-2025-000001.pdf",
            file_size=123456,
            file_hash="sha256:abc123...",
            mime_type="application/pdf",
            download_url="https://files.example.com/CERT-2025-000001.pdf",
        )

        item.set_completed(data)

        print("\n" + "=" * 60)
        print("Item Completed:")
        print(f"  item_id:    {item.item_id}")
        print(f"  user_id:    {item.user_id}")
        print(f"  status:     {item.status.value}")
        print(f"  progress:   {item.progress_pct}%")
        print("-" * 60)
        print("  Result Data:")
        print(f"    file_id:      {item.data.file_id}")
        print(f"    file_name:    {item.data.file_name}")
        print(f"    file_size:    {item.data.file_size} bytes")
        print(f"    download_url: {item.data.download_url}")
        print("=" * 60)

        assert item.status == ItemStatus.COMPLETED
        assert item.data is not None
        assert item.error is None

    def test_item_set_failed_includes_user_id(self) -> None:
        """Test marking item as failed includes user_id, status, message."""
        user_id = uuid4()
        item = BatchItem(
            user_id=user_id,
            template_id=uuid4(),
            serial_code="CERT-2025-000001",
        )

        item.update_status(ItemStatus.DOWNLOADING, 10)
        item.set_failed(
            stage="download",
            message="Template not found in storage",
            code="NOT_FOUND",
        )

        print("\n" + "=" * 60)
        print("Item Failed:")
        print(f"  item_id:     {item.item_id}")
        print(f"  user_id:     {item.user_id}")
        print(f"  serial_code: {item.serial_code}")
        print(f"  status:      {item.status.value}")
        print("-" * 60)
        print("  Error Details:")
        print(f"    user_id:   {item.error.user_id}")
        print(f"    status:    {item.error.status}")
        print(f"    message:   {item.error.message}")
        print(f"    stage:     {item.error.stage}")
        print(f"    code:      {item.error.code}")
        print("=" * 60)

        assert item.status == ItemStatus.FAILED
        assert item.error is not None
        assert item.error.user_id == user_id
        assert item.error.status == "failed"
        assert item.error.message == "Template not found in storage"
        assert item.error.stage == "download"
        assert item.error.code == "NOT_FOUND"
        assert item.data is None

    def test_item_to_response_completed(self) -> None:
        """Test item response format for completed item."""
        item = BatchItem(
            user_id=uuid4(),
            template_id=uuid4(),
            serial_code="CERT-2025-000001",
        )

        item.set_completed(
            ItemData(
                file_id=uuid4(),
                file_name="CERT-2025-000001.pdf",
                file_size=123456,
                download_url="https://example.com/file.pdf",
            )
        )

        response = item.to_response()

        print("\n" + "=" * 60)
        print("Item Response (Completed):")
        for key, value in response.items():
            if isinstance(value, dict):
                print(f"  {key}:")
                for k, v in value.items():
                    print(f"    {k}: {v}")
            else:
                print(f"  {key}: {value}")
        print("=" * 60)

        assert response["status"] == "completed"
        assert "data" in response
        assert "error" not in response

    def test_item_to_response_failed(self) -> None:
        """Test item response format for failed item."""
        user_id = uuid4()
        item = BatchItem(
            user_id=user_id,
            template_id=uuid4(),
            serial_code="CERT-2025-000001",
        )

        item.set_failed(
            stage="render",
            message="Invalid PDF format",
            code="INVALID_PDF",
        )

        response = item.to_response()

        print("\n" + "=" * 60)
        print("Item Response (Failed):")
        for key, value in response.items():
            if isinstance(value, dict):
                print(f"  {key}:")
                for k, v in value.items():
                    print(f"    {k}: {v}")
            else:
                print(f"  {key}: {value}")
        print("=" * 60)

        assert response["status"] == "failed"
        assert "error" in response
        assert response["error"]["user_id"] == str(user_id)
        assert response["error"]["status"] == "failed"
        assert response["error"]["message"] == "Invalid PDF format"
        assert "data" not in response


@pytest.mark.unit
class TestBatchJob:
    """Tests for BatchJob model."""

    def test_create_job_shows_ids(self) -> None:
        """Test job creation and show generated IDs."""
        pdf_job_id = uuid4()

        job = BatchJob(pdf_job_id=pdf_job_id)

        print("\n" + "=" * 60)
        print("BatchJob Created:")
        print(f"  pdf_job_id: {job.pdf_job_id} (external)")
        print(f"  job_id:     {job.job_id} (internal)")
        print(f"  status:     {job.status.value}")
        print(f"  created_at: {job.created_at}")
        print("=" * 60)

        assert job.pdf_job_id == pdf_job_id
        assert isinstance(job.job_id, UUID)
        assert job.status == JobStatus.PENDING

    def test_job_with_multiple_items(self) -> None:
        """Test job with multiple items shows all details."""
        job = BatchJob(pdf_job_id=uuid4())

        # Add items
        for i in range(3):
            item = BatchItem(
                user_id=uuid4(),
                template_id=uuid4(),
                serial_code=f"CERT-2025-{i+1:06d}",
            )
            job.add_item(item)

        print("\n" + "=" * 60)
        print("BatchJob with Items:")
        print(f"  pdf_job_id:  {job.pdf_job_id}")
        print(f"  job_id:      {job.job_id}")
        print(f"  total_items: {job.total_items}")
        print("-" * 60)
        print("  Items:")
        for i, item in enumerate(job.items):
            print(f"    [{i}] item_id: {item.item_id}")
            print(f"        user_id: {item.user_id}")
            print(f"        serial:  {item.serial_code}")
            print(f"        status:  {item.status.value}")
        print("=" * 60)

        assert job.total_items == 3

    def test_job_finalize_all_completed(self) -> None:
        """Test job finalization with all items completed."""
        job = BatchJob(pdf_job_id=uuid4())
        job.start_processing()

        # Add and complete items
        for i in range(3):
            item = BatchItem(
                user_id=uuid4(),
                template_id=uuid4(),
                serial_code=f"CERT-2025-{i+1:06d}",
            )
            item.set_completed(
                ItemData(file_id=uuid4(), file_name=f"cert-{i+1}.pdf")
            )
            job.add_item(item)

        job.finalize()

        print("\n" + "=" * 60)
        print("Job Finalized (All Completed):")
        print(f"  pdf_job_id:    {job.pdf_job_id}")
        print(f"  job_id:        {job.job_id}")
        print(f"  status:        {job.status.value}")
        print(f"  total_items:   {job.total_items}")
        print(f"  success_count: {job.success_count}")
        print(f"  failed_count:  {job.failed_count}")
        print(f"  processing_ms: {job.processing_time_ms}")
        print("=" * 60)

        assert job.status == JobStatus.COMPLETED
        assert job.success_count == 3
        assert job.failed_count == 0

    def test_job_finalize_partial(self) -> None:
        """Test job finalization with some items failed."""
        job = BatchJob(pdf_job_id=uuid4())
        job.start_processing()

        # Item 1: completed
        item1 = BatchItem(user_id=uuid4(), template_id=uuid4(), serial_code="CERT-001")
        item1.set_completed(ItemData(file_id=uuid4(), file_name="cert-1.pdf"))
        job.add_item(item1)

        # Item 2: failed
        item2 = BatchItem(user_id=uuid4(), template_id=uuid4(), serial_code="CERT-002")
        item2.set_failed("download", "File not found", "NOT_FOUND")
        job.add_item(item2)

        # Item 3: completed
        item3 = BatchItem(user_id=uuid4(), template_id=uuid4(), serial_code="CERT-003")
        item3.set_completed(ItemData(file_id=uuid4(), file_name="cert-3.pdf"))
        job.add_item(item3)

        job.finalize()

        print("\n" + "=" * 60)
        print("Job Finalized (Partial):")
        print(f"  pdf_job_id:    {job.pdf_job_id}")
        print(f"  job_id:        {job.job_id}")
        print(f"  status:        {job.status.value}")
        print(f"  total_items:   {job.total_items}")
        print(f"  success_count: {job.success_count}")
        print(f"  failed_count:  {job.failed_count}")
        print("-" * 60)
        for item in job.items:
            status_icon = "✓" if item.status == ItemStatus.COMPLETED else "✗"
            print(f"  [{status_icon}] {item.serial_code}: {item.status.value}")
            if item.error:
                print(f"      Error: {item.error.message}")
        print("=" * 60)

        assert job.status == JobStatus.PARTIAL
        assert job.success_count == 2
        assert job.failed_count == 1

    def test_job_finalize_all_failed(self) -> None:
        """Test job finalization with all items failed."""
        job = BatchJob(pdf_job_id=uuid4())
        job.start_processing()

        # All items fail
        for i in range(3):
            item = BatchItem(
                user_id=uuid4(),
                template_id=uuid4(),
                serial_code=f"CERT-{i+1:03d}",
            )
            item.set_failed("download", f"Error {i+1}", "ERROR")
            job.add_item(item)

        job.finalize()

        print("\n" + "=" * 60)
        print("Job Finalized (All Failed):")
        print(f"  pdf_job_id:    {job.pdf_job_id}")
        print(f"  job_id:        {job.job_id}")
        print(f"  status:        {job.status.value}")
        print(f"  total_items:   {job.total_items}")
        print(f"  success_count: {job.success_count}")
        print(f"  failed_count:  {job.failed_count}")
        print("-" * 60)
        for item in job.items:
            print(f"  [✗] {item.serial_code}:")
            print(f"      user_id: {item.error.user_id}")
            print(f"      status:  {item.error.status}")
            print(f"      message: {item.error.message}")
        print("=" * 60)

        assert job.status == JobStatus.FAILED
        assert job.success_count == 0
        assert job.failed_count == 3

    def test_job_to_response(self) -> None:
        """Test job response format includes pdf_job_id and job_id."""
        job = BatchJob(pdf_job_id=uuid4())
        job.start_processing()

        # Add mixed results
        item1 = BatchItem(user_id=uuid4(), template_id=uuid4(), serial_code="CERT-001")
        item1.set_completed(ItemData(file_id=uuid4(), file_name="cert-1.pdf", file_size=10000))
        job.add_item(item1)

        item2 = BatchItem(user_id=uuid4(), template_id=uuid4(), serial_code="CERT-002")
        item2.set_failed("render", "Invalid template", "INVALID_TEMPLATE")
        job.add_item(item2)

        job.finalize()
        response = job.to_response()

        print("\n" + "=" * 60)
        print("Job Response Format:")
        print(f"  pdf_job_id:      {response['pdf_job_id']}")
        print(f"  job_id:          {response['job_id']}")
        print(f"  status:          {response['status']}")
        print(f"  total_items:     {response['total_items']}")
        print(f"  success_count:   {response['success_count']}")
        print(f"  failed_count:    {response['failed_count']}")
        print(f"  processing_time: {response['processing_time_ms']}ms")
        print("-" * 60)
        print("  Items:")
        for item in response["items"]:
            print(f"    - item_id: {item['item_id']}")
            print(f"      user_id: {item['user_id']}")
            print(f"      serial:  {item['serial_code']}")
            print(f"      status:  {item['status']}")
            if "data" in item:
                print(f"      data:    file_name={item['data']['file_name']}")
            if "error" in item:
                print(f"      error:   user_id={item['error']['user_id']}")
                print(f"               status={item['error']['status']}")
                print(f"               message={item['error']['message']}")
        print("=" * 60)

        assert "pdf_job_id" in response
        assert "job_id" in response
        assert response["status"] == "partial"


@pytest.mark.unit
class TestItemError:
    """Tests for ItemError model."""

    def test_error_includes_required_fields(self) -> None:
        """Test error includes user_id, status, message."""
        user_id = uuid4()
        error = ItemError(
            user_id=user_id,
            status="failed",
            message="Template file corrupted",
            stage="download",
            code="CORRUPTED_FILE",
        )

        print("\n" + "=" * 60)
        print("ItemError Structure:")
        print(f"  user_id: {error.user_id}")
        print(f"  status:  {error.status}")
        print(f"  message: {error.message}")
        print(f"  stage:   {error.stage}")
        print(f"  code:    {error.code}")
        print("=" * 60)

        assert error.user_id == user_id
        assert error.status == "failed"
        assert error.message == "Template file corrupted"
