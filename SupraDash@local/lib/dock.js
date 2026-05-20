/**
 * SupraDash Dock Container Module
 * Main dock UI: layout, rendering, auto-shrink, positioning
 */

const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Meta = imports.gi.Meta;

import * as Debug from './debug.js';
import * as Utils from './utils.js';
import * as Model from './model.js';

/**
 * Dock Container - Main dock UI component
 */
export class DockContainer {
    constructor(settings, model) {
        this._settings = settings;
        this._model = model;
        
        // Main dock actor
        this._dock = null;
        this._boxLayout = null;
        
        // Icon actors cache
        this._iconActors = new Map();
        
        // Separator actors
        this._separators = new Map();
        
        // Configuration
        this._iconSize = 48;
        this._minIconSize = 24;
        this._autoShrink = true;
        this._position = 'BOTTOM';
        this._margin = 8;
        this._showSeparators = true;
        
        // Current scale for auto-shrink
        this._currentScale = 1.0;
        
        // Debounced recalculation
        this._recalculateLayout = Utils.debounce(() => {
            this._updateLayout();
        }, 50);
        
        // Load initial configuration
        this._loadSettings();
    }
    
    /**
     * Load settings configuration
     */
    _loadSettings() {
        if (this._settings) {
            this._iconSize = this._settings.get_int('icon-size');
            this._minIconSize = this._settings.get_int('min-icon-size');
            this._autoShrink = this._settings.get_boolean('auto-shrink');
            this._position = this._settings.get_string('dock-position');
            this._margin = this._settings.get_int('dock-margin');
            this._showSeparators = this._settings.get_boolean('separator-visible');
            
            // Connect to settings changes
            this._settings.connect('changed::icon-size', () => {
                this._iconSize = this._settings.get_int('icon-size');
                this._recalculateLayout();
            });
            
            this._settings.connect('changed::min-icon-size', () => {
                this._minIconSize = this._settings.get_int('min-icon-size');
                this._recalculateLayout();
            });
            
            this._settings.connect('changed::auto-shrink', () => {
                this._autoShrink = this._settings.get_boolean('auto-shrink');
                this._recalculateLayout();
            });
            
            this._settings.connect('changed::dock-position', () => {
                this._position = this._settings.get_string('dock-position');
                this._recalculateLayout();
            });
            
            this._settings.connect('changed::dock-margin', () => {
                this._margin = this._settings.get_int('dock-margin');
                this._recalculateLayout();
            });
            
            this._settings.connect('changed::separator-visible', () => {
                this._showSeparators = this._settings.get_boolean('separator-visible');
                this._updateSeparatorVisibility();
            });
        }
    }
    
    /**
     * Create the dock UI
     */
    enable() {
        Debug.info('DockContainer enabled');
        
        // Create main dock container
        this._dock = new St.BoxLayout({
            name: 'SupraDash',
            style_class: 'supradash-dock',
            reactive: true,
            x_expand: false,
            y_expand: false
        });
        
        // Add background styling
        this._dock.add_style_class_name('dock-background');
        
        // Create inner box layout for icons
        this._boxLayout = new St.BoxLayout({
            name: 'SupraDashBox',
            style_class: 'supradash-box',
            reactive: true,
            x_expand: true,
            y_expand: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER
        });
        
        this._dock.add_child(this._boxLayout);
        
        // Position the dock
        this._updatePosition();
        
        // Add to Chrome (GNOME Shell's layer management)
        if (Main.layoutManager) {
            Main.layoutManager.addChrome(this._dock);
        }
        
        // Initial render
        this._render();
        
        // Connect to monitor changes
        if (Main.layoutManager) {
            this._monitorChangedId = Main.layoutManager.connect('monitors-changed', () => {
                Debug.debug('Monitors changed, recalculating layout');
                this._recalculateLayout();
            });
        }
    }
    
    /**
     * Destroy the dock UI
     */
    disable() {
        Debug.info('DockContainer disabled');
        
        // Disconnect monitor signal
        if (this._monitorChangedId && Main.layoutManager) {
            Utils.safeDisconnect(Main.layoutManager, this._monitorChangedId);
            this._monitorChangedId = null;
        }
        
        // Remove from Chrome
        if (this._dock && Main.layoutManager) {
            Main.layoutManager.untrackChrome(this._dock);
            this._dock.destroy();
        }
        
        // Clear caches
        this._iconActors.clear();
        this._separators.clear();
        
        this._dock = null;
        this._boxLayout = null;
    }
    
