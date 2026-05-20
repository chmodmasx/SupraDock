# SupraDash Makefile
# Build, test, and package the extension

UUID = SupraDash@local
VERSION = 0.1.0
SCHEMAS_DIR = schemas

.PHONY: all clean package install schemas lint help

all: schemas help

# Compile GSettings schemas
schemas:
	@echo "Compiling GSettings schemas..."
	glib-compile-schemas $(SCHEMAS_DIR)/

# Clean compiled schemas
clean-schemas:
	@echo "Cleaning compiled schemas..."
	rm -f $(SCHEMAS_DIR)/gschemas.compiled

# Create distribution package
package: schemas
	@echo "Creating extension package..."
	@mkdir -p dist
	@zip -r dist/$(UUID)-$(VERSION).zip \
		$(UUID)/extension.js \
		$(UUID)/prefs.js \
		$(UUID)/metadata.json \
		$(UUID)/schemas/*.xml \
		$(UUID)/schemas/gschemas.compiled \
		$(UUID)/lib/*.js \
		$(UUID)/ui/*
	@echo "Package created: dist/$(UUID)-$(VERSION).zip"

# Install to local extensions directory
install: schemas
	@echo "Installing extension..."
	@mkdir -p ~/.local/share/gnome-shell/extensions/$(UUID)/
	@cp -r $(UUID)/* ~/.local/share/gnome-shell/extensions/$(UUID)/
	@echo "Extension installed. Please restart GNOME Shell (Alt+F2, 'r', Enter on X11 or logout/login on Wayland)"

# Uninstall from local extensions directory
uninstall:
	@echo "Uninstalling extension..."
	rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)/
	@echo "Extension uninstalled. Please restart GNOME Shell."

# Run ESLint (if available)
lint:
	@echo "Running linter..."
	@if command -v eslint >/dev/null 2>&1; then \
		eslint --no-eslintrc --parser-options=ecmaVersion:2022,sourceType:module \
			--env browser --env es6 \
			$(UUID)/extension.js \
			$(UUID)/prefs.js \
			$(UUID)/lib/*.js; \
	else \
		echo "ESLint not found. Install with: npm install -g eslint"; \
	fi

# Validate schema XML
validate-schema:
	@echo "Validating schema XML..."
	@if command -v xmllint >/dev/null 2>&1; then \
		xmllint --noout $(SCHEMAS_DIR)/*.xml; \
		echo "Schema validation passed."; \
	else \
		echo "xmllint not found. Install with: apt-get install libxml2-utils"; \
	fi

# Enable extension
enable:
	@echo "Enabling extension..."
	gnome-extensions enable $(UUID)

# Disable extension
disable:
	@echo "Disabling extension..."
	gnome-extensions disable $(UUID)

# Reload extension (disable + enable)
reload: disable enable
	@echo "Extension reloaded."

# Show extension logs
logs:
	journalctl -f | grep -i "SupraDash"

# Show help
help:
	@echo "SupraDash Build Commands:"
	@echo "  make schemas      - Compile GSettings schemas"
	@echo "  make package      - Create distribution .zip file"
	@echo "  make install      - Install to local extensions directory"
	@echo "  make uninstall    - Remove from local extensions directory"
	@echo "  make lint         - Run ESLint"
	@echo "  make validate-schema - Validate schema XML"
	@echo "  make enable       - Enable the extension"
	@echo "  make disable      - Disable the extension"
	@echo "  make reload       - Reload the extension"
	@echo "  make logs         - Follow extension logs"
	@echo "  make clean        - Clean build artifacts"
