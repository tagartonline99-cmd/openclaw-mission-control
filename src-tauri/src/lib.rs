use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::hash::{DefaultHasher, Hash, Hasher};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::thread::sleep;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BrowserPublicReadRequest {
    url: String,
    purpose: String,
    source_pack_id: Option<String>,
    hunt_id: Option<String>,
    timeout_seconds: Option<u64>,
    capture_screenshot: Option<bool>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BrowserPublicReadResult {
    ok: bool,
    url: String,
    source_pack_id: Option<String>,
    hunt_id: Option<String>,
    status_code: Option<u16>,
    title: Option<String>,
    excerpt: Option<String>,
    content_type: Option<String>,
    screenshot_path: Option<String>,
    screenshot_captured: bool,
    basic_links: Vec<String>,
    safety_receipt: String,
    error: Option<String>,
    captured_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BrowserBrokerStatusResult {
    ok: bool,
    status: String,
    browser_program: String,
    browser_found: bool,
    artifact_dir: String,
    artifact_dir_writable: bool,
    safety_mode: String,
    direct_control_disabled: bool,
    last_checked_at: String,
    notes: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TavilySaveKeyRequest {
    api_key: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TavilySecretStatusResult {
    configured: bool,
    masked_api_key: Option<String>,
    source: String,
    message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TavilySearchRequest {
    query: String,
    search_depth: Option<String>,
    max_results: Option<u8>,
    include_answer: Option<bool>,
    timeout_seconds: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TavilySearchResultItem {
    title: String,
    url: String,
    content: String,
    raw_content: Option<String>,
    score: Option<f64>,
    published_date: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TavilySearchResponse {
    ok: bool,
    query: String,
    answer: Option<String>,
    results: Vec<TavilySearchResultItem>,
    usage_credits: Option<f64>,
    error: Option<String>,
    searched_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TavilyExtractRequest {
    urls: Vec<String>,
    timeout_seconds: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TavilyExtractResultItem {
    url: String,
    title: Option<String>,
    raw_content: Option<String>,
    content: Option<String>,
    excerpt: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct TavilyExtractResponse {
    ok: bool,
    results: Vec<TavilyExtractResultItem>,
    usage_credits: Option<f64>,
    error: Option<String>,
    extracted_at: String,
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

const MISSION_CONTROL_OPENCLAW_PROFILE: &str = "mission-control";
const MISSION_CONTROL_GATEWAY_PORT: &str = "19789";
const MISSION_CONTROL_GATEWAY_URL: &str = "ws://127.0.0.1:19789";
static MISSION_CONTROL_GATEWAY_LAST_OK: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();
static OPENCLAW_CLI_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
static MISSION_CONTROL_GATEWAY_START_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn mission_control_gateway_cache() -> &'static Mutex<Option<Instant>> {
    MISSION_CONTROL_GATEWAY_LAST_OK.get_or_init(|| Mutex::new(None))
}

fn openclaw_cli_lock() -> &'static Mutex<()> {
    OPENCLAW_CLI_LOCK.get_or_init(|| Mutex::new(()))
}

fn mission_control_gateway_start_lock() -> &'static Mutex<()> {
    MISSION_CONTROL_GATEWAY_START_LOCK.get_or_init(|| Mutex::new(()))
}

fn mark_mission_control_gateway_ok() {
    if let Ok(mut last_ok) = mission_control_gateway_cache().lock() {
        *last_ok = Some(Instant::now());
    }
}

fn clear_mission_control_gateway_ok() {
    if let Ok(mut last_ok) = mission_control_gateway_cache().lock() {
        *last_ok = None;
    }
}

fn mission_control_gateway_recently_ok(max_age: Duration) -> bool {
    mission_control_gateway_cache()
        .lock()
        .ok()
        .and_then(|last_ok| *last_ok)
        .is_some_and(|instant| instant.elapsed() <= max_age)
}

fn mission_control_gateway_port_open() -> bool {
    ["127.0.0.1:19789", "[::1]:19789"].iter().any(|address| {
        address
            .parse()
            .ok()
            .and_then(|socket_addr| TcpStream::connect_timeout(&socket_addr, Duration::from_millis(750)).ok())
            .is_some()
    })
}

fn synthetic_gateway_status(ok: bool, detail: &str) -> OpenClawBridgeResult {
    OpenClawBridgeResult {
        ok,
        command: vec![
            "openclaw-mission-control".into(),
            "gateway".into(),
            "tcp-preflight".into(),
            "--port".into(),
            MISSION_CONTROL_GATEWAY_PORT.into(),
        ],
        stdout: json!({
            "gateway": {
                "bindMode": "loopback",
                "bindHost": "127.0.0.1",
                "port": 19789,
                "probeUrl": MISSION_CONTROL_GATEWAY_URL,
            },
            "port": {
                "port": 19789,
                "status": if ok { "busy" } else { "free" },
            },
            "rpc": {
                "ok": ok,
                "kind": "tcp-preflight",
                "capability": if ok { "listener_detected" } else { "unknown" },
                "url": MISSION_CONTROL_GATEWAY_URL,
            },
            "note": detail,
        })
        .to_string(),
        stderr: if ok { String::new() } else { detail.into() },
        exit_code: Some(if ok { 0 } else { 1 }),
        timed_out: false,
    }
}

fn clamp_timeout(value: Option<u64>, default_seconds: u64, max_seconds: u64) -> u64 {
    value.unwrap_or(default_seconds).clamp(5, max_seconds)
}

fn safe_session_id(value: &str) -> String {
    let mut output = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>();
    while output.contains("--") {
        output = output.replace("--", "-");
    }
    let trimmed = output.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "mission-control-empty".into()
    } else if trimmed.len() <= 56 {
        trimmed
    } else {
        let mut hasher = DefaultHasher::new();
        trimmed.hash(&mut hasher);
        let suffix = format!("{:08x}", hasher.finish() as u32);
        let prefix = trimmed.chars().take(47).collect::<String>().trim_matches('-').to_string();
        format!("{prefix}-{suffix}")
    }
}

fn gateway_rpc_ok(result: &OpenClawBridgeResult) -> bool {
    serde_json::from_str::<Value>(&result.stdout)
        .ok()
        .and_then(|value| value.pointer("/rpc/ok").and_then(Value::as_bool))
        == Some(true)
}

fn agent_turn_gateway_problem(result: &OpenClawBridgeResult) -> bool {
    let text = format!("{}\n{}", result.stderr, result.stdout).to_lowercase();
    result.timed_out
        || text.contains("embedded fallback")
        || text.contains("gateway closed")
        || text.contains("gatewaytransporterror")
        || text.contains("gateway crashed")
        || text.contains("gateway target")
        || text.contains("transport closed")
        || text.contains("not reachable")
        || text.contains("token mismatch")
        || (text.contains("gateway") && (text.contains("fallback") || text.contains("unauthorized") || text.contains("closed")))
}

fn force_agent_turn_failure_for_gateway_problem(result: &mut OpenClawBridgeResult) {
    if agent_turn_gateway_problem(result) {
        result.ok = false;
        if !result.stderr.to_lowercase().contains("gateway-backed openclaw turn was not accepted") {
            result.stderr.push_str(
                "\nMission Control: gateway-backed OpenClaw turn was not accepted. Fallback/local output is recovery only and cannot pass Product Factory proof.\n",
            );
        }
    }
}

fn concise_bridge_diagnostic(result: &OpenClawBridgeResult) -> String {
    let stderr = result.stderr.trim();
    let stdout = result.stdout.trim();
    let detail = if !stderr.is_empty() { stderr } else { stdout };
    format!(
        "ok={} exitCode={:?} timedOut={} detail={}",
        result.ok,
        result.exit_code,
        result.timed_out,
        detail.chars().take(420).collect::<String>()
    )
}

fn kill_stale_mission_control_gateway_listeners(result: &OpenClawBridgeResult, stdout: &mut String, stderr: &mut String) {
    let Ok(value) = serde_json::from_str::<Value>(&result.stdout) else {
        kill_stale_mission_control_gateway_processes(stdout, stderr);
        return;
    };
    let Some(listeners) = value.pointer("/port/listeners").and_then(Value::as_array) else {
        return;
    };
    for listener in listeners {
        let Some(pid) = listener.get("pid").and_then(Value::as_i64) else {
            continue;
        };
        let command_line = listener
            .get("commandLine")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_lowercase();
        let safe_target = command_line.contains("openclaw")
            && command_line.contains("gateway run")
            && command_line.contains(MISSION_CONTROL_OPENCLAW_PROFILE)
            && command_line.contains(MISSION_CONTROL_GATEWAY_PORT);
        if !safe_target {
            continue;
        }
        #[cfg(windows)]
        {
            match Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
            {
                Ok(status) if status.success() => stdout.push_str(&format!("\nKilled stale mission-control gateway listener PID {pid}.\n")),
                Ok(status) => stderr.push_str(&format!("\nFailed to kill stale mission-control gateway listener PID {pid}; taskkill exit {:?}.\n", status.code())),
                Err(error) => stderr.push_str(&format!("\nCould not run taskkill for stale mission-control gateway listener PID {pid}: {error}\n")),
            }
        }
    }
    kill_stale_mission_control_gateway_processes(stdout, stderr);
}

#[cfg(windows)]
fn kill_stale_mission_control_gateway_processes(stdout: &mut String, stderr: &mut String) {
    let script = r#"
$processes = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like '*openclaw*' -and
  $_.CommandLine -like '*--profile mission-control*' -and
  $_.CommandLine -like '*gateway run*' -and
  $_.CommandLine -like '*--port 19789*'
}
foreach ($process in $processes) {
  Stop-Process -Id $process.ProcessId -Force
  Write-Output "Killed stale mission-control gateway process $($process.ProcessId)"
}
"#;
    match Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
    {
        Ok(output) => {
            let out = String::from_utf8_lossy(&output.stdout);
            let err = String::from_utf8_lossy(&output.stderr);
            if !out.trim().is_empty() {
                stdout.push('\n');
                stdout.push_str(out.trim());
                stdout.push('\n');
            }
            if !output.status.success() || !err.trim().is_empty() {
                stderr.push_str(&format!("\nMission-control gateway process cleanup warning: {}\n", err.trim()));
            }
        }
        Err(error) => stderr.push_str(&format!("\nCould not run mission-control gateway process cleanup: {error}\n")),
    }
}

#[cfg(not(windows))]
fn kill_stale_mission_control_gateway_processes(_stdout: &mut String, _stderr: &mut String) {
}

fn reject_control_chars(value: &str, label: &str) -> Result<(), String> {
    if value.chars().any(|ch| ch.is_control() && ch != '\n' && ch != '\t') {
        return Err(format!("{label} contains unsupported control characters"));
    }
    Ok(())
}

fn reject_blocked_intent(value: &str) -> Result<(), String> {
    let mut lower = value.to_lowercase();
    // Mission Control often passes explicit *negative* safety boundaries to local agents
    // (for example: "No publishing ... purchases ... without separate approval").
    // Those guardrail phrases must be allowed through so agents can include the boundary
    // in local artifacts; actual affirmative/actionable unsafe intent remains blocked below.
    let allowed_safety_references = [
        "local-only review artifact. no publishing, spending, messaging, login, launch, connector execution, purchases, or external automation may run without separate approval.",
        "no publishing, spending, messaging, login, launch, connector execution, purchases, or external automation may run without separate approval",
        "no browsing, spending, publishing, messaging, login, forms, purchases, connector execution, or external action",
        "no browsing, spending, publishing, messaging, login, forms, purchases, connector execution, or external actions",
        "no browsing, spending, publishing, messaging, login, forms, purchases, connector execution, or external work",
        "no publishing, spend, login, form submission, purchases, messages, or connector execution happened",
        "no publishing, messaging, spending, login, form submission, purchase, or connector action runs",
        "no publishing, messaging, spending, login, form submission, purchases, or connector actions run",
        "no login, forms, purchases, or publishing",
        "no purchase or spend",
        "no spending, purchase, paid promotion, or connector execution",
        "no purchases, paid promotion, login automation, form submission, or connector execution",
        "no publish, form submission, paid promotion, purchase, or messaging occurs",
        "do not purchase",
        "do not log in",
        "do not submit forms",
        "do not publish externally",
        "do not bypass captcha",
        "do not bypass paywalls",
        "no login",
        "no purchases",
        "no purchase",
        "no publishing",
        "no external publishing",
        "manual login",
        "approval-gated",
        "separate approval",
    ];

    for phrase in allowed_safety_references {
        lower = lower.replace(phrase, " ");
    }

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

fn detect_blocked_evidence(body: &str) -> Option<String> {
    let lower = body.to_lowercase();
    let blocked = [
        ("needs a human touch", "Source presented an anti-bot or human verification challenge."),
        ("loading challenge", "Source presented an anti-bot challenge instead of readable evidence."),
        ("verify you are human", "Source requires human verification."),
        ("captcha", "Source requires CAPTCHA or similar interactive verification."),
        ("sign in to continue", "Source requires sign-in before evidence is readable."),
        ("log in to continue", "Source requires login before evidence is readable."),
        ("access denied", "Source blocked public access."),
        ("pxc", "Source appears to be protected by a bot/challenge page."),
        ("checkout", "Source looks like a checkout or purchase flow."),
        ("payment", "Source looks like a payment flow."),
    ];
    blocked
        .iter()
        .find(|(needle, _)| lower.contains(*needle))
        .map(|(_, reason)| (*reason).to_string())
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

fn reject_blocked_browser_url(value: &str) -> Result<(), String> {
    let lower = value.to_lowercase();
    let blocked = [
        "/login",
        "/log-in",
        "/signin",
        "/sign-in",
        "/auth",
        "/account",
        "/checkout",
        "/cart",
        "/payment",
        "/purchase",
        "/captcha",
    ];

    if let Some(term) = blocked.iter().find(|term| lower.contains(**term)) {
        return Err(format!("Browser public read blocked account/action URL segment: {term}"));
    }
    reject_blocked_intent(value)
}

fn browser_artifact_dir() -> Result<PathBuf, String> {
    let dir = user_home_dir()?
        .join(".openclaw")
        .join("mission-control-browser-artifacts");
    fs::create_dir_all(&dir).map_err(|error| format!("Could not create browser artifact directory: {error}"))?;
    Ok(dir)
}

fn filename_safe(value: &str) -> String {
    let mut output = value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch.to_ascii_lowercase() } else { '-' })
        .collect::<String>();
    while output.contains("--") {
        output = output.replace("--", "-");
    }
    let trimmed = output.trim_matches('-').chars().take(80).collect::<String>();
    if trimmed.is_empty() {
        "browser-read".into()
    } else {
        trimmed
    }
}

fn find_browser_program_path() -> Option<String> {
    if let Some(path) = env::var_os("OPENCLAW_BROWSER_PATH") {
        let path = PathBuf::from(path);
        if path.is_file() {
            return Some(path.to_string_lossy().to_string());
        }
    }

    let candidates = [
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    ];

    candidates
        .iter()
        .map(PathBuf::from)
        .find(|path| path.is_file())
        .map(|path| path.to_string_lossy().to_string())
}

fn find_browser_program() -> String {
    find_browser_program_path().unwrap_or_else(|| "msedge.exe".into())
}

fn capture_public_browser_screenshot(url: &str, timeout_seconds: u64) -> Result<Option<String>, String> {
    let host = url_host(url)?;
    let path = browser_artifact_dir()?.join(format!("{}-{}.png", filename_safe(&host), now_rfc3339()));
    let output_path = path.to_string_lossy().to_string();
    let args = vec![
        "--headless=new".into(),
        "--disable-gpu".into(),
        "--disable-extensions".into(),
        "--disable-background-networking".into(),
        "--hide-scrollbars".into(),
        "--no-first-run".into(),
        "--no-default-browser-check".into(),
        "--window-size=1365,900".into(),
        format!("--screenshot={output_path}"),
        url.to_string(),
    ];
    let result = run_program(&find_browser_program(), args, timeout_seconds)?;
    if result.ok && path.is_file() && path.metadata().map(|item| item.len()).unwrap_or(0) > 0 {
        return Ok(Some(output_path));
    }
    Ok(None)
}

#[tauri::command]
fn browser_broker_status() -> Result<BrowserBrokerStatusResult, String> {
    let browser_program = find_browser_program_path();
    let artifact_dir = browser_artifact_dir()?;
    let artifact_dir_writable = artifact_dir.is_dir();
    let browser_found = browser_program.is_some();
    let status = if browser_found && artifact_dir_writable {
        "active"
    } else if artifact_dir_writable {
        "text_only"
    } else {
        "degraded"
    };
    let notes = if browser_found {
        "Native Mission Control broker is ready for safe public browser reads and screenshots. Puppeteer MCP direct control remains disabled."
    } else {
        "Native broker can still do guarded text reads, but screenshot capture needs Microsoft Edge or Chrome on PATH or OPENCLAW_BROWSER_PATH."
    };

    Ok(BrowserBrokerStatusResult {
        ok: status == "active",
        status: status.into(),
        browser_program: browser_program.unwrap_or_else(|| "msedge.exe fallback".into()),
        browser_found,
        artifact_dir: artifact_dir.to_string_lossy().to_string(),
        artifact_dir_writable,
        safety_mode: "safe-public-read-only".into(),
        direct_control_disabled: true,
        last_checked_at: now_rfc3339(),
        notes: notes.into(),
    })
}

#[tauri::command]
fn tavily_secret_status() -> Result<TavilySecretStatusResult, String> {
    match read_tavily_api_key() {
        Ok((key, source)) => Ok(TavilySecretStatusResult {
            configured: true,
            masked_api_key: Some(mask_api_key(&key)),
            source,
            message: "Tavily API key is configured for local backend research.".into(),
        }),
        Err(error) => Ok(TavilySecretStatusResult {
            configured: false,
            masked_api_key: None,
            source: "none".into(),
            message: error,
        }),
    }
}

#[tauri::command]
fn tavily_save_api_key(request: TavilySaveKeyRequest) -> Result<TavilySecretStatusResult, String> {
    let key = request.api_key.trim();
    if key.len() < 16 {
        return Err("Tavily API key looks too short.".into());
    }
    reject_control_chars(key, "Tavily API key")?;
    let path = tavily_secret_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("Could not create secret directory: {error}"))?;
    }
    fs::write(&path, key).map_err(|error| format!("Could not save Tavily API key locally: {error}"))?;
    Ok(TavilySecretStatusResult {
        configured: true,
        masked_api_key: Some(mask_api_key(key)),
        source: path.to_string_lossy().to_string(),
        message: "Tavily API key saved locally. It is not written to SQLite or Git.".into(),
    })
}

#[tauri::command]
async fn tavily_test_connection() -> Result<TavilySearchResponse, String> {
    tavily_search(TavilySearchRequest {
        query: "online business validation research".into(),
        search_depth: Some("basic".into()),
        max_results: Some(1),
        include_answer: Some(false),
        timeout_seconds: Some(20),
    })
    .await
}

#[tauri::command]
async fn tavily_search(request: TavilySearchRequest) -> Result<TavilySearchResponse, String> {
    let query = request.query.trim().to_string();
    if query.len() < 3 {
        return Err("Tavily query is required.".into());
    }
    if query.len() > 400 {
        return Err("Tavily query is too long for a guarded research action.".into());
    }
    reject_control_chars(&query, "Tavily query")?;
    reject_blocked_intent(&query)?;
    let search_depth = match request.search_depth.as_deref().unwrap_or("basic") {
        "basic" => "basic",
        "advanced" => "advanced",
        _ => return Err("Tavily search depth must be basic or advanced.".into()),
    };
    let max_results = request.max_results.unwrap_or(5).clamp(1, 10);
    let timeout = clamp_timeout(request.timeout_seconds, 25, 45);
    let body = json!({
        "query": query,
        "search_depth": search_depth,
        "max_results": max_results,
        "include_answer": request.include_answer.unwrap_or(true),
        "include_raw_content": false,
        "include_images": false,
        "include_usage": true
    });
    let searched_at = now_rfc3339();
    let value = tavily_post("search", body, timeout).await?;
    let answer = value.get("answer").and_then(Value::as_str).map(str::to_string);
    let usage_credits = value
        .pointer("/usage/credits")
        .and_then(Value::as_f64)
        .or_else(|| value.get("credits").and_then(Value::as_f64));
    let mut results = Vec::new();
    if let Some(items) = value.get("results").and_then(Value::as_array) {
        for item in items {
            let url = item.get("url").and_then(Value::as_str).unwrap_or_default().to_string();
            if validate_url(&url).is_err() || reject_blocked_browser_url(&url).is_err() {
                continue;
            }
            results.push(TavilySearchResultItem {
                title: item
                    .get("title")
                    .and_then(Value::as_str)
                    .unwrap_or("Untitled Tavily source")
                    .chars()
                    .take(220)
                    .collect(),
                url,
                content: item
                    .get("content")
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .chars()
                    .take(2_400)
                    .collect(),
                raw_content: item
                    .get("raw_content")
                    .and_then(Value::as_str)
                    .map(|text| text.chars().take(3_000).collect()),
                score: item.get("score").and_then(Value::as_f64),
                published_date: item.get("published_date").and_then(Value::as_str).map(str::to_string),
            });
        }
    }
    Ok(TavilySearchResponse {
        ok: true,
        query,
        answer,
        results,
        usage_credits,
        error: None,
        searched_at,
    })
}

#[tauri::command]
async fn tavily_extract(request: TavilyExtractRequest) -> Result<TavilyExtractResponse, String> {
    let urls = request
        .urls
        .iter()
        .map(|url| url.trim().to_string())
        .filter(|url| !url.is_empty())
        .take(8)
        .collect::<Vec<_>>();
    if urls.is_empty() {
        return Err("Tavily Extract requires at least one URL.".into());
    }
    for url in &urls {
        validate_url(url)?;
        reject_blocked_browser_url(url)?;
    }
    let timeout = clamp_timeout(request.timeout_seconds, 35, 60);
    let body = json!({
        "urls": urls,
        "extract_depth": "basic",
        "include_images": false,
        "include_usage": true
    });
    let extracted_at = now_rfc3339();
    let value = tavily_post("extract", body, timeout).await?;
    let usage_credits = value
        .pointer("/usage/credits")
        .and_then(Value::as_f64)
        .or_else(|| value.get("credits").and_then(Value::as_f64));
    let mut results = Vec::new();
    if let Some(items) = value.get("results").and_then(Value::as_array) {
        for item in items {
            let raw = item
                .get("raw_content")
                .or_else(|| item.get("content"))
                .and_then(Value::as_str)
                .unwrap_or_default()
                .to_string();
            let blocked_reason = detect_blocked_evidence(&raw);
            results.push(TavilyExtractResultItem {
                url: item.get("url").and_then(Value::as_str).unwrap_or_default().to_string(),
                title: item.get("title").and_then(Value::as_str).map(str::to_string),
                raw_content: Some(raw.chars().take(5_000).collect()),
                content: item.get("content").and_then(Value::as_str).map(|text| text.chars().take(3_000).collect()),
                excerpt: Some(excerpt_from_body(&raw)),
                error: blocked_reason,
            });
        }
    }
    if let Some(items) = value.get("failed_results").and_then(Value::as_array) {
        for item in items {
            results.push(TavilyExtractResultItem {
                url: item.get("url").and_then(Value::as_str).unwrap_or_default().to_string(),
                title: None,
                raw_content: None,
                content: None,
                excerpt: None,
                error: Some(
                    item.get("error")
                        .and_then(Value::as_str)
                        .unwrap_or("Tavily extract failed safely.")
                        .to_string(),
                ),
            });
        }
    }
    Ok(TavilyExtractResponse {
        ok: true,
        results,
        usage_credits,
        error: None,
        extracted_at,
    })
}

fn extract_basic_links(html: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut rest = html;
    while let Some(index) = rest.to_lowercase().find("href=") {
        rest = &rest[index + 5..];
        let quote = rest.chars().next().unwrap_or(' ');
        if quote != '"' && quote != '\'' {
            continue;
        }
        rest = &rest[1..];
        if let Some(end) = rest.find(quote) {
            let candidate = rest[..end].trim();
            if candidate.starts_with("http://") || candidate.starts_with("https://") {
                if validate_url(candidate).is_ok() && reject_blocked_browser_url(candidate).is_ok() && !links.iter().any(|item| item == candidate) {
                    links.push(candidate.chars().take(260).collect());
                }
            }
            rest = &rest[end + 1..];
        } else {
            break;
        }
        if links.len() >= 8 {
            break;
        }
    }
    links
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

fn bridge_temp_output_paths() -> Result<(PathBuf, PathBuf), String> {
    let dir = env::temp_dir().join("openclaw-mission-control-bridge");
    fs::create_dir_all(&dir)
        .map_err(|error| format!("Could not create OpenClaw bridge temp directory: {error}"))?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    let base = format!("bridge-{}-{stamp}", std::process::id());
    Ok((dir.join(format!("{base}.stdout.log")), dir.join(format!("{base}.stderr.log"))))
}

fn read_and_remove_output(path: &PathBuf) -> String {
    let text = fs::read_to_string(path).unwrap_or_default();
    let _ = fs::remove_file(path);
    text
}

fn run_program_with_env(
    program: &str,
    args: Vec<String>,
    timeout_seconds: u64,
    env_overrides: &[(&str, &str)],
) -> Result<OpenClawBridgeResult, String> {
    let timeout = Duration::from_secs(timeout_seconds);
    let (stdout_path, stderr_path) = bridge_temp_output_paths()?;
    let stdout_file = fs::File::create(&stdout_path)
        .map_err(|error| format!("Could not create OpenClaw stdout temp file: {error}"))?;
    let stderr_file = fs::File::create(&stderr_path)
        .map_err(|error| format!("Could not create OpenClaw stderr temp file: {error}"))?;
    let mut command = Command::new(program);
    command
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file));
    for (key, value) in env_overrides {
        command.env(key, value);
    }

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
            #[cfg(windows)]
            {
                let _ = Command::new("taskkill")
                    .args(["/PID", &child.id().to_string(), "/T", "/F"])
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status();
            }
            let _ = child.kill();
            let status = child
                .wait()
                .map_err(|error| format!("Failed to wait for timed out OpenClaw process: {error}"))?;
            return Ok(OpenClawBridgeResult {
                ok: false,
                command: std::iter::once(program.to_string()).chain(args).collect(),
                stdout: read_and_remove_output(&stdout_path),
                stderr: read_and_remove_output(&stderr_path),
                exit_code: status.code(),
                timed_out: true,
            });
        }

        if child
            .try_wait()
            .map_err(|error| format!("Failed while waiting for OpenClaw CLI: {error}"))?
            .is_some()
        {
            let status = child
                .wait()
                .map_err(|error| format!("Failed to collect OpenClaw process status: {error}"))?;
            return Ok(OpenClawBridgeResult {
                ok: status.success(),
                command: std::iter::once(program.to_string()).chain(args).collect(),
                stdout: read_and_remove_output(&stdout_path),
                stderr: read_and_remove_output(&stderr_path),
                exit_code: status.code(),
                timed_out: false,
            });
        }

        sleep(Duration::from_millis(150));
    }
}

fn run_program(program: &str, args: Vec<String>, timeout_seconds: u64) -> Result<OpenClawBridgeResult, String> {
    run_program_with_env(program, args, timeout_seconds, &[])
}

fn mission_control_openclaw_args(args: Vec<String>) -> Vec<String> {
    let mut scoped = vec!["--profile".into(), MISSION_CONTROL_OPENCLAW_PROFILE.into()];
    scoped.extend(args);
    scoped
}

fn run_openclaw(args: Vec<String>, timeout_seconds: u64) -> Result<OpenClawBridgeResult, String> {
    let _cli_guard = openclaw_cli_lock()
        .lock()
        .map_err(|_| "OpenClaw CLI supervisor lock was poisoned".to_string())?;
    run_program_with_env(
        openclaw_program(),
        mission_control_openclaw_args(args),
        timeout_seconds,
        &[
            ("OPENCLAW_PROFILE", MISSION_CONTROL_OPENCLAW_PROFILE),
            ("OPENCLAW_GATEWAY_PORT", MISSION_CONTROL_GATEWAY_PORT),
        ],
    )
}

fn spawn_mission_control_gateway_run() -> Result<(), String> {
    let mut command = Command::new(openclaw_program());
    command
        .args(mission_control_openclaw_args(vec![
            "gateway".into(),
            "run".into(),
            "--port".into(),
            MISSION_CONTROL_GATEWAY_PORT.into(),
            "--bind".into(),
            "loopback".into(),
            "--ws-log".into(),
            "compact".into(),
        ]))
        .env("OPENCLAW_PROFILE", MISSION_CONTROL_OPENCLAW_PROFILE)
        .env("OPENCLAW_GATEWAY_PORT", MISSION_CONTROL_GATEWAY_PORT)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const CREATE_NEW_PROCESS_GROUP: u32 = 0x00000200;
        command.creation_flags(CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP);
    }

    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not start mission-control gateway run process: {error}"))
}