    /**
     * Update dock position based on settings
     */
    _updatePosition() {
        if (!this._dock) return;
        
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;
        
        const workArea = monitor.workArea;
        
        // Set position based on configured edge
        switch (this._position) {
            case 'TOP':
                this._dock.set_position(
                    workArea.x + (workArea.width - this._dock.width) / 2,
                    workArea.y + this._margin
                );
                this._boxLayout.vertical = false;
                break;
                
            case 'BOTTOM':
                this._dock.set_position(
                    workArea.x + (workArea.width - this._dock.width) / 2,
                    workArea.y + workArea.height - this._dock.height - this._margin
                );
                this._boxLayout.vertical = false;
                break;
                
            case 'LEFT':
                this._dock.set_position(
                    workArea.x + this._margin,
                    workArea.y + (workArea.height - this._dock.height) / 2
                );
                this._boxLayout.vertical = true;
                break;
                
            case 'RIGHT':
                this._dock.set_position(
                    workArea.x + workArea.width - this._dock.width - this._margin,
                    workArea.y + (workArea.height - this._dock.height) / 2
                );
                this._boxLayout.vertical = true;
                break;
        }
    }
    
    /**
     * Render the dock content
     */
    _render() {
        if (!this._boxLayout) return;
        
        Debug.debug('Rendering dock');
        
        // Clear existing content
        this._boxLayout.remove_all_children();
        this._iconActors.clear();
        this._separators.clear();
        
        // Get apps from model
        const apps = this._model.getAllApps();
        
        let currentSection = null;
        let hasContentInCurrentSection = false;
        
        for (const app of apps) {
            // Check for section change
            if (app.section !== currentSection) {
                // Add separator if switching sections and both have content
                if (currentSection !== null && hasContentInCurrentSection && this._showSeparators) {
                    this._addSeparator();
                }
                
                currentSection = app.section;
                hasContentInCurrentSection = false;
            }
            
            // Create icon actor for app
            const iconActor = this._createAppIcon(app.id, app.info);
            if (iconActor) {
                this._boxLayout.add_child(iconActor);
                this._iconActors.set(app.id, iconActor);
                hasContentInCurrentSection = true;
            }
        }
        
        // Update layout and auto-shrink
        this._updateLayout();
    }
    
    /**
     * Create an icon actor for an application
     * @param {string} appId - Application ID
     * @param {object} appInfo - App info from model
     * @returns {St.Button|null} Icon button actor
     */
    _createAppIcon(appId, appInfo) {
        const button = new St.Button({
            style_class: 'supradash-app-icon',
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: appId,
            accessible_role: Clutter.RoleType.BUTTON
        });
        
        // Create icon
        const icon = Utils.createIconActor(appId, this._iconSize);
        button.set_child(icon);
        
        // Store app info for click handling
        button._appId = appId;
        button._appInfo = appInfo;
        
        // Connect click handler
        button.connect('clicked', () => this._onAppClicked(appId, appInfo));
        
        // Connect hover handlers for future features
        button.connect('notify::hover', () => this._onAppHover(button, appInfo));
        
        // Set accessible properties
        button.set_accessible_name(appId);
        
        Debug.debug(`Created icon for: ${appId}`);
        
        return button;
    }
    
    /**
     * Add a separator between sections
     */
    _addSeparator() {
        const separator = Utils.createSeparator(this._boxLayout.vertical, 2);
        separator.visible = this._showSeparators;
        this._boxLayout.add_child(separator);
        this._separators.set(this._separators.size, separator);
    }
    
    /**
     * Update separator visibility
     */
    _updateSeparatorVisibility() {
        for (const separator of this._separators.values()) {
            separator.visible = this._showSeparators;
        }
    }
    
