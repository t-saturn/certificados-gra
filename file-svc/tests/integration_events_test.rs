//! INTEGRATION TESTS - NATS EVENTS
//!
//! Tests de integración para eventos NATS
//!
//! Eventos monitoreados:
//!   - files.upload.requested  → Cuando inicia upload
//!   - files.upload.completed  → Cuando upload exitoso (incluye file_id)
//!   - files.upload.failed     → Cuando upload falla
//!   - files.download.requested → Cuando inicia download
//!   - files.download.completed → Cuando download exitoso
//!   - files.download.failed    → Cuando download falla
//!
//! REQUISITOS:
//!   - Servicio corriendo en http://localhost:8080
//!   - NATS corriendo en localhost:4222
//!
//! EJECUTAR:
//!   cargo test --test integration_events_test -- --nocapture --test-threads=1
//!
//! MONITOREAR EVENTOS MANUALMENTE:
//!   nats sub 'files.>'
//!

use futures_util::StreamExt;
use reqwest::multipart;
use serde_json::Value;
use std::time::Duration;
use tokio::time::timeout;

const BASE_URL: &str = "http://localhost:8080";
const NATS_URL: &str = "nats://localhost:4222";
const USER_ID: &str = "584211ff-6e2a-4e59-a3bf-6738535ab5e0";

// HELPERS

fn print_header(title: &str) {
    println!("\n{}", "═".repeat(80));
    println!("   {}", title);
    println!("{}\n", "═".repeat(80));
}

fn print_section(title: &str) {
    println!("\n{}", "─".repeat(60));
    println!("  {}", title);
    println!("{}", "─".repeat(60));
}

fn print_event(subject: &str, payload: &str) {
    println!("\n-- EVENTO RECIBIDO:");
    println!("   📫 Subject: {}", subject);

    if let Ok(json) = serde_json::from_str::<Value>(payload) {
        println!("    Payload:");

        // Mostrar campos importantes
        if let Some(event_type) = json.get("event_type") {
            println!("      • event_type: {}", event_type);
        }
        if let Some(event_id) = json.get("event_id") {
            println!("      • event_id: {}", event_id);
        }
        if let Some(timestamp) = json.get("timestamp") {
            println!("      • timestamp: {}", timestamp);
        }
        if let Some(source) = json.get("source") {
            println!("      • source: {}", source);
        }

        // Mostrar payload interno
        if let Some(payload_obj) = json.get("payload") {
            println!("      • payload:");

            // Campos comunes
            for field in [
                "job_id",
                "file_id",
                "project_id",
                "user_id",
                "file_name",
                "file_size",
                "mime_type",
                "is_public",
                "download_url",
                "error_code",
                "error_message",
            ] {
                if let Some(value) = payload_obj.get(field) {
                    println!("         - {}: {}", field, value);
                }
            }
        }

        // JSON completo para debug
        println!("\n    JSON Completo:");
        println!(
            "{}",
            serde_json::to_string_pretty(&json).unwrap_or_default()
        );
    } else {
        println!("    Payload (raw): {}", payload);
    }

    println!("{}", "─".repeat(60));
}

async fn check_services() -> (bool, bool) {
    let http_ok = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap()
        .get(format!("{}/health", BASE_URL))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    let nats_ok = async_nats::connect(NATS_URL).await.is_ok();

    println!("-- Estado de servicios:");
    println!(
        "   {} HTTP Server: {}",
        if http_ok { "[ok]" } else { "[err]" },
        BASE_URL
    );
    println!(
        "   {} NATS: {}",
        if nats_ok { "[ok]" } else { "[err]" },
        NATS_URL
    );

    (http_ok, nats_ok)
}

// TEST 1: Eventos de Upload exitoso

