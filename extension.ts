import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
const DIVIDER = "──────────────────────────────────────────────────";
const isWindows = process.platform === "win32";

interface TaskPulseConfig {
  commandGroups: Record<string, string[]>;
  stopOnError: boolean;
  autoCloseTerminal: boolean;
}

function getConfig(): TaskPulseConfig {
  const config = vscode.workspace.getConfiguration("taskPulse");
  return {
    commandGroups: config.get<Record<string, string[]>>("commandGroups", {}),
    stopOnError: config.get<boolean>("stopOnError", true),
    autoCloseTerminal: config.get<boolean>("autoCloseTerminal", true),
  };
}

function getWorkspaceRoot(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
}

// ── Bash script builder (macOS / Linux) ──

function escapeShell(str: string): string {
  return str.replace(/'/g, "'\\''");
}

function bashEcho(msg: string): string {
  return `echo -e "${msg}"`;
}

function bashColorVar(name: string, code: string): string {
  return `${name}="\\033[${code}m"`;
}

function bashSummaryBlock(): string[] {
  return [
    "total_elapsed=$(( SECONDS - total_start ))",
    bashEcho('${BOLD}${CYAN}' + SEPARATOR + '${RESET}'),
    bashEcho('${BOLD}  Task Pulse Summary${RESET}'),
    bashEcho('${BOLD}${CYAN}' + SEPARATOR + '${RESET}'),
    bashEcho('  ${GREEN}Passed:  $passed${RESET}'),
    bashEcho('  ${RED}Failed:  $failed${RESET}'),
    bashEcho('  ${YELLOW}Skipped: $skipped${RESET}'),
    bashEcho('  ${DIM}Total time: ${total_elapsed}s${RESET}'),
    bashEcho('${BOLD}${CYAN}' + SEPARATOR + '${RESET}'),
    bashEcho(""),
  ];
}

function bashStepBlock(cmd: string, step: number, total: number, stopOnError: boolean, isLast: boolean): string[] {
  const escaped = escapeShell(cmd);
  const remaining = total - step;
  const lines: string[] = [
    bashEcho('${BOLD}${CYAN}' + DIVIDER + '${RESET}'),
    bashEcho(`\${BOLD}  Step ${step}/${total}: \${YELLOW}${escaped}\${RESET}`),
    bashEcho('${BOLD}${CYAN}' + DIVIDER + '${RESET}'),
    bashEcho(""),
    "step_start=$SECONDS",
    "",
    cmd,
    "exit_code=$?",
    "",
    "step_elapsed=$(( SECONDS - step_start ))",
    bashEcho(""),
    "if [ $exit_code -eq 0 ]; then",
    `  ${bashEcho(`  \${GREEN}✓ Step ${step}/${total} passed\${RESET} \${DIM}(\${step_elapsed}s)\${RESET}`)}`,
    "  passed=$((passed + 1))",
    "else",
    `  ${bashEcho(`  \${RED}✗ Step ${step}/${total} failed (exit code $exit_code)\${RESET} \${DIM}(\${step_elapsed}s)\${RESET}`)}`,
    "  failed=$((failed + 1))",
  ];

  if (stopOnError && !isLast) {
    lines.push(
      `  skipped=${remaining}`,
      `  ${bashEcho("")}`,
      `  ${bashEcho(`  \${RED}⛔ Stopping — stopOnError is enabled. ${remaining} command(s) skipped.\${RESET}`)}`,
      `  ${bashEcho("")}`,
      ...bashSummaryBlock().map((l) => `  ${l}`),
      "  exit $exit_code"
    );
  }

  lines.push("fi", bashEcho(""));
  return lines;
}

function buildBashScript(commands: string[], groupName: string, stopOnError: boolean): string {
  const total = commands.length;

  const header: string[] = [
    "#!/usr/bin/env bash",
    "",
    bashColorVar("BOLD", "1"),
    bashColorVar("DIM", "2"),
    bashColorVar("GREEN", "32"),
    bashColorVar("RED", "31"),
    bashColorVar("YELLOW", "33"),
    bashColorVar("CYAN", "36"),
    'RESET="\\033[0m"',
    "",
    "passed=0", "failed=0", "skipped=0",
    `total=${total}`,
    "",
    "SECONDS=0", "total_start=$SECONDS",
    "",
    bashEcho(""),
    bashEcho('${BOLD}${CYAN}' + SEPARATOR + '${RESET}'),
    bashEcho(`\${BOLD}\${CYAN}  Task Pulse — ${escapeShell(groupName)}\${RESET}`),
    bashEcho(`\${DIM}  ${total} command(s) queued\${RESET}`),
    bashEcho('${BOLD}${CYAN}' + SEPARATOR + '${RESET}'),
    bashEcho(""),
  ];

  const steps = commands.flatMap((cmd, i) =>
    bashStepBlock(cmd, i + 1, total, stopOnError, i === commands.length - 1)
  );

  const footer: string[] = [
    "", ...bashSummaryBlock(), "",
    "if [ $failed -gt 0 ]; then", "  exit 1", "fi",
  ];

  return [...header, ...steps, ...footer].join("\n");
}

// ── PowerShell script builder (Windows) ──

function escapePowerShell(str: string): string {
  return str.replace(/'/g, "''");
}

function psWrite(msg: string): string {
  return `Write-Host "${msg}"`;
}

function psSummaryBlock(): string[] {
  return [
    "$totalElapsed = [math]::Round(((Get-Date) - $totalStart).TotalSeconds)",
    psWrite(`$([char]27)[1m$([char]27)[36m${SEPARATOR}$([char]27)[0m`),
    psWrite(`$([char]27)[1m  Task Pulse Summary$([char]27)[0m`),
    psWrite(`$([char]27)[1m$([char]27)[36m${SEPARATOR}$([char]27)[0m`),
    psWrite(`  $([char]27)[32mPassed:  $passed$([char]27)[0m`),
    psWrite(`  $([char]27)[31mFailed:  $failed$([char]27)[0m`),
    psWrite(`  $([char]27)[33mSkipped: $skipped$([char]27)[0m`),
    psWrite(`  $([char]27)[2mTotal time: $($totalElapsed)s$([char]27)[0m`),
    psWrite(`$([char]27)[1m$([char]27)[36m${SEPARATOR}$([char]27)[0m`),
    psWrite(""),
  ];
}

function psStepBlock(cmd: string, step: number, total: number, stopOnError: boolean, isLast: boolean): string[] {
  const escaped = escapePowerShell(cmd);
  const remaining = total - step;
  const lines: string[] = [
    psWrite(`$([char]27)[1m$([char]27)[36m${DIVIDER}$([char]27)[0m`),
    psWrite(`$([char]27)[1m  Step ${step}/${total}: $([char]27)[33m${escaped}$([char]27)[0m`),
    psWrite(`$([char]27)[1m$([char]27)[36m${DIVIDER}$([char]27)[0m`),
    psWrite(""),
    "$stepStart = Get-Date",
    "",
    cmd,
    "$exitCode = $LASTEXITCODE",
    "if ($null -eq $exitCode) { $exitCode = 0 }",
    "",
    "$stepElapsed = [math]::Round(((Get-Date) - $stepStart).TotalSeconds)",
    psWrite(""),
    "if ($exitCode -eq 0) {",
    `  ${psWrite(`  $([char]27)[32m✓ Step ${step}/${total} passed$([char]27)[0m $([char]27)[2m($($stepElapsed)s)$([char]27)[0m`)}`,
    "  $passed++",
    "} else {",
    `  ${psWrite(`  $([char]27)[31m✗ Step ${step}/${total} failed (exit code $exitCode)$([char]27)[0m $([char]27)[2m($($stepElapsed)s)$([char]27)[0m`)}`,
    "  $failed++",
  ];

  if (stopOnError && !isLast) {
    lines.push(
      `  $skipped = ${remaining}`,
      `  ${psWrite("")}`,
      `  ${psWrite(`  $([char]27)[31m⛔ Stopping — stopOnError is enabled. ${remaining} command(s) skipped.$([char]27)[0m`)}`,
      `  ${psWrite("")}`,
      ...psSummaryBlock().map((l) => `  ${l}`),
      "  exit $exitCode"
    );
  }

  lines.push("}", psWrite(""));
  return lines;
}

function buildPowerShellScript(commands: string[], groupName: string, stopOnError: boolean): string {
  const total = commands.length;

  const header: string[] = [
    "$ErrorActionPreference = 'Continue'",
    "",
    "$passed = 0", "$failed = 0", "$skipped = 0",
    `$total = ${total}`,
    "",
    "$totalStart = Get-Date",
    "",
    psWrite(""),
    psWrite(`$([char]27)[1m$([char]27)[36m${SEPARATOR}$([char]27)[0m`),
    psWrite(`$([char]27)[1m$([char]27)[36m  Task Pulse — ${escapePowerShell(groupName)}$([char]27)[0m`),
    psWrite(`$([char]27)[2m  ${total} command(s) queued$([char]27)[0m`),
    psWrite(`$([char]27)[1m$([char]27)[36m${SEPARATOR}$([char]27)[0m`),
    psWrite(""),
  ];

  const steps = commands.flatMap((cmd, i) =>
    psStepBlock(cmd, i + 1, total, stopOnError, i === commands.length - 1)
  );

  const footer: string[] = [
    "", ...psSummaryBlock(), "",
    "if ($failed -gt 0) { exit 1 }",
  ];

  return [...header, ...steps, ...footer].join("\r\n");
}

// ── Terminal runner ──

function runInTerminal(commands: string[], groupName: string, config: TaskPulseConfig) {
  const ext = isWindows ? "ps1" : "sh";
  const scriptPath = path.join(os.tmpdir(), `taskpulse-${Date.now()}.${ext}`);
  const scriptContent = isWindows
    ? buildPowerShellScript(commands, groupName, config.stopOnError)
    : buildBashScript(commands, groupName, config.stopOnError);

  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  const terminal = vscode.window.createTerminal({
    name: `Task Pulse: ${groupName}`,
    cwd: getWorkspaceRoot(),
  });

  terminal.show();

  if (isWindows) {
    const cleanup = `Remove-Item -Force '${scriptPath}'`;
    const suffix = config.autoCloseTerminal ? `${cleanup}; Start-Sleep -Seconds 1; exit` : cleanup;
    terminal.sendText(`powershell -ExecutionPolicy Bypass -File '${scriptPath}'; ${suffix}`);
  } else {
    const cleanup = `rm -f '${scriptPath}'`;
    const suffix = config.autoCloseTerminal ? `${cleanup} ; sleep 1 ; exit` : cleanup;
    terminal.sendText(`bash '${scriptPath}' ; ${suffix}`);
  }
}

// ── Command handler ──

async function selectAndRun(config: TaskPulseConfig) {
  const groups = config.commandGroups;
  const groupNames = Object.keys(groups);

  if (groupNames.length === 0) {
    const action = await vscode.window.showWarningMessage(
      'No command groups configured. Add groups in "taskPulse.commandGroups" settings.',
      "Open Settings"
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand("workbench.action.openSettings", "taskPulse.commandGroups");
    }
    return;
  }

  if (groupNames.length === 1) {
    runInTerminal(groups[groupNames[0]], groupNames[0], config);
    return;
  }

  const selected = await vscode.window.showQuickPick(
    groupNames.map((name) => ({
      label: name,
      description: `${groups[name].length} command(s)`,
      detail: groups[name].join(" → "),
    })),
    {
      placeHolder: "Select a command group to run",
      matchOnDescription: true,
      matchOnDetail: true,
    }
  );

  if (selected) {
    runInTerminal(groups[selected.label], selected.label, config);
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("taskPulse.runGroup", () => selectAndRun(getConfig()))
  );
}

export function deactivate() { }