    /**
     * Handle app icon click
     * @param {string} appId - Application ID
     * @param {object} appInfo - App info
     */
    _onAppClicked(appId, appInfo) {
        Debug.info(`App clicked: ${appId}, state: ${appInfo.state}`);
        
        const shellApp = Shell.AppSystem.get_default().lookup_app(appId);
        
        if (!shellApp) {
            // Try to launch via app ID
            Debug.debug(`Launching app directly: ${appId}`);
            try {
                const appInfo = Gio.DesktopAppInfo.new(`${appId}.desktop`);
                if (appInfo) {
                    appInfo.launch([], null);
                } else {
                    Debug.warn(`Could not find desktop file for: ${appId}`);
                }
            } catch (e) {
                Debug.error(`Failed to launch app: ${e.message}`);
            }
            return;
        }
        
        switch (appInfo.state) {
            case Model.AppState.CLOSED:
                // Launch the app
                shellApp.activate();
                break;
                
            case Model.AppState.OPEN_FOCUSED:
                // Minimize all windows
                const windows = this._model.getAppWindows(appId);
                for (const win of windows) {
                    win.minimize();
                }
                break;
                
            case Model.AppState.OPEN_NOT_FOCUSED:
            case Model.AppState.MINIMIZED:
                // Activate/restore windows
                const recentWindow = this._model.getMostRecentWindow(appId);
                if (recentWindow) {
                    const workspace = recentWindow.get_workspace();
                    workspace.activate_with_focus(recentWindow, global.get_current_time());
                    
                    // Restore if minimized
                    if (recentWindow.minimized) {
                        recentWindow.unminimize();
                    }
                } else {
                    shellApp.activate();
                }
                break;
        }
    }
    
    /**
     * Handle app icon hover
     * @param {St.Button} button - Button actor
     * @param {object} appInfo - App info
     */
    _onAppHover(button, appInfo) {
        // Placeholder for hover effects (tooltips, previews, etc.)
        if (button.hover) {
            Debug.debug(`Hovering: ${button._appId}`);
        }
    }
    
    /**
     * Update layout and apply auto-shrink
     */
    _updateLayout() {
        if (!this._dock || !this._boxLayout) return;
        
        // Update position
        this._updatePosition();
        
        // Apply auto-shrink if enabled
        if (this._autoShrink) {
            this._applyAutoShrink();
        } else {
            // Reset scale
            if (this._currentScale !== 1.0) {
                this._dock.set_scale(1.0, 1.0);
                this._currentScale = 1.0;
            }
        }
    }
    
    /**
     * Apply auto-shrink algorithm
     */
    _applyAutoShrink() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor) return;
        
        const workArea = monitor.workArea;
        const isVertical = this._boxLayout.vertical;
        
        // Calculate available space
        const availableSpace = isVertical ? workArea.height : workArea.width;
        const marginSpace = this._margin * 2;
        const maxDockSpace = availableSpace - marginSpace;
        
        // Calculate required space
        let totalRequiredSpace = 0;
        const children = this._boxLayout.get_children();
        
        for (const child of children) {
            if (child.visible) {
                const [minWidth, minHeight, natWidth, natHeight] = child.get_preferred_size();
                const iconSpacing = 8; // Spacing between icons
                
                if (isVertical) {
                    totalRequiredSpace += (natHeight || this._iconSize) + iconSpacing;
                } else {
                    totalRequiredSpace += (natWidth || this._iconSize) + iconSpacing;
                }
            }
        }
        
        // Calculate scale factor
        let targetScale = 1.0;
        if (totalRequiredSpace > maxDockSpace) {
            targetScale = Math.max(
                this._minIconSize / this._iconSize,
                maxDockSpace / totalRequiredSpace
            );
        }
        
        // Apply scale if changed
        if (Math.abs(targetScale - this._currentScale) > 0.01) {
            Debug.debug(`Auto-shrink: scale ${this._currentScale.toFixed(2)} -> ${targetScale.toFixed(2)}`);
            
            this._dock.ease({
                scaleX: targetScale,
                scaleY: targetScale,
                duration: 150,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });
            
            this._currentScale = targetScale;
        }
    }
    
    /**
     * Refresh the dock display
     */
    refresh() {
        Debug.debug('Refreshing dock');
        this._render();
    }
    
    /**
     * Get the dock actor
     * @returns {St.BoxLayout} Dock actor
     */
    getActor() {
        return this._dock;
    }
}