async fn run_openclaw_off_main_thread(args: Vec<String>, timeout_seconds: u64) -> Result<OpenClawBridgeResult, String> {
    tauri::async_runtime::spawn_blocking(move || run_openclaw(args, timeout_seconds))
        .await
        .map_err(|error| format!("OpenClaw worker task failed: {error}"))?
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

fn tavily_secret_path() -> Result<PathBuf, String> {
    let base = env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or(user_home_dir()?.join(".openclaw"));
    Ok(base
        .join("com.openclaw.missioncontrol")
        .join("secrets")
        .join("tavily-api-key.txt"))
}

fn mask_api_key(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() <= 8 {
        return "********".into();
    }
    let prefix = trimmed.chars().take(4).collect::<String>();
    let suffix = trimmed
        .chars()
        .rev()
        .take(4)
        .collect::<String>()
        .chars()
        .rev()
        .collect::<String>();
    format!("{prefix}...{suffix}")
}

fn read_tavily_api_key() -> Result<(String, String), String> {
    if let Ok(value) = env::var("TAVILY_API_KEY").or_else(|_| env::var("OPENCLAW_TAVILY_API_KEY")) {
        let trimmed = value.trim().to_string();
        if !trimmed.is_empty() {
            return Ok((trimmed, "environment".into()));
        }
    }

    let path = tavily_secret_path()?;
    let key = fs::read_to_string(&path)
        .map_err(|_| "Tavily API key is not configured. Add it in Mission Control Settings.".to_string())?
        .trim()
        .to_string();
    if key.is_empty() {
        return Err("Tavily API key file is empty. Add a valid key in Mission Control Settings.".into());
    }
    Ok((key, path.to_string_lossy().to_string()))
}

async fn tavily_post(path: &str, body: Value, timeout_seconds: u64) -> Result<Value, String> {
    let (api_key, _) = read_tavily_api_key()?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_seconds))
        .user_agent("OpenClaw-Mission-Control/0.1 tavily-research")
        .build()
        .map_err(|error| format!("Could not create Tavily client: {error}"))?;
    let url = format!("https://api.tavily.com/{path}");
    let response = client
        .post(url)
        .header(reqwest::header::AUTHORIZATION, format!("Bearer {api_key}"))
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(body.to_string())
        .send()
        .await
        .map_err(|error| format!("Tavily request failed safely: {error}"))?;
    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|error| format!("Could not read Tavily response: {error}"))?;
    if !status.is_success() {
        return Err(format!("Tavily returned HTTP {}: {}", status.as_u16(), text.chars().take(240).collect::<String>()));
    }
    serde_json::from_str::<Value>(&text).map_err(|error| format!("Could not parse Tavily JSON: {error}"))
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
async fn openclaw_gateway_status() -> Result<OpenClawBridgeResult, String> {
    let result = run_openclaw_off_main_thread(
        vec![
            "gateway".into(),
            "status".into(),
            "--json".into(),
            "--url".into(),
            MISSION_CONTROL_GATEWAY_URL.into(),
        ],
        90,
    )
    .await?;
    if gateway_rpc_ok(&result) {
        mark_mission_control_gateway_ok();
        return Ok(result);
    }
    clear_mission_control_gateway_ok();
    if result.timed_out && mission_control_gateway_port_open() {
        let mut honest = synthetic_gateway_status(
            false,
            "Mission Control gateway has a loopback listener, but RPC status timed out. Treating as degraded until RPC proves healthy.",
        );
        honest.timed_out = true;
        return Ok(honest);
    }
    Ok(result)
}

