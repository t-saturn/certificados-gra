Directory structure:
└── pdf-service/
    ├── app/
    │   ├── api/
    │   │   ├── routes/
    │   │   │   ├── generate_doc.py
    │   │   │   ├── health.py
    │   │   │   ├── jobs.py
    │   │   │   ├── __init__.py
    │   │   │   └── __pycache__/
    │   │   │       ├── documents.cpython-311.pyc
    │   │   │       ├── files.cpython-311.pyc
    │   │   │       ├── generate_doc.cpython-311.pyc
    │   │   │       ├── health.cpython-311.pyc
    │   │   │       ├── jobs.cpython-311.pyc
    │   │   │       └── __init__.cpython-311.pyc
    │   │   ├── schemas/
    │   │   │   ├── generate_doc.py
    │   │   │   └── __pycache__/
    │   │   │       └── generate_doc.cpython-311.pyc
    │   │   ├── __init__.py
    │   │   └── __pycache__/
    │   │       └── __init__.cpython-311.pyc
    │   ├── assets/
    │   │   └── logo.png
    │   ├── core/
    │   │   ├── config.py
    │   │   ├── logging.py
    │   │   ├── middleware.py
    │   │   ├── redis.py
    │   │   ├── __init__.py
    │   │   └── __pycache__/
    │   │       ├── config.cpython-311.pyc
    │   │       ├── logging.cpython-311.pyc
    │   │       ├── middleware.cpython-311.pyc
    │   │       ├── redis.cpython-311.pyc
    │   │       └── __init__.cpython-311.pyc
    │   ├── deps.py
    │   ├── main.py
    │   ├── repositories/
    │   │   ├── files_repository.py
    │   │   ├── jobs_repository.py
    │   │   ├── redis_jobs_repository.py
    │   │   └── __pycache__/
    │   │       ├── files_repository.cpython-311.pyc
    │   │       ├── jobs_repository.cpython-311.pyc
    │   │       └── redis_jobs_repository.cpython-311.pyc
    │   ├── services/
    │   │   ├── file_service.py
    │   │   ├── health_service.py
    │   │   ├── jobs_service.py
    │   │   ├── pdf_generation_service.py
    │   │   ├── pdf_service.py
    │   │   ├── qr_service.py
    │   │   ├── __init__.py
    │   │   └── __pycache__/
    │   │       ├── file_service.cpython-311.pyc
    │   │       ├── health_service.cpython-311.pyc
    │   │       ├── jobs_service.cpython-311.pyc
    │   │       ├── pdf_generation_service.cpython-311.pyc
    │   │       ├── pdf_service.cpython-311.pyc
    │   │       ├── qr_service.cpython-311.pyc
    │   │       └── __init__.cpython-311.pyc
    │   ├── __init__.py
    │   └── __pycache__/
    │       ├── deps.cpython-311.pyc
    │       ├── main.cpython-311.pyc
    │       └── __init__.cpython-311.pyc
    ├── Dockerfile
    ├── logs/
    │   └── 2025-12-23.log
    ├── README.md
    ├── requirements.txt
    ├── run.py
    └── worker.py