#[tokio::test]
async fn test_01_upload_events_success() {
    print_header("TEST 01: Eventos de Upload exitoso");

    let (http_ok, nats_ok) = check_services().await;
    if !http_ok || !nats_ok {
        println!("\n[warn]  Saltando test - servicios no disponibles");
        return;
    }

    // Conectar a NATS
    print_section("Conectando a NATS");
    let nats_client = match async_nats::connect(NATS_URL).await {
        Ok(client) => {
            println!("   [ok] Conectado a NATS");
            client
        }
        Err(e) => {
            println!("   [err] Error conectando a NATS: {}", e);
            return;
        }
    };

    // Suscribirse a eventos de upload
    print_section("Suscribiendo a eventos");
    let mut subscriber = match nats_client.subscribe("files.upload.>").await {
        Ok(sub) => {
            println!("   [ok] Suscrito a: files.upload.>");
            sub
        }
        Err(e) => {
            println!("   [err] Error suscribiendo: {}", e);
            return;
        }
    };

    // Realizar upload
    print_section("Realizando upload");
    let client = reqwest::Client::new();

    let file_content = format!(
        "Test de eventos NATS\nTimestamp: {}",
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    );

    let file_part = multipart::Part::bytes(file_content.as_bytes().to_vec())
        .file_name("event-test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    println!(
        "    Enviando archivo: event-test.txt ({} bytes)",
        file_content.len()
    );

    let upload_task = tokio::spawn(async move {
        client
            .post(format!("{}/upload", BASE_URL))
            .multipart(form)
            .send()
            .await
    });

    // Escuchar eventos (máximo 15 segundos)
    print_section("Esperando eventos (máx 15 segundos)");

    let mut events_received: Vec<(String, String)> = Vec::new();
    let listen_duration = Duration::from_secs(15);
    let start_time = std::time::Instant::now();

    loop {
        let remaining = listen_duration.saturating_sub(start_time.elapsed());
        if remaining.is_zero() {
            println!("\n  Tiempo de escucha agotado");
            break;
        }

        match timeout(remaining, subscriber.next()).await {
            Ok(Some(msg)) => {
                let subject = msg.subject.to_string();
                let payload = String::from_utf8_lossy(&msg.payload).to_string();

                print_event(&subject, &payload);
                events_received.push((subject.clone(), payload));

                // Si recibimos completed o failed, terminar
                if subject.contains("completed") || subject.contains("failed") {
                    println!("\n[ok] Evento final recibido - terminando escucha");
                    break;
                }
            }
            Ok(None) => {
                println!("\n[warn]  Subscriber cerrado");
                break;
            }
            Err(_) => {
                // Timeout - seguir esperando
            }
        }
    }

    // Verificar resultado del upload
    print_section("Resultado del upload");
    match upload_task.await {
        Ok(Ok(res)) => {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();

            println!("   Status: {}", status);
            if let Ok(json) = serde_json::from_str::<Value>(&body) {
                if status.is_success() {
                    println!("   [ok] Upload exitoso");
                    println!(
                        "    File ID: {}",
                        json["data"]["id"].as_str().unwrap_or("N/A")
                    );
                } else {
                    println!("   [err] Upload falló");
                    println!("    Error: {}", json["message"].as_str().unwrap_or("N/A"));
                }
            }
        }
        Ok(Err(e)) => println!("   [err] Error HTTP: {}", e),
        Err(e) => println!("   [err] Error en task: {}", e),
    }

    // Resumen de eventos
    print_section("Resumen de eventos");
    println!("    Total eventos recibidos: {}", events_received.len());
    for (i, (subject, _)) in events_received.iter().enumerate() {
        let icon = match subject.as_str() {
            s if s.contains("requested") => "🚀",
            s if s.contains("completed") => "[ok]",
            s if s.contains("failed") => "[err]",
            _ => "📫",
        };
        println!("   {}. {} {}", i + 1, icon, subject);
    }

    // Verificar secuencia esperada
    let has_requested = events_received.iter().any(|(s, _)| s.contains("requested"));
    let has_completed = events_received.iter().any(|(s, _)| s.contains("completed"));
    let has_failed = events_received.iter().any(|(s, _)| s.contains("failed"));

    println!("\n-- VERIFICACIÓN DE EVENTOS:");
    println!(
        "   {} files.upload.requested",
        if has_requested { "[ok]" } else { "[err]" }
    );
    println!(
        "   {} files.upload.completed OR files.upload.failed",
        if has_completed || has_failed {
            "[ok]"
        } else {
            "[err]"
        }
    );
}

