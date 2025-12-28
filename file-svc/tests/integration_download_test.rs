//! INTEGRATION TESTS - FILE DOWNLOAD
//!
//! Tests de integración para GET /download?file_id=xxx
//!
//! REQUISITOS:
//!   - Servicio corriendo en http://localhost:8080
//!   - Ejecutar primero los tests de upload para tener archivos
//!
//! EJECUTAR:
//!   cargo test --test integration_download_test -- --nocapture --test-threads=1
//!

use reqwest::multipart;
use serde_json::Value;
use std::time::Duration;

const BASE_URL: &str = "http://localhost:8080";
const USER_ID: &str = "584211ff-6e2a-4e59-a3bf-6738535ab5e0";

// HELPERS

fn print_header(title: &str) {
    println!("\n{}", "═".repeat(80));
    println!("  {}", title);
    println!("{}\n", "═".repeat(80));
}

fn print_section(title: &str) {
    println!("\n{}", "─".repeat(60));
    println!("  {}", title);
    println!("{}", "─".repeat(60));
}

fn print_request(method: &str, url: &str, details: &[(&str, &str)]) {
    println!("-- REQUEST:");
    println!("   {} {}", method, url);
    for (key, value) in details {
        println!("   {}: {}", key, value);
    }
}

fn print_response_headers(status: &reqwest::StatusCode, headers: &reqwest::header::HeaderMap) {
    let status_icon = if status.is_success() { "[ok]" } else { "[err]" };
    println!("\n-- RESPONSE:");
    println!("   Status: {} {}", status_icon, status);
    println!("\n   Headers:");

    let important_headers = [
        "content-type",
        "content-disposition",
        "content-length",
        "cache-control",
    ];
    for header_name in important_headers {
        if let Some(value) = headers.get(header_name) {
            println!("   • {}: {:?}", header_name, value);
        }
    }
}

async fn check_service() -> bool {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap();

    match client.get(format!("{}/health", BASE_URL)).send().await {
        Ok(res) => {
            if res.status().is_success() {
                println!("ok Servicio disponible en {}", BASE_URL);
                true
            } else {
                println!("[err] Servicio respondió con error: {}", res.status());
                false
            }
        }
        Err(e) => {
            println!("[err] No se puede conectar al servicio: {}", e);
            println!("    Ejecuta: cargo run");
            false
        }
    }
}

/// Helper para subir un archivo y obtener su ID
async fn upload_test_file(
    client: &reqwest::Client,
    content: &[u8],
    filename: &str,
    content_type: &str,
) -> Option<String> {
    let file_part = multipart::Part::bytes(content.to_vec())
        .file_name(filename.to_string())
        .mime_str(content_type)
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await
        .ok()?;

    if response.status().is_success() {
        let body = response.text().await.ok()?;
        let json: Value = serde_json::from_str(&body).ok()?;
        json["data"]["id"].as_str().map(|s| s.to_string())
    } else {
        None
    }
}

// TEST 1: Flujo completo - Upload y luego Download

#[tokio::test]
async fn test_01_upload_then_download_complete_flow() {
    print_header("TEST 01: Flujo completo - Upload → Download → Verificar contenido");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // ========== PASO 1: Upload ==========
    print_section("PASO 1: Subir archivo");

    let original_content = format!(
        "Contenido original del archivo\n\
         Timestamp: {}\n\
         Este texto debe ser idéntico al descargar.",
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    );

    println!("-- Contenido original ({} bytes):", original_content.len());
    println!("   ┌{}┐", "─".repeat(50));
    for line in original_content.lines() {
        println!("   │ {}", line);
    }
    println!("   └{}┘", "─".repeat(50));

    let file_id = upload_test_file(
        &client,
        original_content.as_bytes(),
        "test-download.txt",
        "text/plain",
    )
    .await;

    let file_id = match file_id {
        Some(id) => {
            println!("\n[ok] Archivo subido!");
            println!("    File ID: {}", id);
            id
        }
        None => {
            println!("\n[err] Error al subir archivo - no se puede continuar");
            return;
        }
    };

    // ========== PASO 2: Download ==========
    print_section("PASO 2: Descargar archivo");

    let download_url = format!("{}/download?file_id={}", BASE_URL, file_id);
    print_request("GET", &download_url, &[("file_id", &file_id)]);

    let response = client.get(&download_url).send().await;

    match response {
        Ok(res) => {
            let status = res.status();
            let headers = res.headers().clone();
            print_response_headers(&status, &headers);

            if status.is_success() {
                let downloaded_bytes = res.bytes().await.unwrap_or_default();
                let downloaded_content = String::from_utf8_lossy(&downloaded_bytes);

                println!(
                    "\n-- Contenido descargado ({} bytes):",
                    downloaded_bytes.len()
                );
                println!("   ┌{}┐", "─".repeat(50));
                for line in downloaded_content.lines() {
                    println!("   │ {}", line);
                }
                println!("   └{}┘", "─".repeat(50));

                // ========== PASO 3: Verificar ==========
                print_section("PASO 3: Verificar integridad");

                if downloaded_content == original_content {
                    println!("   [ok] ¡CONTENIDO IDÉNTICO!");
                    println!("    Bytes originales: {}", original_content.len());
                    println!("    Bytes descargados: {}", downloaded_bytes.len());
                    println!("\n🎉 TEST EXITOSO - El flujo upload→download funciona correctamente");
                } else {
                    println!("   [err] ¡CONTENIDO DIFERENTE!");
                    println!("    Bytes originales: {}", original_content.len());
                    println!("    Bytes descargados: {}", downloaded_bytes.len());
                }
            } else {
                let body = res.text().await.unwrap_or_default();
                println!("\n[err] Error en download:");
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&json).unwrap_or_default()
                    );
                }
            }
        }
        Err(e) => println!("\n[err] ERROR DE CONEXIÓN: {}", e),
    }
}

