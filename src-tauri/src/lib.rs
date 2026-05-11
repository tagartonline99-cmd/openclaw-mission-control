use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use std::fs;
use std::path::PathBuf;
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
    agent_profile_id: Option<String>,
    agent_role: Option<String>,
    mission_run_id: Option<String>,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct McpInstallRequest {
    obsidian_vault_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublicResearchFetchRequest {
    url: String,
    source_pack_id: Option<String>,
    timeout_seconds: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PublicResearchFetchResult {
    ok: bool,
    url: String,
    source_pack_id: Option<String>,
    status_code: Option<u16>,
    title: Option<String>,
    excerpt: Option<String>,
    content_type: Option<String>,
    error: Option<String>,
    fetched_at: String,
}

fn openclaw_program() -> &'static str {
    if cfg!(windows) {
        "openclaw.cmd"
    } else {
        "openclaw"
    }
}

fn npm_program() -> &'static str {
    if cfg!(windows) {
        "npm.cmd"
    } else {
        "npm"
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

fn now_rfc3339() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => format!("{}", duration.as_secs()),
        Err(_) => "0".into(),
    }
}

fn strip_html(value: &str) -> String {
    let mut output = String::with_capacity(value.len().min(4_000));
    let mut in_tag = false;
    for ch in value.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                output.push(' ');
            }
            _ if !in_tag => output.push(ch),
            _ => {}
        }
        if output.len() > 8_000 {
            break;
        }
    }
    output
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn extract_title(html: &str) -> Option<String> {
    let lower = html.to_lowercase();
    let start = lower.find("<title")?;
    let open_end = lower[start..].find('>')? + start + 1;
    let end = lower[open_end..].find("</title>")? + open_end;
    let title = strip_html(&html[open_end..end]);
    if title.is_empty() {
        None
    } else {
        Some(title.chars().take(180).collect())
    }
}

fn excerpt_from_body(body: &str) -> String {
    let plain = strip_html(body);
    plain.chars().take(700).collect()
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

fn validate_agent_profile_id(value: Option<&str>) -> Result<String, String> {
    let trimmed = value.unwrap_or("main").trim();
    if trimmed.is_empty() || trimmed.len() > 64 {
        return Err("OpenClaw agent profile id is required and must be short".into());
    }
    if !trimmed.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-') {
        return Err("OpenClaw agent profile id contains unsupported characters".into());
    }
    let lower = trimmed.to_lowercase();
    let allowed = ["main", "researcher", "seo", "writer", "content", "production", "publish", "action"];
    if !allowed.contains(&lower.as_str()) {
        return Err(format!("OpenClaw agent profile is not allowlisted for local mission turns: {trimmed}"));
    }
    Ok(trimmed.to_string())
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

fn run_program(program: &str, args: Vec<String>, timeout_seconds: u64) -> Result<OpenClawBridgeResult, String> {
    let timeout = Duration::from_secs(timeout_seconds);
    let mut command = Command::new(program);
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
                command: std::iter::once(program.to_string()).chain(args).collect(),
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
                command: std::iter::once(program.to_string()).chain(args).collect(),
                stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                exit_code: output.status.code(),
                timed_out: false,
            });
        }

        sleep(Duration::from_millis(150));
    }
}

fn run_openclaw(args: Vec<String>, timeout_seconds: u64) -> Result<OpenClawBridgeResult, String> {
    run_program(openclaw_program(), args, timeout_seconds)
}

fn append_result(label: &str, result: &OpenClawBridgeResult, stdout: &mut String, stderr: &mut String) {
    stdout.push_str(&format!(
        "\n## {label}\ncommand: {}\nok: {}\nexitCode: {:?}\n",
        result.command.join(" "),
        result.ok,
        result.exit_code
    ));
    if !result.stdout.trim().is_empty() {
        stdout.push_str(result.stdout.trim());
        stdout.push('\n');
    }
    if !result.stderr.trim().is_empty() {
        stderr.push_str(&format!("\n## {label}\n{}\n", result.stderr.trim()));
    }
}

fn user_home_dir() -> Result<PathBuf, String> {
    env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "Could not resolve user home directory".to_string())
}

fn safe_existing_directory(path: &str) -> Option<String> {
    reject_control_chars(path, "MCP path").ok()?;
    let path_buf = PathBuf::from(path);
    if !path_buf.is_dir() {
        return None;
    }
    let canonical = fs::canonicalize(path_buf).ok()?;
    let text = canonical.to_string_lossy().to_string();
    let lower = text.to_lowercase();
    if lower.ends_with(":\\") || lower.ends_with("\\windows") || lower.ends_with("\\users") {
        return None;
    }
    Some(text)
}