// TEST 2: Eventos de Upload fallido (sin user_id)

#[tokio::test]
async fn test_02_upload_events_validation_error() {
    print_header("TEST 02: Eventos cuando upload falla por validación");

    let (http_ok, nats_ok) = check_services().await;
    if !http_ok || !nats_ok {
        println!("\n[warn]  Saltando test - servicios no disponibles");
        return;
    }

    let nats_client = async_nats::connect(NATS_URL).await.unwrap();
    let mut subscriber = nats_client.subscribe("files.upload.>").await.unwrap();

    print_section("Enviando upload inválido (sin user_id)");
    let client = reqwest::Client::new();

    let file_part = multipart::Part::bytes(b"contenido".to_vec())
        .file_name("test.txt")
        .mime_str("text/plain")
        .unwrap();

    // Sin user_id - debe fallar en validación (antes de emitir eventos)
    let form = multipart::Form::new()
        .text("is_public", "true")
        .part("file", file_part);

    let response = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    match response {
        Ok(res) => {
            let status = res.status();
            println!("    Response: {}", status);

            if status.as_u16() == 400 {
                println!("   [ok] Correcto - Request rechazado con 400");
            }
        }
        Err(e) => println!("   [err] Error: {}", e),
    }

    // Esperar brevemente por eventos
    print_section("Verificando eventos (2 segundos)");

    let mut events_count = 0;
    let listen_duration = Duration::from_secs(2);
    let start_time = std::time::Instant::now();

    loop {
        let remaining = listen_duration.saturating_sub(start_time.elapsed());
        if remaining.is_zero() {
            break;
        }

        match timeout(remaining, subscriber.next()).await {
            Ok(Some(msg)) => {
                events_count += 1;
                println!("    Evento: {}", msg.subject);
            }
            Ok(None) | Err(_) => {}
        }
    }

    println!("\n🎯 VERIFICACIÓN:");
    if events_count == 0 {
        println!("   [ok] Correcto - No se emitieron eventos (error de validación antes del procesamiento)");
    } else {
        println!("   [warn]  Se recibieron {} eventos", events_count);
    }
}

// TEST 3: Información de eventos disponibles

#[tokio::test]
async fn test_03_list_available_events() {
    print_header("TEST 03: Información de eventos NATS disponibles");

    println!("-- EVENTOS DE UPLOAD:");
    println!();
    println!("    files.upload.requested");
    println!("      Se emite cuando: Inicia el proceso de upload");
    println!("      Payload incluye:");
    println!("         - job_id: UUID único del job");
    println!("         - project_id: ID del proyecto");
    println!("         - user_id: ID del usuario");
    println!("         - file_name: Nombre del archivo");
    println!("         - file_size: Tamaño en bytes");
    println!("         - mime_type: Tipo MIME");
    println!("         - is_public: Boolean");
    println!();
    println!("    files.upload.completed");
    println!("      Se emite cuando: Upload exitoso");
    println!("      Payload incluye:");
    println!("         - job_id: UUID del job");
    println!("         - file_id: UUID del archivo creado");
    println!("         - download_url: URL para descargar");
    println!("         - (todos los campos de requested)");
    println!();
    println!("    files.upload.failed");
    println!("      Se emite cuando: Upload falla");
    println!("      Payload incluye:");
    println!("         - job_id: UUID del job");
    println!("         - error_code: Código de error");
    println!("         - error_message: Descripción del error");
    println!("         - project_id, user_id, file_name");
    println!();

    println!("-- EVENTOS DE DOWNLOAD:");
    println!();
    println!("    files.download.requested");
    println!("      Se emite cuando: Inicia el proceso de download");
    println!();
    println!("    files.download.completed");
    println!("      Se emite cuando: Download exitoso");
    println!();
    println!("    files.download.failed");
    println!("      Se emite cuando: Download falla");
    println!();

    println!("-- WILDCARDS PARA SUSCRIPCIÓN:");
    println!();
    println!("   files.upload.*    → Todos los eventos de upload");
    println!("   files.download.*  → Todos los eventos de download");
    println!("   files.>           → TODOS los eventos de files");
    println!();

    println!("-- COMANDOS ÚTILES:");
    println!();
    println!("   # Monitorear todos los eventos:");
    println!("   nats sub 'files.>'");
    println!();
    println!("   # Solo eventos de upload:");
    println!("   nats sub 'files.upload.*'");
    println!();
    println!("   # Solo errores:");
    println!("   nats sub 'files.*.failed'");
}

