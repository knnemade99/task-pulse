# Task Pulse

A VS Code / Cursor extension that runs a configurable series of terminal commands **sequentially** — with live step-by-step output, colored progress indicators, and a summary report right in the integrated terminal.

## Features

- **Multiple command sets** — create as many named groups as you need (build, test, deploy, etc.), each containing its own list of commands
- **Sequential execution** — each command waits for the previous one to finish before starting the next
- **Live terminal output** — see every command's real-time output directly in the terminal, not hidden in a background process
- **Quick-pick selector** — choose which command group to run from a quick-pick menu
- **Colored step-by-step progress** — clear visual indicators for each step:
  - Cyan headers with step number and command name
  - Green checkmark for passed steps
  - Red cross for failed steps with exit code
- **Stop on error** — optionally halt the entire sequence if any step fails, with a count of skipped commands
- **Auto-close terminal** — automatically closes the terminal after completion (with a brief delay to view the summary)
- **Summary report** — see total passed, failed, skipped counts and elapsed time at the end of every run
- **Cross-platform** — works on macOS, Windows, and Linux

## Extension Settings

| Setting                       | Type      | Default                                      | Description                                                                                   |
| ----------------------------- | --------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `taskPulse.commandGroups`     | `object`  | `{"greet": ["echo Welcome to Task Pulse!"]}` | Named groups of commands to run sequentially. e.g. `"greet": ["echo Welcome to Task Pulse!"]` |
| `taskPulse.stopOnError`       | `boolean` | `true`                                       | Stop executing remaining commands if one fails.                                               |
| `taskPulse.autoCloseTerminal` | `boolean` | `true`                                       | Automatically close the terminal after all commands complete.                                 |

### Configuring Command Groups

1. Open Settings (`Cmd+,` / `Ctrl+,`)
2. Search for `taskPulse.commandGroups`
3. Add your groups

Or add directly to your `settings.json`:

```json
{
  "taskPulse.commandGroups": {
    "greet": ["echo Welcome to Task Pulse!"]
  }
}
```

## Commands

| Command                         | Keybinding                     | Description                             |
| ------------------------------- | ------------------------------ | --------------------------------------- |
| `Task Pulse: Run Command Group` | `Cmd+Shift+R` / `Ctrl+Shift+R` | Pick and run a configured command group |

## Known Issues

None at this time. If you run into problems, please open an issue in the repository.

## Release Notes

### 0.0.2

- Renamed display name to "Task Pulse"
- Added cross-platform support (Windows via PowerShell, macOS/Linux via Bash)

### 0.0.1

- Initial release
- Named command groups via `taskPulse.commandGroups` setting
- Sequential command execution with live terminal output
- Colored step-by-step progress indicators (running, passed, failed)
- Summary report with passed/failed/skipped counts and total elapsed time
- `Cmd+Shift+R` / `Ctrl+Shift+R` keyboard shortcut
- `taskPulse.stopOnError` setting to halt on first failure
- `taskPulse.autoCloseTerminal` setting to auto-close terminal after completion
- Auto-cleanup of temporary script files after execution

---

Enjoy coding with Task Pulse!
