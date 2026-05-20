# Contributing to SupraDash

Thank you for your interest in contributing to SupraDash! This document provides guidelines and instructions for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all backgrounds and experience levels.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/SupraDash.git
   cd SupraDash
   ```
3. **Set up upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/SupraDash.git
   ```
4. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

### Prerequisites

- GNOME Shell 50+ (preferably on a development machine or VM)
- GJS (GNOME JavaScript) runtime
- GTK4 / libadwaita development libraries
- `glib-compile-schemas` tool

### Installation for Development

```bash
# Install to local extensions directory
make install

# Or manually:
mkdir -p ~/.local/share/gnome-shell/extensions/SupraDash@local
cp -r * ~/.local/share/gnome-shell/extensions/SupraDash@local/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/SupraDash@local/schemas/
```

### Testing Changes

1. **Enable debug mode** in preferences
2. **View logs**:
   ```bash
   journalctl -f | grep -i "SupraDash"
   ```
3. **Reload extension** after changes:
   - On X11: `Alt+F2`, type `r`, press Enter
   - On Wayland: Log out and log back in, or use:
     ```bash
     gnome-extensions disable SupraDash@local
     gnome-extensions enable SupraDash@local
     ```

## Coding Standards

### JavaScript/GJS Style

- Use **ES6+ features** (const/let, arrow functions, template strings)
- Follow **GNOME JavaScript coding style**
- Use **JSDoc comments** for documentation
- Maximum line length: **100 characters**

### File Organization

```javascript
// Imports first (GI imports, then local imports)
const GLib = imports.gi.GLib;
const St = imports.gi.St;

import * as Debug from './debug.js';

// Constants
const MY_CONSTANT = 'value';

// Private variables (prefix with _)
let _privateVar = null;

// Public API (exported functions/classes)
export function publicFunction() {
    // Implementation
}

export class MyClass {
    constructor() {
        // Private properties (prefix with _)
        this._myProperty = null;
    }
    
    // Public methods
    publicMethod() {
        // Implementation
    }
    
    // Private methods (prefix with _)
    _privateMethod() {
        // Implementation
    }
}
```

### Naming Conventions

- **Classes**: PascalCase (`DockContainer`, `WindowTracker`)
- **Functions/Methods**: camelCase (`updateLayout`, `_render`)
- **Constants**: UPPER_SNAKE_CASE (`ICON_SIZE`, `DEFAULT_MARGIN`)
- **Private members**: Prefix with underscore (`_dock`, `_settings`)
- **Files**: lowercase with hyphens (`dock.js`, `window-tracker.js`)

### Documentation

All public APIs must have JSDoc comments:

```javascript
/**
 * Create an icon actor for an application
 * @param {string} appId - Application ID
 * @param {object} appInfo - App info from model
 * @returns {St.Button|null} Icon button actor
 */
_createAppIcon(appId, appInfo) {
    // Implementation
}
```

### Error Handling

- Use **try/catch** for operations that may fail
- Log errors with context using `Debug.logException()`
- Provide **fallbacks** when possible
- Never silently swallow errors

```javascript
try {
    const result = riskyOperation();
} catch (e) {
    Debug.logException(e, 'Failed to perform operation');
    // Provide fallback or graceful degradation
}
```

### Signal Management

- **Track all signal connections** for cleanup
- **Disconnect signals** in `disable()` method
- Use helper functions for safe disconnection

```javascript
// In enable():
this._signals.push(
    display.connect('window-created', (disp, win) => this._onWindowCreated(win))
);

// In disable():
for (const signal of this._signals) {
    Utils.safeDisconnect(global.display, signal);
}
this._signals = [];
```

## Pull Request Process

### Before Submitting

1. **Test thoroughly** on GNOME Shell 50+
2. **Run validation**:
   ```bash
   make lint
   make validate-schema
   ```
3. **Update documentation** if needed
4. **Add tests** if applicable

### PR Checklist

- [ ] Code follows coding standards
- [ ] All new code is documented (JSDoc)
- [ ] No console.log() calls (use Debug module)
- [ ] Signals are properly disconnected
- [ ] Tested on GNOME Shell 50+
- [ ] Updated README.md if needed
- [ ] Added entry to CHANGELOG.md

### Review Process

1. Maintainers will review your PR within 7 days
2. Address any feedback or requested changes
3. Once approved, your PR will be merged

## Reporting Issues

### Bug Reports

Include the following information:

- **GNOME Shell version**: `gnome-shell --version`
- **Session type**: Wayland or X11
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Logs**: `journalctl -f | grep -i "SupraDash"`
- **Screenshots** if applicable

### Feature Requests

- Describe the **problem** you're trying to solve
- Explain the **proposed solution**
- Mention any **alternatives** you've considered
- Indicate if you're willing to **implement** it

## Architecture Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

### Key Modules

- **`extension.js`**: Entry point, orchestration
- **`prefs.js`**: Preferences UI
- **`lib/model.js`**: State management (MVC Model)
- **`lib/dock.js`**: UI rendering (MVC View)
- **`lib/tracker.js`**: Window tracking (MVC Controller)
- **`lib/debug.js`**: Logging utilities
- **`lib/utils.js`**: Helper functions

## Questions?

Feel free to open an issue for any questions about contributing. We're here to help!

---

**Thank you for contributing to SupraDash! 🎉**
