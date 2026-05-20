/**
 * SupraDash Model Module
 * Manages the logical state of the dock: app ordering, limits, sections, LRU cache
 */

const GLib = imports.gi.GLib;

import * as Debug from './debug.js';
import * as Utils from './utils.js';

/**
 * Application states
 */
export const AppState = {
    CLOSED: 'closed',
    OPEN_NOT_FOCUSED: 'open_not_focused',
    OPEN_FOCUSED: 'open_focused',
    MINIMIZED: 'minimized'
};

/**
 * Dock sections
 */
export const Section = {
    SYSTEM: 'system',      // Files, Apps, Settings (fixed)
    PINNED: 'pinned',      // User-pinned applications
    RECENT: 'recent',      // Recently used applications
    RUNNING: 'running'     // Currently running applications
};

/**
 * Model for managing dock state
 */
export class DockModel {
    constructor(settings) {
        this._settings = settings;
        
        // Fixed system items
        this._systemApps = ['org.gnome.Nautilus.file-manager', 'org.gnome.Software', 'org.gnome.Settings'];
        
        // Pinned applications (user-defined)
        this._pinnedApps = new Set();
        
        // Running applications: Map<AppID, AppInfo>
        this._runningApps = new Map();
        
        // Recent applications (LRU order)
        this._recentApps = [];
        
        // Window tracking: Map<AppID, [MetaWindow, ...]>
        this._appWindows = new Map();
        
        // Minimized windows: Set<MetaWindow>
        this._minimizedWindows = new Set();
        
        // Current workspace filter
        this._workspaceFilter = 'current';
        
        // Limits
        this._recentAppsLimit = 5;
        
        // Load saved pinned apps
        this._loadPinnedApps();
        
        // Connect to settings changes
        if (this._settings) {
            this._settings.connect('changed::recent-apps-limit', () => {
                this._recentAppsLimit = this._settings.get_int('recent-apps-limit');
                this._trimRecentApps();
            });
            
            this._settings.connect('changed::workspace-filter', () => {
                this._workspaceFilter = this._settings.get_string('workspace-filter');
            });
        }
    }
    
    /**
     * Load pinned apps from settings
     */
    _loadPinnedApps() {
        if (this._settings) {
            try {
                const pinned = this._settings.get_strv('pinned-apps');
                this._pinnedApps = new Set(pinned);
            } catch (e) {
                Debug.warn('Could not load pinned apps:', e.message);
            }
        }
    }
    
    /**
     * Save pinned apps to settings
     */
    _savePinnedApps() {
        if (this._settings) {
            try {
                this._settings.set_strv('pinned-apps', Array.from(this._pinnedApps));
            } catch (e) {
                Debug.error('Could not save pinned apps:', e.message);
            }
        }
    }
    
    /**
     * Add or update a running application
     * @param {string} appId - Application ID
     * @param {Meta.Window} window - Window instance
     */
    addRunningApp(appId, window) {
        if (!appId) {
            Debug.warn('Attempted to add app with null ID');
            return;
        }
        
        // Initialize app windows array if needed
        if (!this._appWindows.has(appId)) {
            this._appWindows.set(appId, []);
        }
        
        const windows = this._appWindows.get(appId);
        
        // Avoid duplicates
        if (!windows.includes(window)) {
            windows.push(window);
        }
        
        // Update running apps info
        if (!this._runningApps.has(appId)) {
            this._runningApps.set(appId, {
                id: appId,
                state: AppState.OPEN_NOT_FOCUSED,
                windows: windows,
                lastActive: Date.now()
            });
        } else {
            const appInfo = this._runningApps.get(appId);
            appInfo.windows = windows;
            appInfo.lastActive = Date.now();
        }
        
        // Add to recent apps if not pinned
        if (!this._pinnedApps.has(appId)) {
            this._addToRecent(appId);
        }
        
        Debug.debug(`Added running app: ${appId}`);
    }
    
    /**
     * Remove a running application
     * @param {string} appId - Application ID
     * @param {Meta.Window} window - Optional specific window to remove
     */
    removeRunningApp(appId, window = null) {
        if (!appId) {
            return;
        }
        
        if (window) {
            // Remove specific window
            const windows = this._appWindows.get(appId);
            if (windows) {
                const index = windows.indexOf(window);
                if (index > -1) {
                    windows.splice(index, 1);
                    
                    // Remove from minimized set
                    this._minimizedWindows.delete(window);
                }
                
                // If no windows left, remove app entirely
                if (windows.length === 0) {
                    this._appWindows.delete(appId);
                    this._runningApps.delete(appId);
                    Debug.debug(`Removed app (no windows): ${appId}`);
                } else {
                    Debug.debug(`Removed window from app: ${appId}`);
                }
            }
        } else {
            // Remove all windows for this app
            const windows = this._appWindows.get(appId);
            if (windows) {
                windows.forEach(w => this._minimizedWindows.delete(w));
            }
            this._appWindows.delete(appId);
            this._runningApps.delete(appId);
            Debug.debug(`Removed app (all windows): ${appId}`);
        }
    }
    
    /**
     * Update focus state for an application
     * @param {string} appId - Application ID
     * @param {boolean} focused - Whether the app is focused
     */
    updateFocusState(appId, focused) {
        const appInfo = this._runningApps.get(appId);
        if (appInfo) {
            appInfo.state = focused ? AppState.OPEN_FOCUSED : AppState.OPEN_NOT_FOCUSED;
            appInfo.lastActive = Date.now();
            
            // Move to front of recent apps
            if (!this._pinnedApps.has(appId)) {
                this._addToRecent(appId);
            }
        }
    }
    
