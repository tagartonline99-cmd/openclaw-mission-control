use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::thread::sleep;
use std::time::{Duration, Instant};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenClawBridgeResult {
    ok: bool,
    command: Vec<String>,
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
    timed_out: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentTurnRequest {
    message: String,
    timeout_seconds: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UrlResearchRequest {
    purpose: String,
    urls: Vec<String>,
    extraction_goal: String,
    risk_notes: String,
    success_criteria: String,
    timeout_seconds: Option<u64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChannelMessageRequest {
    channel: String,
    target: String,
    message: String,
    dry_run: bool,
    timeout_seconds: Option<u64>,
}

fn openclaw_program() -> &'static str {
    if cfg!(windows) {
        "openclaw.cmd"
    } else {
        "openclaw"
    }
}

fn clamp_timeout(value: Option<u64>, default_seconds: u64, max_seconds: u64) -> u64 {
    value.unwrap_or(default_seconds).clamp(5, max_seconds)
}

fn reject_control_chars(value: &str, label: &str) -> Result<(), String> {
    if value.chars().any(|ch| ch.is_control() && ch != '\n' && ch != '\t') {
        return Err(format!("{label} contains unsupported control characters"));
    }
    Ok(())
}

fn reject_blocked_intent(value: &str) -> Result<(), String> {
    let lower = value.to_lowercase();
    let blocked = [
        "--deliver",
        "broadcast",
        "bulk send",
        "spam",
        "mass outreach",
        "fake review",
        "guaranteed income",
        "misleading claim",
        "illegal",
        "purchase",
        "payment",
        "captcha",
        "bypass terms",
        "paywall bypass",
        "robots bypass",
        "submit form",
        "log in",
        "login",
        "credential",
        "publish externally",
        "scrape everything",
        "scrape all",
        "unrestricted scraping",
    ];

    if let Some(term) = blocked.iter().find(|term| lower.contains(**term)) {
        return Err(format!("Blocked unsafe intent detected: {term}"));
    }

    Ok(())
}

fn validate_agent_message(message: &str) -> Result<(), String> {
    let trimmed = message.trim();
    if trimmed.is_empty() {
        return Err("Message is required".into());
    }
    if trimmed.len() > 8_000 {
        return Err("Message is too long for a guarded local agent turn".into());
    }
    reject_control_chars(trimmed, "Message")?;
    reject_blocked_intent(trimmed)
}

fn cli_text(value: &str) -> String {
    value
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" | ")
}

fn url_host(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    let without_scheme = trimmed
        .strip_prefix("https://")
        .or_else(|| trimmed.strip_prefix("http://"))
        .ok_or_else(|| format!("Approved URL must start with http:// or https://: {trimmed}"))?;
    let authority = without_scheme
        .split(['/', '?', '#'])
        .next()
        .unwrap_or_default()
        .trim();
    if authority.is_empty() {
        return Err(format!("Approved URL is missing a host: {trimmed}"));
    }
    if authority.contains('@') {
        return Err(format!("Approved URL cannot contain embedded credentials: {trimmed}"));
    }

    let host = if authority.starts_with('[') {
        authority
            .split(']')
            .next()
            .unwrap_or_default()
            .trim_start_matches('[')
            .to_string()
    } else {
        authority.split(':').next().unwrap_or_default().to_string()
    };
    let host = host.trim().trim_end_matches('.').to_lowercase();
    if host.is_empty() {
        return Err(format!("Approved URL is missing a host: {trimmed}"));
    }
    Ok(host)
}

fn host_is_private_or_local(host: &str) -> bool {
    if host == "localhost" || host == "::1" || host == "0.0.0.0" || host.ends_with(".local") {
        return true;
    }
    let octets = host
        .split('.')
        .map(str::parse::<u8>)
        .collect::<Result<Vec<_>, _>>();
    let Ok(octets) = octets else {
        return false;
    };
    if octets.len() != 4 {
        return false;
    }
    let first = octets[0];
    let second = octets[1];
    first == 10
        || first == 127
        || (first == 172 && (16..=31).contains(&second))
        || (first == 192 && second == 168)
        || (first == 169 && second == 254)
}

fn validate_url(value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if !(trimmed.starts_with("https://") || trimmed.starts_with("http://")) {
        return Err(format!("Approved URL must start with http:// or https://: {trimmed}"));
    }
    if trimmed.len() > 600 {
        return Err("Approved URL is too long for a guarded research action".into());
    }
    if trimmed.contains('*') {
        return Err(format!("Approved URL cannot contain wildcards: {trimmed}"));
    }
    let host = url_host(trimmed)?;
    if host_is_private_or_local(&host) {
        return Err(format!("Approved URL cannot target a local or private host: {host}"));
    }
    reject_control_chars(trimmed, "Approved URL")
}

fn validate_channel(value: &str) -> Result<(), String> {
    let allowed = [
        "telegram",
        "whatsapp",
        "discord",
        "slack",
        "signal",
        "imessage",
        "mattermost",
        "matrix",
        "msteams",
        "googlechat",
        "line",
        "zalo",
        "qa-channel",
    ];
    if allowed.contains(&value) {
        Ok(())
    } else {
        Err(format!("Channel is not allowlisted for Phase 5: {value}"))
    }
}

fn validate_channel_target(value: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("Channel target is required".into());
    }
    if trimmed.len() > 200 {
        return Err("Channel target is too long for a Phase 5 approved send".into());
    }
    reject_control_chars(trimmed, "Target")?;
    let lower = trimmed.to_lowercase();
    if trimmed.contains([',', ';', '*']) || lower == "all" || lower.contains("broadcast") || lower.contains("@everyone") {
        return Err("Channel target must be one explicit recipient/channel; broadcast and batch targets are blocked".into());
    }
    Ok(())
}