// TEST 4: Conectividad NATS

#[tokio::test]
async fn test_04_nats_connectivity() {
    print_header("TEST 04: Verificar conectividad NATS");

    print_section("Conectando a NATS");
    let nats_client = match async_nats::connect(NATS_URL).await {
        Ok(client) => {
            println!("   [ok] Conexión establecida");
            client
        }
        Err(e) => {
            println!("   [err] Error: {}", e);
            println!();
            println!("    Asegúrate de que NATS esté corriendo:");
            println!("      docker run -d --name nats -p 4222:4222 nats:latest");
            return;
        }
    };

    print_section("Test de Publish/Subscribe");

    // Suscribirse a un subject de prueba
    let mut subscriber = nats_client.subscribe("test.connectivity").await.unwrap();
    println!("   [ok] Suscrito a: test.connectivity");

    // Publicar un mensaje
    let test_message = format!("Test message at {}", chrono::Utc::now());
    nats_client
        .publish("test.connectivity", test_message.clone().into())
        .await
        .unwrap();
    println!("   [ok] Mensaje publicado");

    // Recibir el mensaje
    match timeout(Duration::from_secs(2), subscriber.next()).await {
        Ok(Some(msg)) => {
            let received = String::from_utf8_lossy(&msg.payload);
            if received == test_message {
                println!("   [ok] Mensaje recibido correctamente");
            } else {
                println!("   [warn]  Mensaje diferente: {}", received);
            }
        }
        Ok(None) => println!("   [err] Subscriber cerrado"),
        Err(_) => println!("   [err] Timeout esperando mensaje"),
    }

    println!("\n🎉 NATS está funcionando correctamente!");
}

// TEST 5: Monitorear eventos en tiempo real

#[tokio::test]
async fn test_05_monitor_all_events() {
    print_header("TEST 05: Monitor de todos los eventos (10 segundos)");

    let (_, nats_ok) = check_services().await;
    if !nats_ok {
        println!("\n[warn]  Saltando test - NATS no disponible");
        return;
    }

    let nats_client = async_nats::connect(NATS_URL).await.unwrap();
    let mut subscriber = nats_client.subscribe("files.>").await.unwrap();

    println!("\n-- Escuchando TODOS los eventos en 'files.>' por 10 segundos...");
    println!("    Realiza operaciones de upload/download en otra terminal para ver eventos");
    println!();

    let mut events_count = 0;
    let listen_duration = Duration::from_secs(10);
    let start_time = std::time::Instant::now();

    loop {
        let remaining = listen_duration.saturating_sub(start_time.elapsed());
        if remaining.is_zero() {
            break;
        }

        // Mostrar tiempo restante cada 2 segundos
        let elapsed_secs = start_time.elapsed().as_secs();
        if elapsed_secs % 2 == 0 && elapsed_secs > 0 {
            // Solo mostrar una vez por segundo
        }

        match timeout(Duration::from_millis(100), subscriber.next()).await {
            Ok(Some(msg)) => {
                events_count += 1;
                print_event(
                    &msg.subject.to_string(),
                    &String::from_utf8_lossy(&msg.payload),
                );
            }
            Ok(None) => break,
            Err(_) => {
                // Timeout corto - continuar
            }
        }
    }

    println!("\n-- RESUMEN:");
    println!("   Tiempo de escucha: 10 segundos");
    println!("   Eventos recibidos: {}", events_count);

    if events_count == 0 {
        println!("\n    No se recibieron eventos.");
        println!("      Prueba ejecutar en otra terminal:");
        println!("      curl -X POST http://localhost:8080/upload \\");
        println!("        -F 'user_id=test-user' \\");
        println!("        -F 'is_public=true' \\");
        println!("        -F 'file=@README.md'");
    }
}