fn json_arg(value: serde_json::Value) -> String {
    value.to_string()
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
fn openclaw_mcp_list() -> Result<OpenClawBridgeResult, String> {
    run_openclaw(vec!["mcp".into(), "list".into(), "--json".into()], 45)
}

#[tauri::command]
fn openclaw_mcp_install_local_kit(request: McpInstallRequest) -> Result<OpenClawBridgeResult, String> {
    let home = user_home_dir()?;
    let openclaw_dir = home.join(".openclaw");
    let mcp_dir = openclaw_dir.join("mcp-servers");
    let memory_dir = openclaw_dir.join("memory");
    let workspace_dir = openclaw_dir.join("workspace");
    let test_vault_dir = openclaw_dir.join("mission-control-test-vault");

    fs::create_dir_all(&mcp_dir).map_err(|error| format!("Could not create MCP package directory: {error}"))?;
    fs::create_dir_all(&memory_dir).map_err(|error| format!("Could not create MCP memory directory: {error}"))?;
    fs::create_dir_all(&workspace_dir).map_err(|error| format!("Could not create OpenClaw workspace directory: {error}"))?;

    let mut stdout = String::from("OpenClaw Mission Control MCP local kit install/repair\n");
    let mut stderr = String::new();
    let mut ok = true;

    let install = run_program(
        npm_program(),
        vec![
            "install".into(),
            "--prefix".into(),
            mcp_dir.to_string_lossy().to_string(),
            "@modelcontextprotocol/server-filesystem@2026.1.14".into(),
            "@modelcontextprotocol/server-memory@2026.1.26".into(),
            "mcp-fetch-server@1.1.2".into(),
        ],
        300,
    )?;
    append_result("npm install", &install, &mut stdout, &mut stderr);
    ok &= install.ok;

    let filesystem_entry = mcp_dir
        .join("node_modules")
        .join("@modelcontextprotocol")
        .join("server-filesystem")
        .join("dist")
        .join("index.js");
    let memory_entry = mcp_dir
        .join("node_modules")
        .join("@modelcontextprotocol")
        .join("server-memory")
        .join("dist")
        .join("index.js");
    let fetch_entry = mcp_dir
        .join("node_modules")
        .join("mcp-fetch-server")
        .join("dist")
        .join("index.js");

    let mut allowed_paths = vec![workspace_dir.to_string_lossy().to_string()];
    if test_vault_dir.is_dir() {
        allowed_paths.push(test_vault_dir.to_string_lossy().to_string());
    }
    if let Some(vault) = request
        .obsidian_vault_path
        .as_deref()
        .and_then(safe_existing_directory)
    {
        if !allowed_paths.iter().any(|path| path.eq_ignore_ascii_case(&vault)) {
            allowed_paths.push(vault);
        }
    }

    let filesystem_config = json!({
        "command": "node",
        "args": std::iter::once(filesystem_entry.to_string_lossy().to_string()).chain(allowed_paths.clone()).collect::<Vec<_>>()
    });
    let memory_config = json!({
        "command": "node",
        "args": [memory_entry.to_string_lossy().to_string()],
        "env": {
            "MEMORY_FILE_PATH": memory_dir.join("openclaw-mcp-memory.jsonl").to_string_lossy().to_string()
        }
    });
    let fetch_config = json!({
        "command": "node",
        "args": [fetch_entry.to_string_lossy().to_string()],
        "env": {
            "DEFAULT_LIMIT": "12000",
            "OPENCLAW_MISSION_CONTROL_APPROVAL_REQUIRED": "true"
        },
        "disabled": true,
        "note": "approved-url-research-only"
    });

    for (name, config) in [
        ("filesystem", filesystem_config),
        ("memory", memory_config),
        ("fetch_approved_url_research", fetch_config),
    ] {
        let result = run_openclaw(vec!["mcp".into(), "set".into(), name.into(), json_arg(config)], 60)?;
        append_result(&format!("openclaw mcp set {name}"), &result, &mut stdout, &mut stderr);
        ok &= result.ok;
    }

    let list = run_openclaw(vec!["mcp".into(), "list".into(), "--json".into()], 45)?;
    append_result("openclaw mcp list", &list, &mut stdout, &mut stderr);
    ok &= list.ok;

    Ok(OpenClawBridgeResult {
        ok,
        command: vec![
            "openclaw-mission-control".into(),
            "install-free-local-mcp-kit".into(),
        ],
        stdout,
        stderr,
        exit_code: list.exit_code,
        timed_out: install.timed_out || list.timed_out,
    })
}

#[tauri::command]
fn openclaw_gateway_start() -> Result<OpenClawBridgeResult, String> {
    run_openclaw(vec!["gateway".into(), "start".into()], 60)
}

#[tauri::command]
async fn public_research_fetch(request: PublicResearchFetchRequest) -> Result<PublicResearchFetchResult, String> {
    let url = request.url.trim().to_string();
    validate_url(&url)?;
    reject_blocked_intent(&url)?;
    let timeout = Duration::from_secs(clamp_timeout(request.timeout_seconds, 12, 20));
    let client = reqwest::Client::builder()
        .timeout(timeout)
        .user_agent("OpenClaw-Mission-Control/0.1 safe-public-research")
        .redirect(reqwest::redirect::Policy::limited(4))
        .build()
        .map_err(|error| format!("Could not create public research client: {error}"))?;

    let fetched_at = now_rfc3339();
    match client.get(&url).send().await {
        Ok(response) => {
            let status = response.status();
            let content_type = response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(|value| value.to_string());
            if !status.is_success() {
                return Ok(PublicResearchFetchResult {
                    ok: false,
                    url,
                    source_pack_id: request.source_pack_id,
                    status_code: Some(status.as_u16()),
                    title: None,
                    excerpt: None,
                    content_type,
                    error: Some(format!("Public source returned HTTP {}", status.as_u16())),
                    fetched_at,
                });
            }
            let body = response
                .text()
                .await
                .map_err(|error| format!("Could not read public research response: {error}"))?;
            let lower = body.to_lowercase();
            if lower.contains("captcha") || lower.contains("sign in to continue") || lower.contains("log in to continue") {
                return Ok(PublicResearchFetchResult {
                    ok: false,
                    url,
                    source_pack_id: request.source_pack_id,
                    status_code: Some(status.as_u16()),
                    title: extract_title(&body),
                    excerpt: None,
                    content_type,
                    error: Some("Source requires interactive login/CAPTCHA or similar blocked access.".into()),
                    fetched_at,
                });
            }
            Ok(PublicResearchFetchResult {
                ok: true,
                url,
                source_pack_id: request.source_pack_id,
                status_code: Some(status.as_u16()),
                title: extract_title(&body),
                excerpt: Some(excerpt_from_body(&body)),
                content_type,
                error: None,
                fetched_at,
            })
        }
        Err(error) => Ok(PublicResearchFetchResult {
            ok: false,
            url,
            source_pack_id: request.source_pack_id,
            status_code: None,
            title: None,
            excerpt: None,
            content_type: None,
            error: Some(format!("Public research fetch failed safely: {error}")),
            fetched_at,
        }),
    }
}

#[tauri::command]
fn openclaw_agent_turn(request: AgentTurnRequest) -> Result<OpenClawBridgeResult, String> {
    validate_agent_message(&request.message)?;
    let agent_profile_id = validate_agent_profile_id(request.agent_profile_id.as_deref())?;
    let agent_role = request.agent_role.as_deref().unwrap_or("OpenClaw agent").trim();
    reject_control_chars(agent_role, "Agent role")?;
    let mission_context = request
        .mission_run_id
        .as_deref()
        .map(|id| format!("Mission run: {id}. "))
        .unwrap_or_default();
    let guarded_message = cli_text(&format!(
        "OpenClaw Mission Control approved local {agent_role} turn. {mission_context}\n\
         Rules: local planning and artifact drafting only; do not spend money; do not publish externally; \
         do not deliver messages to external channels; do not run browser automation; do not browse; do not scrape; \
         do not log in; do not submit forms; do not bypass CAPTCHA or website terms; do not request credentials; \
         do not use --deliver, broadcast, purchases, fake reviews, spam, or uncontrolled crawling. \
         Produce a concise artifact for TeamLeader1A review with evidence needs, assumptions, risks, and next safe approval-gated step.\n\n\
         User request:\n{}",
        request.message.trim()
    ));

    run_openclaw(
        vec![
            "agent".into(),
            "--agent".into(),
            agent_profile_id,
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
            openclaw_mcp_list,
            openclaw_mcp_install_local_kit,
            openclaw_gateway_start,
            public_research_fetch,
            openclaw_agent_turn,
            openclaw_url_research,
            openclaw_channel_send
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenClaw Mission Control");
}