fn run_openclaw(args: Vec<String>, timeout_seconds: u64) -> Result<OpenClawBridgeResult, String> {
    let timeout = Duration::from_secs(timeout_seconds);
    let mut command = Command::new(openclaw_program());
    command.args(&args).stdout(Stdio::piped()).stderr(Stdio::piped());

    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start OpenClaw CLI: {error}"))?;
    let started = Instant::now();

    loop {
        if started.elapsed() > timeout {
            let _ = child.kill();
            let output = child
                .wait_with_output()
                .map_err(|error| format!("Failed to collect timed out OpenClaw output: {error}"))?;
            return Ok(OpenClawBridgeResult {
                ok: false,
                command: std::iter::once(openclaw_program().to_string()).chain(args).collect(),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                exit_code: output.status.code(),
                timed_out: true,
            });
        }

        if child
            .try_wait()
            .map_err(|error| format!("Failed while waiting for OpenClaw CLI: {error}"))?
            .is_some()
        {
            let output = child
                .wait_with_output()
                .map_err(|error| format!("Failed to collect OpenClaw output: {error}"))?;
            return Ok(OpenClawBridgeResult {
                ok: output.status.success(),
                command: std::iter::once(openclaw_program().to_string()).chain(args).collect(),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                exit_code: output.status.code(),
                timed_out: false,
            });
        }

        sleep(Duration::from_millis(150));
    }
}

#[tauri::command]
fn openclaw_gateway_status() -> Result<OpenClawBridgeResult, String> {
    run_openclaw(vec!["gateway".into(), "status".into(), "--json".into()], 45)
}

#[tauri::command]
fn openclaw_agents_list() -> Result<OpenClawBridgeResult, String> {
    run_openclaw(vec!["agents".into(), "list".into(), "--json".into()], 60)
}

#[tauri::command]
fn openclaw_tasks_list() -> Result<OpenClawBridgeResult, String> {
    run_openclaw(vec!["tasks".into(), "list".into(), "--json".into()], 45)
}

#[tauri::command]
fn openclaw_gateway_start() -> Result<OpenClawBridgeResult, String> {
    run_openclaw(vec!["gateway".into(), "start".into()], 60)
}

