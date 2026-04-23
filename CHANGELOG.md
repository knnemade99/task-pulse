# Change Log

All notable changes to the "task-pulse" extension will be documented in this file.

## [0.0.2] - 2026-04-23

### Changed
- Renamed display name from "TaskPulse" to "Task Pulse"
- Added cross-platform support (Windows via PowerShell, macOS/Linux via Bash)

## [0.0.1] - 2026-04-23

### Added
- Initial release
- Named command groups via `taskPulse.commandGroups` setting
- Sequential command execution with live terminal output
- Colored step-by-step progress indicators (running, passed, failed)
- Summary report with passed/failed/skipped counts and total elapsed time
- `Task Pulse: Run Command Group` command with quick-pick selector
- `Cmd+Shift+R` / `Ctrl+Shift+R` keyboard shortcut
- `taskPulse.stopOnError` setting to halt on first failure
- `taskPulse.autoCloseTerminal` setting to auto-close terminal after completion
- Auto-cleanup of temporary script files after execution