#[tauri::command]
async fn openclaw_agents_list() -> Result<OpenClawBridgeResult, String> {
    run_openclaw_off_main_thread(vec!["agents".into(), "list".into(), "--json".into()], 180).await
}

#[tauri::command]
async fn openclaw_tasks_list() -> Result<OpenClawBridgeResult, String> {
    run_openclaw_off_main_thread(vec!["tasks".into(), "list".into(), "--json".into()], 45).await
}

#[tauri::command]
async fn openclaw_mcp_list() -> Result<OpenClawBridgeResult, String> {
    run_openclaw_off_main_thread(vec!["mcp".into(), "list".into(), "--json".into()], 45).await
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
            "@modelcontextprotocol/server-puppeteer@2025.5.12".into(),
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
    let browser_entry = mcp_dir
        .join("node_modules")
        .join("@modelcontextprotocol")
        .join("server-puppeteer")
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
    let browser_config = json!({
        "command": "node",
        "args": [browser_entry.to_string_lossy().to_string()],
        "env": {
            "OPENCLAW_MISSION_CONTROL_BROKER_REQUIRED": "true",
            "OPENCLAW_MISSION_CONTROL_BROWSER_MODE": "safe-public-read"
        },
        "disabled": true,
        "note": "safe-public-browser-read-brokered"
    });

    for (name, config) in [
        ("filesystem", filesystem_config),
        ("memory", memory_config),
        ("fetch_approved_url_research", fetch_config),
        ("browser_safe_public_read", browser_config),
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
async fn openclaw_gateway_start() -> Result<OpenClawBridgeResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _start_guard = mission_control_gateway_start_lock()
            .lock()
            .map_err(|_| "Mission Control gateway supervisor lock was poisoned".to_string())?;
        let mut stdout = String::from("Mission Control gateway preflight\n");
        let mut stderr = String::new();
        if mission_control_gateway_recently_ok(Duration::from_secs(600)) && mission_control_gateway_port_open() {
            let cached_probe = run_openclaw(
                vec![
                    "gateway".into(),
                    "status".into(),
                    "--json".into(),
                    "--url".into(),
                    MISSION_CONTROL_GATEWAY_URL.into(),
                ],
                45,
            )?;
            append_result("cached gateway rpc verification", &cached_probe, &mut stdout, &mut stderr);
            if gateway_rpc_ok(&cached_probe) {
                mark_mission_control_gateway_ok();
                return Ok(OpenClawBridgeResult {
                    ok: true,
                    command: vec![
                        "openclaw-mission-control".into(),
                        "gateway".into(),
                        "already-online".into(),
                    ],
                    stdout,
                    stderr,
                    exit_code: cached_probe.exit_code,
                    timed_out: cached_probe.timed_out,
                });
            }
            clear_mission_control_gateway_ok();
        }
        let initial = if mission_control_gateway_port_open() {
            run_openclaw(
                vec![
                    "gateway".into(),
                    "status".into(),
                    "--json".into(),
                    "--url".into(),
                    MISSION_CONTROL_GATEWAY_URL.into(),
                ],
                90,
            )?
        } else {
            synthetic_gateway_status(false, "No Mission Control gateway listener was detected before start.")
        };
        append_result("initial gateway status", &initial, &mut stdout, &mut stderr);
        if gateway_rpc_ok(&initial) {
            mark_mission_control_gateway_ok();
            return Ok(OpenClawBridgeResult {
                ok: true,
                command: vec![
                    "openclaw-mission-control".into(),
                    "gateway".into(),
                    "already-online".into(),
                ],
                stdout,
                stderr,
                exit_code: initial.exit_code,
                timed_out: initial.timed_out,
            });
        }

        kill_stale_mission_control_gateway_listeners(&initial, &mut stdout, &mut stderr);
        sleep(Duration::from_millis(1_500));
        spawn_mission_control_gateway_run()?;
        stdout.push_str("\nMission Control gateway run process requested on loopback port 19789.\n");
        let mut last: OpenClawBridgeResult;
        let mut tcp_detected = false;
        for attempt in 1..=45 {
            sleep(Duration::from_millis(1_000));
            if mission_control_gateway_port_open() {
                tcp_detected = true;
                last = synthetic_gateway_status(true, &format!("Mission Control gateway TCP listener detected after start attempt {attempt}."));
                append_result(&format!("gateway tcp preflight after start attempt {attempt}"), &last, &mut stdout, &mut stderr);
                break;
            }
        }
        if tcp_detected {
            for rpc_attempt in 1..=3 {
                last = run_openclaw(
                    vec![
                        "gateway".into(),
                        "status".into(),
                        "--json".into(),
                        "--url".into(),
                        MISSION_CONTROL_GATEWAY_URL.into(),
                    ],
                    90,
                )?;
                append_result(&format!("gateway rpc preflight after TCP detection attempt {rpc_attempt}"), &last, &mut stdout, &mut stderr);
                if gateway_rpc_ok(&last) {
                    mark_mission_control_gateway_ok();
                    return Ok(OpenClawBridgeResult {
                        ok: true,
                        command: vec![
                            "openclaw-mission-control".into(),
                            "gateway".into(),
                            "run".into(),
                            "--port".into(),
                            MISSION_CONTROL_GATEWAY_PORT.into(),
                        ],
                        stdout,
                        stderr,
                        exit_code: last.exit_code,
                        timed_out: last.timed_out,
                    });
                }
                sleep(Duration::from_millis(2_000));
            }
        }
        last = run_openclaw(
            vec![
                "gateway".into(),
                "status".into(),
                "--json".into(),
                "--url".into(),
                MISSION_CONTROL_GATEWAY_URL.into(),
            ],
            45,
        )?;
        append_result("final gateway status after failed tcp preflight", &last, &mut stdout, &mut stderr);
        clear_mission_control_gateway_ok();

        Ok(OpenClawBridgeResult {
            ok: false,
            command: vec![
                "openclaw-mission-control".into(),
                "gateway".into(),
                "run".into(),
                "--port".into(),
                MISSION_CONTROL_GATEWAY_PORT.into(),
            ],
            stdout,
            stderr: if stderr.trim().is_empty() {
                "Mission Control gateway did not become reachable on ws://127.0.0.1:19789.".into()
            } else {
                stderr
            },
            exit_code: last.exit_code,
            timed_out: last.timed_out,
        })
    })
    .await
    .map_err(|error| format!("OpenClaw gateway start worker failed: {error}"))?
}

