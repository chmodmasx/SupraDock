/**
 * SupraDash Utility Module
 * Common helper functions used throughout the extension
 */

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;

import * as Debug from './debug.js';

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, delay) {
    let timeoutId = null;
    
    return function(...args) {
        if (timeoutId !== null) {
            GLib.Source.remove(timeoutId);
        }
        
        timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            func.apply(this, args);
            timeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    };
}

/**
 * Throttle a function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle = false;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, limit, () => {
                inThrottle = false;
                return GLib.SOURCE_REMOVE;
            });
        }
    };
}

/**
 * Get icon from GTK icon theme with fallback
 * @param {string} iconName - Name of the icon
 * @param {number} size - Size of the icon in pixels
 * @returns {Gio.Icon|null} Icon object or null if not found
 */
export function getIcon(iconName, size = 48) {
    const iconTheme = Gtk.IconTheme.get_default();
    
    if (!iconTheme) {
        Debug.warn('Icon theme not available');
        return null;
    }
    
    // Try to look up the icon
    if (iconTheme.has_icon(iconName)) {
        return Gio.ThemedIcon.new(iconName);
    }
    
    // Fallback icons
    const fallbacks = ['application-x-executable', 'text-x-generic', 'folder'];
    for (const fallback of fallbacks) {
        if (iconTheme.has_icon(fallback)) {
            Debug.debug(`Using fallback icon: ${fallback}`);
            return Gio.ThemedIcon.new(fallback);
        }
    }
    
    Debug.warn(`Icon not found: ${iconName}`);
    return null;
}

/**
 * Create an St.Icon actor
 * @param {string} iconName - Name of the icon
 * @param {number} size - Size of the icon in pixels
 * @param {object} params - Additional parameters for St.Icon
 * @returns {St.Icon} Icon actor
 */
export function createIconActor(iconName, size = 48, params = {}) {
    const icon = new St.Icon({
        iconSize: size,
        ...params
    });
    
    const gicon = getIcon(iconName, size);
    if (gicon) {
        icon.gicon = gicon;
    } else {
        icon.iconName = 'image-missing';
    }
    
    return icon;
}

/**
 * Safely disconnect a signal
 * @param {object} object - Object with signal connection
 * @param {number} signalId - Signal connection ID
 */
export function safeDisconnect(object, signalId) {
    if (object && signalId > 0) {
        try {
            object.disconnect(signalId);
        } catch (e) {
            Debug.debug(`Signal already disconnected: ${e.message}`);
        }
    }
}

/**
 * Remove a GLib timeout source safely
 * @param {number} sourceId - Source ID to remove
 */
export function safeRemoveSource(sourceId) {
    if (sourceId > 0) {
        try {
            GLib.Source.remove(sourceId);
        } catch (e) {
            Debug.debug(`Source already removed: ${e.message}`);
        }
    }
}

/**
 * Get the current workspace index
 * @returns {number} Current workspace index
 */
export function getCurrentWorkspace() {
    const workspaceManager = global.workspace_manager;
    return workspaceManager.get_active_workspace_index();
}

/**
 * Check if a window should be shown in the dock
 * @param {Meta.Window} window - Window to check
 * @returns {boolean} True if window should be shown
 */
export function isWindowRelevant(window) {
    if (!window) {
        return false;
    }
    
    // Skip windows that should not appear in taskbar
    if (window.is_skip_taskbar()) {
        return false;
    }
    
    // Skip windows without app ID
    const app = window.get_app();
    if (!app) {
        return false;
    }
    
    return true;
}

/**
 * Get app ID from a window
 * @param {Meta.Window} window - Window to get app ID from
 * @returns {string|null} App ID or null
 */
export function getAppIdFromWindow(window) {
    const app = window.get_app();
    if (app) {
        return app.get_id();
    }
    return null;
}

/**
 * Create a separator actor
 * @param {boolean} vertical - Whether separator is vertical
 * @param {number} size - Size of the separator
 * @returns {St.Widget} Separator widget
 */
export function createSeparator(vertical = false, size = 1) {
    const separator = new St.Widget({
        style_class: 'supradash-separator',
        width: vertical ? size : -1,
        height: vertical ? -1 : size,
        x_expand: vertical ? false : true,
        y_expand: vertical ? true : false
    });
    
    separator.add_style_class_name(vertical ? 'vertical' : 'horizontal');
    
    return separator;
}

/**
 * Parse a color string to Clutter.Color
 * @param {string} colorStr - Color string (hex, rgb, rgba)
 * @returns {Clutter.Color} Parsed color
 */
export function parseColor(colorStr) {
    const color = new Clutter.Color();
    
    if (color.parse(colorStr)) {
        return color;
    }
    
    // Default to transparent
    return Clutter.Color.fromPixel(0x00000000);
}

/**
 * Get monitor work area
 * @param {number} monitorIndex - Monitor index
 * @returns {object} Work area with x, y, width, height
 */
export function getMonitorWorkArea(monitorIndex = 0) {
    const monitor = Main.layoutManager.monitors[monitorIndex];
    if (monitor) {
        return {
            x: monitor.workArea.x,
            y: monitor.workArea.y,
            width: monitor.workArea.width,
            height: monitor.workArea.height
        };
    }
    
    // Fallback to primary monitor
    return {
        x: 0,
        y: 0,
        width: global.display.get_screen_rectangle().width,
        height: global.display.get_screen_rectangle().height
    };
}

/**
 * WeakMap-based cache for object associations
 */
export class WeakCache {
    constructor() {
        this._cache = new WeakMap();
    }
    
    set(key, value) {
        this._cache.set(key, value);
    }
    
    get(key) {
        return this._cache.get(key);
    }
    
    has(key) {
        return this._cache.has(key);
    }
    
    delete(key) {
        this._cache.delete(key);
    }
}