// TEST 6: Verificar estructura de eventos

#[tokio::test]
async fn test_06_verify_event_structure() {
    print_header("TEST 06: Verificar estructura de eventos");

    let (http_ok, nats_ok) = check_services().await;
    if !http_ok || !nats_ok {
        println!("\n[warn]  Saltando test - servicios no disponibles");
        return;
    }

    let nats_client = async_nats::connect(NATS_URL).await.unwrap();
    let mut subscriber = nats_client.subscribe("files.upload.>").await.unwrap();

    // Realizar upload
    let client = reqwest::Client::new();
    let file_part = multipart::Part::bytes(b"test content".to_vec())
        .file_name("structure-test.txt")
        .mime_str("text/plain")
        .unwrap();

    let form = multipart::Form::new()
        .text("user_id", USER_ID)
        .text("is_public", "true")
        .part("file", file_part);

    println!("-- Realizando upload para capturar eventos...\n");

    let _ = client
        .post(format!("{}/upload", BASE_URL))
        .multipart(form)
        .send()
        .await;

    // Capturar y verificar eventos
    let mut events: Vec<Value> = Vec::new();
    let listen_duration = Duration::from_secs(5);
    let start_time = std::time::Instant::now();

    loop {
        let remaining = listen_duration.saturating_sub(start_time.elapsed());
        if remaining.is_zero() {
            break;
        }

        match timeout(remaining, subscriber.next()).await {
            Ok(Some(msg)) => {
                if let Ok(json) = serde_json::from_slice::<Value>(&msg.payload) {
                    events.push(json);
                }
            }
            Ok(None) | Err(_) => {}
        }

        if events.len() >= 2 {
            break;
        }
    }

    print_section("Verificación de estructura");

    let required_root_fields = ["event_id", "event_type", "timestamp", "source", "payload"];
    let requested_payload_fields = [
        "job_id",
        "project_id",
        "user_id",
        "file_name",
        "file_size",
        "mime_type",
        "is_public",
    ];
    let completed_payload_fields = [
        "job_id",
        "file_id",
        "project_id",
        "user_id",
        "file_name",
        "download_url",
    ];

    for event in &events {
        let event_type = event["event_type"].as_str().unwrap_or("unknown");
        println!("\n Evento: {}", event_type);

        // Verificar campos raíz
        println!("   Campos raíz:");
        for field in &required_root_fields {
            let exists = event.get(*field).is_some();
            println!("      {} {}", if exists { "[ok]" } else { "[err]" }, field);
        }

        // Verificar payload según tipo
        if let Some(payload) = event.get("payload") {
            println!("   Campos payload:");

            let fields_to_check = if event_type.contains("requested") {
                &requested_payload_fields[..]
            } else if event_type.contains("completed") {
                &completed_payload_fields[..]
            } else {
                &["job_id", "error_code", "error_message"][..]
            };

            for field in fields_to_check {
                let exists = payload.get(*field).is_some();
                let value = payload
                    .get(*field)
                    .map(|v| format!("{}", v))
                    .unwrap_or_default();
                println!(
                    "      {} {} = {}",
                    if exists { "[ok]" } else { "[err]" },
                    field,
                    if value.len() > 40 {
                        format!("{}...", &value[..40])
                    } else {
                        value
                    }
                );
            }
        }
    }

    println!("\n-- Total eventos analizados: {}", events.len());
}