    /**
     * Update minimized state for a window
     * @param {Meta.Window} window - Window instance
     * @param {boolean} minimized - Whether the window is minimized
     */
    updateMinimizedState(window, minimized) {
        const appId = Utils.getAppIdFromWindow(window);
        if (!appId) {
            return;
        }
        
        if (minimized) {
            this._minimizedWindows.add(window);
            
            const appInfo = this._runningApps.get(appId);
            if (appInfo) {
                // Check if all windows are minimized
                const allMinimized = appInfo.windows.every(w => this._minimizedWindows.has(w));
                appInfo.state = allMinimized ? AppState.MINIMIZED : AppState.OPEN_NOT_FOCUSED;
            }
        } else {
            this._minimizedWindows.delete(window);
            
            const appInfo = this._runningApps.get(appId);
            if (appInfo) {
                appInfo.state = AppState.OPEN_NOT_FOCUSED;
            }
        }
    }
    
    /**
     * Add app to recent list (LRU)
     * @param {string} appId - Application ID
     */
    _addToRecent(appId) {
        // Remove if already in list
        const index = this._recentApps.indexOf(appId);
        if (index > -1) {
            this._recentApps.splice(index, 1);
        }
        
        // Add to front
        this._recentApps.unshift(appId);
        
        // Trim to limit
        this._trimRecentApps();
    }
    
    /**
     * Trim recent apps to configured limit
     */
    _trimRecentApps() {
        while (this._recentApps.length > this._recentAppsLimit) {
            this._recentApps.pop();
        }
    }
    
    /**
     * Pin an application
     * @param {string} appId - Application ID
     */
    pinApp(appId) {
        if (!this._pinnedApps.has(appId)) {
            this._pinnedApps.add(appId);
            this._savePinnedApps();
            Debug.info(`Pinned app: ${appId}`);
        }
    }
    
    /**
     * Unpin an application
     * @param {string} appId - Application ID
     */
    unpinApp(appId) {
        if (this._pinnedApps.has(appId)) {
            this._pinnedApps.delete(appId);
            this._savePinnedApps();
            Debug.info(`Unpinned app: ${appId}`);
        }
    }
    
    /**
     * Check if an app is pinned
     * @param {string} appId - Application ID
     * @returns {boolean} True if app is pinned
     */
    isPinned(appId) {
        return this._pinnedApps.has(appId);
    }
    
    /**
     * Get all apps for dock rendering in order
     * @returns {Array} Array of app info objects
     */
    getAllApps() {
        const apps = [];
        
        // System apps (fixed)
        for (const sysApp of this._systemApps) {
            apps.push({
                id: sysApp,
                section: Section.SYSTEM,
                info: this._runningApps.get(sysApp) || { id: sysApp, state: AppState.CLOSED }
            });
        }
        
        // Pinned apps
        for (const appId of this._pinnedApps) {
            if (!apps.find(a => a.id === appId)) {
                apps.push({
                    id: appId,
                    section: Section.PINNED,
                    info: this._runningApps.get(appId) || { id: appId, state: AppState.CLOSED }
                });
            }
        }
        
        // Recent apps (not pinned, not system)
        const excludeIds = new Set([...this._pinnedApps, ...this._systemApps]);
        for (const appId of this._recentApps) {
            if (!excludeIds.has(appId) && this._runningApps.has(appId)) {
                apps.push({
                    id: appId,
                    section: Section.RECENT,
                    info: this._runningApps.get(appId)
                });
            }
        }
        
        return apps;
    }
    
    /**
     * Get windows for an app filtered by workspace
     * @param {string} appId - Application ID
     * @returns {Array} Array of MetaWindow instances
     */
    getAppWindows(appId) {
        const windows = this._appWindows.get(appId) || [];
        
        if (this._workspaceFilter === 'current') {
            const currentWorkspace = global.workspace_manager.get_active_workspace_index();
            return windows.filter(w => w.get_workspace().index() === currentWorkspace);
        }
        
        return windows;
    }
    
    /**
     * Get most recently active window for an app
     * @param {string} appId - Application ID
     * @returns {Meta.Window|null} Most recent window or null
     */
    getMostRecentWindow(appId) {
        const windows = this.getAppWindows(appId);
        if (windows.length === 0) {
            return null;
        }
        
        // Return the most recently active window
        return windows[windows.length - 1];
    }
    
    /**
     * Check if an app has any minimized windows
     * @param {string} appId - Application ID
     * @returns {boolean} True if app has minimized windows
     */
    hasMinimizedWindows(appId) {
        const windows = this._appWindows.get(appId) || [];
        return windows.some(w => this._minimizedWindows.has(w));
    }
    
    /**
     * Get all minimized windows for an app
     * @param {string} appId - Application ID
     * @returns {Array} Array of minimized MetaWindow instances
     */
    getMinimizedWindows(appId) {
        const windows = this._appWindows.get(appId) || [];
        return windows.filter(w => this._minimizedWindows.has(w));
    }
    
    /**
     * Clear all state (for disable)
     */
    clear() {
        this._runningApps.clear();
        this._appWindows.clear();
        this._minimizedWindows.clear();
        this._recentApps = [];
    }
}
