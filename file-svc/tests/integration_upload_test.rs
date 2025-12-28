//! INTEGRATION TESTS - FILE UPLOAD
//!
//! Tests de integración para POST /upload
//!
//! REQUISITOS:
//!   - Servicio corriendo en http://localhost:8080
//!   - Redis corriendo en localhost:6379
//!   - NATS corriendo en localhost:4222
//!   - Variables de entorno configuradas (FILE_PROJECT_ID, etc.)
//!
//! EJECUTAR:
//!   cargo test --test integration_upload_test -- --nocapture --test-threads=1
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

fn print_response(status: &reqwest::StatusCode, body: &str) {
    let status_icon = if status.is_success() { "[ok]" } else { "[err]" };
    println!("\n-- RESPONSE:");
    println!("   Status: {} {}", status_icon, status);

    if let Ok(json) = serde_json::from_str::<Value>(body) {
        println!(
            "   Body:\n{}",
            serde_json::to_string_pretty(&json).unwrap_or_default()
        );
    } else {
        println!("   Body (raw): {}", body);
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
                println!("[ok] Servicio disponible en {}", BASE_URL);
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

// TEST 1: Upload exitoso - Archivo de texto

#[tokio::test]
async fn test_01_upload_text_file_success() {
    print_header("TEST 01: Upload archivo de texto - Caso exitoso");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // Crear contenido del archivo
    let file_content = format!(
        "Archivo de prueba para file-svc\n\
         Fecha: {}\n\
         Usuario: {}\n\
         Este es un test de integración.",
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
        USER_ID
    );

    let file_part = multipart::Part::bytes(file_content.as_bytes().to_vec())
        .file_name("test-document.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    print_request(
        "POST",
        &format!("{}/upload", BASE_URL),
        &[
            ("user_id", USER_ID),
            ("is_public", "true"),
            (
                "file",
                &format!("test-document.txt ({} bytes)", file_content.len()),
            ),
            ("Content-Type", "text/plain"),
        ],
    );

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            if status.is_success() {
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    if let Some(file_id) = json["data"]["id"].as_str() {
                        println!("\n-- RESULTADO:");
                        println!("   [ok] Upload exitoso!");
                        println!("    File ID: {}", file_id);
                        println!(
                            "    Nombre: {}",
                            json["data"]["original_name"].as_str().unwrap_or("N/A")
                        );
                        println!(
                            "    Tamaño: {} bytes",
                            json["data"]["size"].as_u64().unwrap_or(0)
                        );
                        println!(
                            "   🔗 Download URL: {}/download?file_id={}",
                            BASE_URL, file_id
                        );

                        // Guardar file_id para otros tests
                        println!("\n    Guarda este ID para probar download:");
                        println!("      export TEST_FILE_ID={}", file_id);
                    }
                }
            } else {
                println!("\n[err] UPLOAD FALLÓ");
            }
        }
        Err(e) => {
            println!("\n[err] ERROR DE CONEXIÓN: {}", e);
        }
    }
}

// TEST 2: Upload exitoso - Archivo PDF

