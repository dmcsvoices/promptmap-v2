# PromptMap V2

An enterprise-focused enhancement of [PromptMap](https://github.com/utkusen/promptmap) by Utku Sen.

## Credits

This project is built upon the excellent work of Utku Sen's PromptMap.
The core testing engine and vulnerability detection logic are based on
his original implementation.

**Original Project:** https://github.com/utkusen/promptmap
**Original Author:** Utku Sen ([@utkusen](https://github.com/utkusen))

## What's Different in V2

PromptMap V2 enhances the original with:
- Complete UI/UX redesign with modern React frontend
- Real-time data visualization and analytics
- Enterprise session management
- AI-powered result classification
- PostgreSQL database integration
- Enhanced configuration management

**Note:** This project was developed with assistance from Claude Code by Anthropic.

## License

GPL-3.0 (same as original PromptMap)

## Screenshots

### Dashboard
![Dashboard](docs/images/Dashboard.png)
*Main dashboard showing system status, API connectivity, and quick actions for creating sessions and configuring tests*

### System Prompts
![System Prompts](docs/images/SystemPrompts.png)
*System prompts management interface for testing prompt injection vulnerabilities with session selection and detailed prompt configuration*

### Tests
![Tests](docs/images/Tests.png)
*Test selection interface displaying available prompt injection tests with severity levels (high/medium/low) and attack categories (prompt stealing, distraction)*

### Test Results
![Test Results](docs/images/TestResults.png)
*Test results overview with visual analytics showing total tests, pass/fail rates, severity distribution charts, and average ASR (Attack Success Rate)*

### Test Results Detail
![Test Results Detail](docs/images/TestResults2.png)
*Detailed test results table showing individual test outcomes, severity levels, execution times, and pass rates for comprehensive analysis*

### Settings
![Settings](docs/images/Settings.png)
*Configuration panel for OpenAI-compliant endpoints, model selection, test execution settings, and AI-powered text classification options*