#[tauri::command]
async fn public_research_fetch(request: PublicResearchFetchRequest) -> Result<PublicResearchFetchResult, String> {
    let url = request.url.trim().to_string();
    validate_url(&url)?;
    reject_blocked_browser_url(&url)?;
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
            if let Some(blocked_reason) = detect_blocked_evidence(&body) {
                return Ok(PublicResearchFetchResult {
                    ok: false,
                    url,
                    source_pack_id: request.source_pack_id,
                    status_code: Some(status.as_u16()),
                    title: extract_title(&body),
                    excerpt: None,
                    content_type,
                    error: Some(blocked_reason),
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
async fn browser_public_read(request: BrowserPublicReadRequest) -> Result<BrowserPublicReadResult, String> {
    let url = request.url.trim().to_string();
    let purpose = request.purpose.trim().to_string();
    validate_url(&url)?;
    reject_blocked_browser_url(&url)?;
    reject_control_chars(&purpose, "Browser read purpose")?;
    reject_blocked_intent(&purpose)?;

    let timeout_seconds = clamp_timeout(request.timeout_seconds, 15, 35);
    let timeout = Duration::from_secs(timeout_seconds);
    let client = reqwest::Client::builder()
        .timeout(timeout)
        .user_agent("OpenClaw-Mission-Control/0.1 safe-public-browser-read")
        .redirect(reqwest::redirect::Policy::limited(4))
        .build()
        .map_err(|error| format!("Could not create browser read client: {error}"))?;

    let captured_at = now_rfc3339();
    let safety_receipt = format!(
        "safe-browser-public-read:{}:GET-only:read-text:screenshot:{}:no-login:no-forms:no-spend:no-publish:no-messaging",
        url_host(&url)?,
        request.capture_screenshot.unwrap_or(true)
    );

    match client.get(&url).send().await {
        Ok(response) => {
            let status = response.status();
            let content_type = response
                .headers()
                .get(reqwest::header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok())
                .map(|value| value.to_string());
            if !status.is_success() {
                return Ok(BrowserPublicReadResult {
                    ok: false,
                    url,
                    source_pack_id: request.source_pack_id,
                    hunt_id: request.hunt_id,
                    status_code: Some(status.as_u16()),
                    title: None,
                    excerpt: None,
                    content_type,
                    screenshot_path: None,
                    screenshot_captured: false,
                    basic_links: vec![],
                    safety_receipt,
                    error: Some(format!("Public browser read returned HTTP {}", status.as_u16())),
                    captured_at,
                });
            }

            let body = response
                .text()
                .await
                .map_err(|error| format!("Could not read public browser response: {error}"))?;
            if let Some(blocked_reason) = detect_blocked_evidence(&body) {
                return Ok(BrowserPublicReadResult {
                    ok: false,
                    url,
                    source_pack_id: request.source_pack_id,
                    hunt_id: request.hunt_id,
                    status_code: Some(status.as_u16()),
                    title: extract_title(&body),
                    excerpt: None,
                    content_type,
                    screenshot_path: None,
                    screenshot_captured: false,
                    basic_links: vec![],
                    safety_receipt,
                    error: Some(blocked_reason),
                    captured_at,
                });
            }

            let screenshot_path = if request.capture_screenshot.unwrap_or(true) {
                capture_public_browser_screenshot(&url, timeout_seconds).unwrap_or(None)
            } else {
                None
            };
            let screenshot_captured = screenshot_path.is_some();

            Ok(BrowserPublicReadResult {
                ok: true,
                url,
                source_pack_id: request.source_pack_id,
                hunt_id: request.hunt_id,
                status_code: Some(status.as_u16()),
                title: extract_title(&body),
                excerpt: Some(excerpt_from_body(&body)),
                content_type,
                screenshot_path,
                screenshot_captured,
                basic_links: extract_basic_links(&body),
                safety_receipt,
                error: None,
                captured_at,
            })
        }
        Err(error) => Ok(BrowserPublicReadResult {
            ok: false,
            url,
            source_pack_id: request.source_pack_id,
            hunt_id: request.hunt_id,
            status_code: None,
            title: None,
            excerpt: None,
            content_type: None,
            screenshot_path: None,
            screenshot_captured: false,
            basic_links: vec![],
            safety_receipt,
            error: Some(format!("Public browser read failed safely: {error}")),
            captured_at,
        }),
    }
}

#[tauri::command]
async fn openclaw_agent_turn(request: AgentTurnRequest) -> Result<OpenClawBridgeResult, String> {
    validate_agent_message(&request.message)?;
    let agent_profile_id = validate_agent_profile_id(request.agent_profile_id.as_deref())?;
    let agent_role = request.agent_role.as_deref().unwrap_or("OpenClaw agent").trim();
    reject_control_chars(agent_role, "Agent role")?;
    let mission_context = request
        .mission_run_id
        .as_deref()
        .map(|id| format!("Mission run: {id}. "))
        .unwrap_or_default();
    let product_directive_mode = request
        .message
        .contains("OPENCLAW_PRODUCT_DIRECTIVE_RECEIPT_V1");
    let product_instruction = if product_directive_mode {
        "If this is a product-production turn, return the compact Product Factory directive requested by Mission Control. \
         Use the exact Markdown headings requested. Keep the response under 900 characters, but make it concrete enough \
         to guide local product files. Do not create giant drafts in this live turn; Mission Control writes the full local \
         files only after all real agent directive receipts pass."
    } else {
        "If this is a product-production turn, produce a complete publish-ready LOCAL product artifact now, not a summary. \
         Start with the first required Markdown heading. Include every required Markdown heading requested by Mission Control, \
         concrete buyer-facing copy, exact fields, evidence/assumption notes, risks, missing items, and the next safe handoff."
    };
    let session_id = safe_session_id(&format!(
        "mission-control-product-factory-{}-{}",
        request.mission_run_id.as_deref().unwrap_or("adhoc"),
        agent_profile_id
    ));
    let guarded_message = if product_directive_mode {
        cli_text(request.message.trim())
    } else {
        cli_text(&format!(
            "OpenClaw Mission Control approved local {agent_role} turn. {mission_context}\n\
             Rules: local planning and artifact drafting only; do not spend money; do not publish externally; \
             do not deliver messages to external channels; do not run browser automation; do not browse; do not scrape; \
             do not log in; do not submit forms; do not bypass CAPTCHA or website terms; do not request credentials; \
             do not use --deliver, broadcast, purchases, fake reviews, spam, or uncontrolled crawling. \
             {product_instruction} \
             Do not acknowledge, stand by, ask for another instruction, or describe the rules back to the user. \
             Never claim the product was published.\n\n\
             User request:\n{}",
            request.message.trim()
        ))
    };

    if product_directive_mode {
        // Product Factory proof must be gateway-backed. Clear any cached "healthy"
        // state so every product agent turn re-validates RPC instead of trusting a
        // stale TCP listener.
        clear_mission_control_gateway_ok();
    }
    let gateway_preflight = openclaw_gateway_start().await?;
    if !gateway_preflight.ok {
        clear_mission_control_gateway_ok();
        return Ok(OpenClawBridgeResult {
            ok: false,
            command: gateway_preflight.command,
            stdout: gateway_preflight.stdout,
            stderr: format!(
                "Mission Control gateway preflight failed before {agent_role} turn. {}",
                gateway_preflight.stderr
            ),
            exit_code: gateway_preflight.exit_code,
            timed_out: gateway_preflight.timed_out,
        });
    }

    let mut args = vec![
        "agent".into(),
        "--agent".into(),
        agent_profile_id,
        "--session-id".into(),
        session_id,
        "--message".into(),
        guarded_message,
    ];
    if !product_directive_mode {
        args.push("--json".into());
    }
    args.extend([
        "--thinking".into(),
        "off".into(),
        "--timeout".into(),
        clamp_timeout(request.timeout_seconds, 45, 300).to_string(),
    ]);

    let run_timeout = clamp_timeout(request.timeout_seconds, 45, 300) + 15;
    let mut result = run_openclaw_off_main_thread(args.clone(), run_timeout).await?;
    if product_directive_mode && agent_turn_gateway_problem(&result) {
        let first_diagnostic = concise_bridge_diagnostic(&result);
        clear_mission_control_gateway_ok();
        let _ = run_openclaw_off_main_thread(vec!["gateway".into(), "stop".into()], 45).await;
        let _ = tauri::async_runtime::spawn_blocking(|| sleep(Duration::from_millis(1_500))).await;
        let retry_preflight = openclaw_gateway_start().await?;
        if !retry_preflight.ok {
            result.ok = false;
            result.stderr.push_str(&format!(
                "\nMission Control retry preflight failed after first product turn problem: {}\n{}",
                first_diagnostic,
                retry_preflight.stderr
            ));
            return Ok(result);
        }
        let mut retry_result = run_openclaw_off_main_thread(args, run_timeout).await?;
        retry_result.stderr = format!(
            "Mission Control retried this product agent turn after a gateway reset. First attempt: {}\n{}",
            first_diagnostic,
            retry_result.stderr
        );
        result = retry_result;
    }

    force_agent_turn_failure_for_gateway_problem(&mut result);
    if result.ok {
        mark_mission_control_gateway_ok();
    } else if agent_turn_gateway_problem(&result) {
        clear_mission_control_gateway_ok();
    }
    Ok(result)
}

#[tauri::command]
async fn openclaw_url_research(request: UrlResearchRequest) -> Result<OpenClawBridgeResult, String> {
    if request.urls.is_empty() || request.urls.len() > 8 {
        return Err("Approved URL research requires 1-8 explicit URLs".into());
    }
    for url in &request.urls {
        validate_url(url)?;
        reject_blocked_browser_url(url)?;
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

    run_openclaw_off_main_thread(
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
    .await
}

#[tauri::command]
async fn openclaw_channel_send(request: ChannelMessageRequest) -> Result<OpenClawBridgeResult, String> {
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

    run_openclaw_off_main_thread(args, clamp_timeout(request.timeout_seconds, 45, 120)).await
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
            browser_public_read,
            browser_broker_status,
            tavily_secret_status,
            tavily_save_api_key,
            tavily_test_connection,
            tavily_search,
            tavily_extract,
            openclaw_agent_turn,
            openclaw_url_research,
            openclaw_channel_send
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenClaw Mission Control");
}