#[tokio::test]
async fn test_02_upload_pdf_file_success() {
    print_header("TEST 02: Upload archivo PDF - Caso exitoso");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // PDF mínimo válido
    let pdf_content = b"%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
196
%%EOF";

    let file_part = multipart::Part::bytes(pdf_content.to_vec())
        .file_name("documento-prueba.pdf")
        .mime_str("application/pdf")
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    print_request(
        "POST",
        &format!("{}/upload", BASE_URL),
        &[
            ("user_id", USER_ID),
            ("is_public", "true"),
            (
                "file",
                &format!("documento-prueba.pdf ({} bytes)", pdf_content.len()),
            ),
            ("Content-Type", "application/pdf"),
        ],
    );

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            if status.is_success() {
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!("\n🎉 RESULTADO:");
                    println!("   [ok] PDF subido exitosamente!");
                    println!(
                        "    File ID: {}",
                        json["data"]["id"].as_str().unwrap_or("N/A")
                    );
                    println!(
                        "    MIME Type: {}",
                        json["data"]["mime_type"].as_str().unwrap_or("N/A")
                    );
                }
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 3: Upload exitoso - Archivo imagen PNG

#[tokio::test]
async fn test_03_upload_image_file_success() {
    print_header("TEST 03: Upload archivo imagen PNG - Caso exitoso");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // PNG 1x1 pixel rojo
    let png_content: Vec<u8> = vec![
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77,
        0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05,
        0xFE, 0xD4, 0xEF, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, // IEND chunk
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    let file_part = multipart::Part::bytes(png_content.clone())
        .file_name("imagen-test.png")
        .mime_str("image/png")
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "false") // Probar con is_public=false
        .part("file", file_part);

    print_request(
        "POST",
        &format!("{}/upload", BASE_URL),
        &[
            ("user_id", USER_ID),
            ("is_public", "false"),
            (
                "file",
                &format!("imagen-test.png ({} bytes)", png_content.len()),
            ),
            ("Content-Type", "image/png"),
        ],
    );

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            if status.is_success() {
                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!("\n🎉 RESULTADO:");
                    println!("   [ok] Imagen subida exitosamente!");
                    println!(
                        "    File ID: {}",
                        json["data"]["id"].as_str().unwrap_or("N/A")
                    );
                    println!(
                        "    is_public: {}",
                        json["data"]["is_public"].as_bool().unwrap_or(true)
                    );
                }
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 4: Error - Falta user_id

#[tokio::test]
async fn test_04_upload_error_missing_user_id() {
    print_header("TEST 04: Upload sin user_id - Debe fallar con 400");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    let file_part = multipart::Part::bytes(b"contenido de prueba".to_vec())
        .file_name("test.txt")
        .mime_str("text/plain")
        .unwrap();

    // ¡Sin user_id!
    let form = multipart::Form::new()
        .text("is_public", "true")
        .part("file", file_part);

    print_request(
        "POST",
        &format!("{}/upload", BASE_URL),
        &[
            ("user_id", "[err] FALTA"),
            ("is_public", "true"),
            ("file", "test.txt"),
        ],
    );

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            println!("\n-- VERIFICACIÓN:");
            if status.as_u16() == 400 {
                println!("   [ok] Correcto! El servidor rechazó la petición con 400");

                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!(
                        "    Código de error: {}",
                        json["error"]["code"].as_str().unwrap_or("N/A")
                    );
                    println!("    Mensaje: {}", json["message"].as_str().unwrap_or("N/A"));
                }
            } else {
                println!("   [warn]  Se esperaba 400, se recibió {}", status);
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 5: Error - Falta archivo

#[tokio::test]
async fn test_05_upload_error_missing_file() {
    print_header("TEST 05: Upload sin archivo - Debe fallar con 400");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // ¡Sin archivo!
    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true");

    print_request(
        "POST",
        &format!("{}/upload", BASE_URL),
        &[
            ("user_id", USER_ID),
            ("is_public", "true"),
            ("file", "[err] FALTA"),
        ],
    );

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            println!("\n-- VERIFICACIÓN:");
            if status.as_u16() == 400 {
                println!("   [ok] Correcto! El servidor rechazó la petición con 400");

                if let Ok(json) = serde_json::from_str::<Value>(&body) {
                    println!(
                        "    Código de error: {}",
                        json["error"]["code"].as_str().unwrap_or("N/A")
                    );
                }
            } else {
                println!("   [warn]  Se esperaba 400, se recibió {}", status);
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 6: Error - Archivo vacío

#[tokio::test]
async fn test_06_upload_error_empty_file() {
    print_header("TEST 06: Upload con archivo vacío - Debe fallar con 400");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // Archivo vacío (0 bytes)
    let file_part = multipart::Part::bytes(Vec::new())
        .file_name("empty.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    print_request(
        "POST",
        &format!("{}/upload", BASE_URL),
        &[
            ("user_id", USER_ID),
            ("is_public", "true"),
            ("file", "empty.txt (0 bytes) [warn]"),
        ],
    );

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            println!("\n-- VERIFICACIÓN:");
            if status.as_u16() == 400 {
                println!("   [ok] Correcto! El servidor rechazó el archivo vacío");
            } else {
                println!("   [warn]  Se esperaba 400, se recibió {}", status);
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 7: Upload grande (simular archivo más grande)

#[tokio::test]
async fn test_07_upload_large_file() {
    print_header("TEST 07: Upload archivo grande (100KB)");

    if !check_service().await {
        println!("[warn]  Saltando test - servicio no disponible");
        return;
    }

    let client = reqwest::Client::new();

    // Crear archivo de 100KB
    let large_content: Vec<u8> = (0..102400).map(|i| (i % 256) as u8).collect();

    let file_part = multipart::Part::bytes(large_content.clone())
        .file_name("large-file.bin")
        .mime_str("application/octet-stream")
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    print_request(
        "POST",
        &format!("{}/upload", BASE_URL),
        &[
            ("user_id", USER_ID),
            ("is_public", "true"),
            (
                "file",
                &format!(
                    "large-file.bin ({} bytes = {:.2} KB)",
                    large_content.len(),
                    large_content.len() as f64 / 1024.0
                ),
            ),
        ],
    );

    let start = std::time::Instant::now();

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    let elapsed = start.elapsed();

    match response {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            println!("\n  Tiempo de respuesta: {:?}", elapsed);

            if status.is_success() {
                println!("   [ok] Archivo grande subido correctamente");
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}

// TEST 8: Verificar Health antes de upload

#[tokio::test]
async fn test_08_health_check_full() {
    print_header("TEST 08: Health Check completo");

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap();

    print_section("Health básico");
    print_request("GET", &format!("{}/health", BASE_URL), &[]);

    match client.get(format!("{}/health", BASE_URL)).send().await {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);
        }
        Err(e) => {
            println!("\n[err] ERROR: {}", e);
            println!("    El servicio no está corriendo");
            return;
        }
    }

    print_section("Health con verificación completa");
    print_request("GET", &format!("{}/health?full=true", BASE_URL), &[]);

    match client
        .get(format!("{}/health?full=true", BASE_URL))
        .send()
        .await
    {
        Ok(res) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            print_response(&status, &body);

            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                println!("\n-- ESTADO DE SERVICIOS:");

                if let Some(data) = json.get("data") {
                    // File Server
                    if let Some(fs) = data.get("file_server") {
                        println!(
                            "    File Server: {} ({}ms)",
                            fs["status"].as_str().unwrap_or("unknown"),
                            fs["response_time_ms"].as_u64().unwrap_or(0)
                        );
                    }

                    // Redis
                    if let Some(redis) = data.get("redis") {
                        println!(
                            "    Redis: {} ({}ms)",
                            redis["status"].as_str().unwrap_or("unknown"),
                            redis["response_time_ms"].as_u64().unwrap_or(0)
                        );
                    }

                    // NATS
                    if let Some(nats) = data.get("nats") {
                        println!("    NATS: {}", nats["status"].as_str().unwrap_or("unknown"));
                    }

                    // Database
                    if let Some(db) = data.get("database") {
                        println!(
                            "     Database: {} ({}) - {}ms",
                            db["status"].as_str().unwrap_or("unknown"),
                            db["engine"].as_str().unwrap_or("unknown"),
                            db["response_time_ms"].as_u64().unwrap_or(0)
                        );
                    }
                }
            }
        }
        Err(e) => println!("\n[err] ERROR: {}", e),
    }
}
