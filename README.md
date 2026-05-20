# SupraDash - Native Dock for GNOME Shell 50+

[![GNOME Shell](https://img.shields.io/badge/GNOME_Shell-50%2B-blue)](https://gnome.org)
[![License](https://img.shields.io/badge/License-GPL--3.0-green)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.1.0-orange)]()

A native, autonomous, and resilient dock extension for GNOME Shell 50+ with Wayland-first support.

## ✨ Features

- **Native Implementation**: Built from scratch with Clutter/GTK, no dependencies on Dash-to-Dock or third-party libraries
- **Wayland-First**: Designed for modern GNOME Shell (50+) with full Wayland compatibility
- **Auto-Shrink**: Intelligently scales icons to fit available screen space
- **Smart Window Tracking**: Real-time synchronization with application windows
- **Configurable Sections**: System apps, pinned apps, and recent applications
- **Customizable**: Position, icon size, margins, and behavior options
- **Zero External Dependencies**: Completely self-contained extension

## 📋 Requirements

- GNOME Shell 50 or higher
- Wayland session (recommended) or X11
- GTK4 / libadwaita for preferences

## 🚀 Installation

### From Source (Development)

```bash
# Clone or copy to extensions directory
mkdir -p ~/.local/share/gnome-shell/extensions/SupraDash@local
cp -r * ~/.local/share/gnome-shell/extensions/SupraDash@local/

# Compile schemas
glib-compile-schemas ~/.local/share/gnome-shell/extensions/SupraDash@local/schemas/

# Enable extension
gnome-extensions enable SupraDash@local
```

### Using Makefile

```bash
# Install
make install

# Or package and manually install
make package
```

**Note**: On Wayland, you need to log out and log back in after first installation. After that, you can enable/disable without logging out.

## ⚙️ Configuration

Access preferences via:
- GNOME Extensions app → SupraDash → Settings
- Command line: `gnome-extensions prefs SupraDash@local`

### Options

#### Appearance
- **Icon Size**: Base icon size (16-128px)
- **Minimum Icon Size**: Minimum size when auto-shrinking
- **Dock Position**: Top, Bottom, Left, Right
- **Dock Margin**: Distance from screen edge
- **Show Separators**: Toggle section separators

#### Behavior
- **Auto-Shrink**: Automatically scale to fit available space
- **Workspace Filter**: Show windows from current or all workspaces
- **Recent Apps Limit**: Maximum number of recent apps to display

#### Debug
- **Debug Mode**: Enable verbose logging

## 🏗️ Architecture

```
SupraDash@local/
├── extension.js          # Extension entry point
├── prefs.js              # Preferences UI (GTK4/Adw)
├── metadata.json         # Extension metadata
├── schemas/              # GSettings schemas
│   └── org.gnome.shell.extensions.supradash.gschema.xml
├── lib/                  # Core modules
│   ├── debug.js          # Logging utilities
│   ├── utils.js          # Helper functions
│   ├── model.js          # State management (MVC Model)
│   ├── tracker.js        # Window tracking
│   └── dock.js           # Dock UI container
└── ui/                   # UI assets
    └── icons/            # Fallback icons
```

### MVC Pattern

- **Model** (`lib/model.js`): Manages application state, ordering, LRU cache
- **View** (`lib/dock.js`): Clutter actors, layout, rendering
- **Controller** (`extension.js`, `lib/tracker.js`): Signal handling, user input

## 🔧 Development

### Build Commands

```bash
make schemas          # Compile GSettings schemas
make package          # Create distribution .zip
make install          # Install to local extensions
make lint             # Run ESLint
make validate-schema  # Validate schema XML
make logs             # Follow extension logs
```

### Debugging

Enable debug mode in preferences, then view logs:

```bash
journalctl -f | grep -i "SupraDash"
```

### Project Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

## 📝 License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `make lint` and `make validate-schema`
5. Test in GNOME Shell 50+
6. Submit a pull request

## 🐛 Known Issues

- Thumbnails for minimized windows: Not yet implemented (planned for v0.3)
- Multi-monitor support: Basic support only (full support planned for v0.5)
- DING integration: Not yet implemented (planned for v0.3)

## 📅 Roadmap

- **v0.1.x** (Current): MVP with basic dock functionality
- **v0.2.x**: Window tracking, auto-shrink, struts
- **v0.3.x**: Polish, accessibility, debugging tools
- **v0.5.x**: Advanced features (drag & drop, menus, multi-monitor)
- **v1.0.0**: Stable release with full feature set

## 🙏 Acknowledgments

- GNOME Shell team for the excellent extension framework
- Dash-to-Dock for inspiration (though this is an independent implementation)
- GNOME community for support and feedback

---

**Built with ❤️ for the GNOME community**
