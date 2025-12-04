# Contributing to certificados-gra

Thank you for your interest in contributing to **certificados-gra**! This document provides guidelines to help you get started.

## Table of Contents

- [Project Overview](#project-overview)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Cloning the Repository](#cloning-the-repository)
  - [Frontend Setup (Next.js)](#frontend-setup-nextjs)
  - [Backend Setup (Go)](#backend-setup-go)
- [Development Environment](#development-environment)
- [Linting](#linting)
- [Branching Strategy](#branching-strategy)
- [Commit Message Conventions](#commit-message-conventions)
- [Pull Request Process](#pull-request-process)
- [Opening Issues](#opening-issues)
- [Code of Conduct](#code-of-conduct)

## Project Overview

This project consists of two main components:

- **Frontend (`/app`)**: A Next.js application built with TypeScript, React 19, and Tailwind CSS.
- **Backend (`/server`)**: A Go server using the Fiber framework with PostgreSQL as the database.

## Getting Started

### Prerequisites

Make sure you have the following tools installed:

- **Node.js** (v18 or higher recommended) – [Install Node.js](https://nodejs.org/)
- **Bun** (package manager used for the frontend) – [Install Bun](https://bun.sh/)
- **Go** (v1.21 or higher) – [Install Go](https://go.dev/dl/)
- **PostgreSQL** (for the backend database) – [Install PostgreSQL](https://www.postgresql.org/download/)
- **Air** (optional, for hot-reloading during Go development)

Verify your installations:

```bash
node --version    # Should be v18.x or higher
bun --version     # Should be 1.x
go version        # Should be go1.21 or higher
psql --version    # PostgreSQL client
```

### Cloning the Repository

```bash
git clone https://github.com/t-saturn/certificados-gra.git
cd certificados-gra
```

### Frontend Setup (Next.js)

1. Navigate to the `app` directory:

   ```bash
   cd app
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Create a `.env.local` file with the required environment variables (refer to `.env.example` if available).

4. Start the development server:

   ```bash
   bun run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000).

### Backend Setup (Go)

1. Navigate to the `server` directory:

   ```bash
   cd server
   ```

2. Install Go dependencies:

   ```bash
   go mod download
   ```

3. Create a `.env` file with the required environment variables (refer to `.env.example` if available).

4. Run the server:

   ```bash
   # Using make (recommended for development with hot-reload)
   make dev

   # Or using go run directly
   make run
   ```

   > **Note**: The `make dev` command requires [Air](https://github.com/air-verse/air) to be installed for hot-reloading. Install it with:
   >
   > ```bash
   > go install github.com/air-verse/air@latest
   > ```

## Development Environment

### Frontend Development

| Command         | Description                      |
| --------------- | -------------------------------- |
| `bun run dev`   | Start development server         |
| `bun run build` | Build for production             |
| `bun run start` | Start production server          |
| `bun run lint`  | Run ESLint                       |

### Backend Development

| Command     | Description                                   |
| ----------- | --------------------------------------------- |
| `make dev`  | Start development server with hot-reload (Air) |
| `make run`  | Run the server directly                        |
| `make help` | Show available make commands                   |

## Linting

### Frontend

The frontend uses ESLint with Next.js recommended configurations. Run the linter with:

```bash
cd app
bun run lint
```

### Backend

For Go code, use standard Go tools:

```bash
cd server
go fmt ./...
go vet ./...
```

## Branching Strategy

We follow a simplified Git flow:

- **`main`**: Production-ready code. All PRs should target this branch.
- **Feature branches**: Create a new branch for each feature or bug fix.

### Branch Naming Convention

Use descriptive branch names following this pattern:

- `feature/<short-description>` – For new features
- `fix/<short-description>` – For bug fixes
- `docs/<short-description>` – For documentation changes
- `refactor/<short-description>` – For code refactoring

**Examples:**

```bash
git checkout -b feature/user-authentication
git checkout -b fix/certificate-validation
git checkout -b docs/update-readme
```

## Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This enables automatic changelog generation and semantic versioning.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | A new feature                                    |
| `fix`      | A bug fix                                        |
| `docs`     | Documentation only changes                       |
| `style`    | Code style changes (formatting, semicolons, etc) |
| `refactor` | Code refactoring without feature/fix             |
| `test`     | Adding or updating tests                         |
| `chore`    | Maintenance tasks (deps, configs, etc)           |
| `perf`     | Performance improvements                         |
| `ci`       | CI/CD configuration changes                      |

### Examples

```bash
git commit -m "feat(auth): add user login functionality"
git commit -m "fix(api): handle null pointer in certificate handler"
git commit -m "docs: update contributing guidelines"
git commit -m "chore(deps): update next.js to v16"
```

## Pull Request Process

1. **Create a feature branch** from `main`.

2. **Make your changes** and commit following the commit conventions above.

3. **Push your branch** to GitHub:

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request** targeting the `main` branch.

5. **PR Requirements:**
   - Title must be in English and follow Conventional Commits format.
   - Description should clearly explain what the PR does and why.
   - Link any related issues using keywords like `Fixes #123` or `Closes #456`.
   - Ensure all existing tests and linters pass.

6. **Code Review**: Wait for maintainers to review your PR. Address any requested changes.

7. **Merge**: Once approved, a maintainer will merge your PR.

## Opening Issues

When opening an issue, please:

1. **Search existing issues** to avoid duplicates.

2. **Use a clear and descriptive title** in English.

3. **Provide detailed information:**
   - Steps to reproduce (for bugs)
   - Expected vs. actual behavior
   - Screenshots or logs if applicable
   - Environment details (OS, browser, versions)

4. **Use labels** if available to categorize the issue.

## Code of Conduct

Please be respectful and considerate in all interactions. We are committed to providing a welcoming and inclusive environment for everyone.

---

Thank you for contributing to **certificados-gra**! 🎉