// TEST 2: Download archivo PDF

#[tokio::test]
async fn test_02_download_pdf_file() {
    print_header("TEST 02: Upload y Download de PDF");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // PDF mínimo
    let pdf_content = b"%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj\n<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n101\n%%EOF";

    print_section("PASO 1: Subir PDF");
    println!("    Tamaño: {} bytes", pdf_content.len());
    println!("    Primeros bytes: {:?}", &pdf_content[..8]);

    let file_id = upload_test_file(&client, pdf_content, "documento.pdf", "application/pdf").await;

    let file_id = match file_id {
        Some(id) => {
            println!("   [ok] PDF subido - ID: {}", id);
            id
        }
        None => {
            println!("   [err] Error al subir PDF");
            return;
        }
    };

    print_section("PASO 2: Descargar PDF");

    let download_url = format!("{}/download?file_id={}", BASE_URL, file_id);
    let response = client.get(&download_url).send().await;

    match response {
        Ok(res) => {
            let status = res.status();
            let headers = res.headers().clone();
            print_response_headers(&status, &headers);

            if status.is_success() {
                let downloaded = res.bytes().await.unwrap_or_default();

                println!("\n-- VERIFICACIÓN:");
                println!("   -- Tamaño descargado: {} bytes", downloaded.len());
                println!(
                    "   -- Primeros bytes: {:?}",
                    &downloaded[..8.min(downloaded.len())]
                );

                // Verificar que es un PDF válido
                if downloaded.starts_with(b"%PDF") {
                    println!("   [ok] Es un PDF válido (comienza con %PDF)");
                } else {
                    println!("   [warn]  No parece ser un PDF válido");
                }

                // Verificar Content-Type
                if let Some(ct) = headers.get("content-type") {
                    if ct.to_str().unwrap_or("").contains("pdf") {
                        println!("   [ok] Content-Type correcto: {:?}", ct);
                    } else {
                        println!("   [warn]  Content-Type inesperado: {:?}", ct);
                    }
                }
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 3: Error - file_id inválido (no es UUID)

#[tokio::test]
async fn test_03_download_error_invalid_uuid() {
    print_header("TEST 03: Download con file_id inválido - Debe fallar con 400");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();
    let invalid_ids = vec![
        ("no-es-uuid", "String normal"),
        ("12345", "Solo números"),
        ("abc-def-ghi", "Formato incorrecto"),
        ("550e8400-e29b-41d4-a716", "UUID incompleto"),
        (
            "550e8400-e29b-41d4-a716-446655440000extra",
            "UUID con caracteres extra",
        ),
    ];

    for (invalid_id, description) in invalid_ids {
        print_section(&format!("Probando: {} ({})", invalid_id, description));

        let download_url = format!("{}/download?file_id={}", BASE_URL, invalid_id);
        print_request("GET", &download_url, &[]);

        let response = client.get(&download_url).send().await;

        match response {
            Ok(res) => {
                let status = res.status();
                let body = res.text().await.unwrap_or_default();

                println!("\n📥 RESPONSE: {}", status);

                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!(
                        "   Code: {}",
                        json["error"]["code"].as_str().unwrap_or("N/A")
                    );
                    println!("   Message: {}", json["message"].as_str().unwrap_or("N/A"));
                }

                if status.as_u16() == 400 {
                    println!("   [ok] Correcto - Rechazado con 400");
                } else {
                    println!("   [warn]  Se esperaba 400, se recibió {}", status);
                }
            }
            Err(e) => println!("   [err] ERROR: {}", e),
        }
    }
}

// TEST 4: Error - file_id no existe

#[tokio::test]
async fn test_04_download_error_file_not_found() {
    print_header("TEST 04: Download de archivo inexistente - Debe fallar con 404");

    if !check_service().await {
        println!("⚠️  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // UUID válido pero que no existe
    let non_existent_id = "00000000-0000-0000-0000-000000000000";

    let download_url = format!("{}/download?file_id={}", BASE_URL, non_existent_id);
    print_request(
        "GET",
        &download_url,
        &[
            ("file_id", non_existent_id),
            ("nota", "UUID válido pero no existe"),
        ],
    );

    let response = client.get(&download_url).send().await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n📥 RESPONSE: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&json).unwrap_or_default()
                );
            }

            println!("\n🎯 VERIFICACIÓN:");
            if status.as_u16() == 404 || status.as_u16() == 502 {
                println!("   [ok] Correcto - El servidor reportó que el archivo no existe");
                println!("    Status: {}", status);
            } else {
                println!("   [warn]  Se esperaba 404 o 502, se recibió {}", status);
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 5: Error - Falta parámetro file_id

#[tokio::test]
async fn test_05_download_error_missing_file_id() {
    print_header("TEST 05: Download sin file_id - Debe fallar");

    if !check_service().await {
        println!("⚠️  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // Sin parámetro file_id
    let download_url = format!("{}/download", BASE_URL);
    print_request("GET", &download_url, &[("file_id", "[err] FALTA")]);

    let response = client.get(&download_url).send().await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("\n-- RESPONSE: {}", status);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&json).unwrap_or_default()
                );
            }

            println!("\n-- VERIFICACIÓN:");
            if status.as_u16() == 400 || status.as_u16() == 422 {
                println!("   [ok] Correcto - El servidor rechazó la petición sin file_id");
            } else {
                println!("   [warn]  Se esperaba 400/422, se recibió {}", status);
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 6: Download múltiples archivos

#[tokio::test]
async fn test_06_download_multiple_files() {
    print_header("TEST 06: Subir y descargar múltiples archivos");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    let test_files = vec![
        (
            "archivo1.txt",
            "text/plain",
            b"Contenido del archivo 1".to_vec(),
        ),
        (
            "archivo2.txt",
            "text/plain",
            b"Contenido del archivo 2 - diferente".to_vec(),
        ),
        (
            "archivo3.json",
            "application/json",
            b"{\"test\": true, \"numero\": 123}".to_vec(),
        ),
    ];

    let mut uploaded_files: Vec<(String, String, Vec<u8>)> = Vec::new();

    // Subir todos los archivos
    print_section("Subiendo archivos");
    for (filename, content_type, content) in &test_files {
        let file_id = upload_test_file(&client, content, filename, content_type).await;

        if let Some(id) = file_id {
            println!("   [ok] {} -> ID: {}", filename, id);
            uploaded_files.push((id, filename.to_string(), content.clone()));
        } else {
            println!("   [err] {} -> Error al subir", filename);
        }
    }

    // Descargar y verificar cada archivo
    print_section("Descargando y verificando");
    for (file_id, filename, original_content) in &uploaded_files {
        let download_url = format!("{}/download?file_id={}", BASE_URL, file_id);

        match client.get(&download_url).send().await {
            Ok(res) => {
                if res.status().is_success() {
                    let downloaded = res.bytes().await.unwrap_or_default();

                    if downloaded.as_ref() == original_content.as_slice() {
                        println!("   [ok] {} - Contenido verificado OK", filename);
                    } else {
                        println!("   [err] {} - Contenido NO coincide!", filename);
                        println!(
                            "      Original: {} bytes, Descargado: {} bytes",
                            original_content.len(),
                            downloaded.len()
                        );
                    }
                } else {
                    println!("   [err] {} - Error {}", filename, res.status());
                }
            }
            Err(e) => println!("   [err] {} - Error: {}", filename, e),
        }
    }

    println!("\n-- RESUMEN:");
    println!("   Archivos subidos: {}", uploaded_files.len());
    println!("   Archivos esperados: {}", test_files.len());
}

// TEST 7: Medir tiempo de respuesta

#[tokio::test]
async fn test_07_download_performance() {
    print_header("TEST 07: Medir rendimiento de download");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // Subir archivo de prueba
    let content: Vec<u8> = (0..50000).map(|i| (i % 256) as u8).collect();

    print_section("Preparación");
    println!("    Subiendo archivo de {} bytes...", content.len());

    let file_id = upload_test_file(
        &client,
        &content,
        "performance-test.bin",
        "application/octet-stream",
    )
    .await;

    let file_id = match file_id {
        Some(id) => {
            println!("   [ok] Archivo subido - ID: {}", id);
            id
        }
        None => {
            println!("   [err] Error al subir");
            return;
        }
    };

    print_section("Medición de descargas");

    let download_url = format!("{}/download?file_id={}", BASE_URL, file_id);
    let mut times: Vec<Duration> = Vec::new();

    for i in 1..=5 {
        let start = std::time::Instant::now();

        let result = client.get(&download_url).send().await;

        match result {
            Ok(res) => {
                if res.status().is_success() {
                    let _ = res.bytes().await;
                    let elapsed = start.elapsed();
                    times.push(elapsed);
                    println!("   Descarga {}: {:?}", i, elapsed);
                }
            }
            Err(e) => println!("   Descarga {}: ERROR - {}", i, e),
        }
    }

    if !times.is_empty() {
        let total: Duration = times.iter().sum();
        let avg = total / times.len() as u32;
        let min = times.iter().min().unwrap();
        let max = times.iter().max().unwrap();

        println!("\n-- ESTADÍSTICAS:");
        println!("   Mínimo: {:?}", min);
        println!("   Máximo: {:?}", max);
        println!("   Promedio: {:?}", avg);
        println!("   Tamaño archivo: {} bytes", content.len());
    }
}