#[tauri::command]
fn openclaw_agent_turn(request: AgentTurnRequest) -> Result<OpenClawBridgeResult, String> {
    validate_agent_message(&request.message)?;
    let guarded_message = cli_text(&format!(
        "OpenClaw Mission Control approved local TeamLeader1A turn.\n\
         Rules: local planning and research only; do not spend money; do not publish externally; \
         do not deliver messages to external channels; do not run browser automation; do not scrape; \
         do not request credentials; summarize findings and next safe approval-gated step.\n\n\
         User request:\n{}",
        request.message.trim()
    ));

    run_openclaw(
        vec![
            "agent".into(),
            "--agent".into(),
            "main".into(),
            "--message".into(),
            guarded_message,
            "--json".into(),
            "--timeout".into(),
            clamp_timeout(request.timeout_seconds, 300, 900).to_string(),
        ],
        clamp_timeout(request.timeout_seconds, 300, 900) + 15,
    )
}

#[tauri::command]
fn openclaw_url_research(request: UrlResearchRequest) -> Result<OpenClawBridgeResult, String> {
    if request.urls.is_empty() || request.urls.len() > 8 {
        return Err("Approved URL research requires 1-8 explicit URLs".into());
    }
    for url in &request.urls {
        validate_url(url)?;
    }
    reject_control_chars(&request.purpose, "Purpose")?;
    reject_control_chars(&request.extraction_goal, "Extraction goal")?;
    reject_control_chars(&request.risk_notes, "Risk notes")?;
    reject_control_chars(&request.success_criteria, "Success criteria")?;
    reject_blocked_intent(&request.purpose)?;
    reject_blocked_intent(&request.extraction_goal)?;

    let guarded_message = cli_text(&format!(
        "OpenClaw Mission Control approved URL research task.\n\
         Rules: use only the approved URLs listed below; do not log in; do not submit forms; \
         do not purchase; do not bypass paywalls, CAPTCHA, robots, or website terms; do not collect PII; \
         do not publish externally; if browser/scraping capability is unavailable, say so and fail safely.\n\n\
         Purpose: {}\n\
         Extraction goal: {}\n\
         Risk notes: {}\n\
         Success criteria: {}\n\
         Approved URLs:\n{}",
        request.purpose.trim(),
        request.extraction_goal.trim(),
        request.risk_notes.trim(),
        request.success_criteria.trim(),
        request.urls.iter().map(|url| format!("- {}", url.trim())).collect::<Vec<_>>().join("\n")
    ));

    run_openclaw(
        vec![
            "agent".into(),
            "--agent".into(),
            "main".into(),
            "--message".into(),
            guarded_message,
            "--json".into(),
            "--timeout".into(),
            clamp_timeout(request.timeout_seconds, 300, 900).to_string(),
        ],
        clamp_timeout(request.timeout_seconds, 300, 900) + 15,
    )
}

#[tauri::command]
fn openclaw_channel_send(request: ChannelMessageRequest) -> Result<OpenClawBridgeResult, String> {
    let channel = request.channel.trim().to_lowercase();
    validate_channel(&channel)?;
    validate_channel_target(&request.target)?;
    reject_control_chars(&request.message, "Message")?;
    reject_blocked_intent(&request.message)?;

    if request.message.trim().is_empty() {
        return Err("Message text is required".into());
    }
    if request.message.len() > 2_000 {
        return Err("Channel message is too long for a Phase 5 approved send".into());
    }

    let mut args = vec![
        "message".into(),
        "send".into(),
        "--channel".into(),
        channel,
        "--target".into(),
        request.target.trim().into(),
        "--message".into(),
        request.message.trim().into(),
        "--json".into(),
    ];
    if request.dry_run {
        args.push("--dry-run".into());
    }

    run_openclaw(args, clamp_timeout(request.timeout_seconds, 45, 120))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            openclaw_gateway_status,
            openclaw_agents_list,
            openclaw_tasks_list,
            openclaw_gateway_start,
            openclaw_agent_turn,
            openclaw_url_research,
            openclaw_channel_send
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenClaw Mission Control");
}
