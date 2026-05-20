/**
 * SupraDash Window Tracker Module
 * Tracks window creation, destruction, focus changes, and minimization
 */

const GLib = imports.gi.GLib;
const Meta = imports.gi.Meta;

import * as Debug from './debug.js';
import * as Utils from './utils.js';

/**
 * Window Tracker - Monitors system window events
 */
export class WindowTracker {
    constructor(model, onUpdateCallback) {
        this._model = model;
        this._onUpdateCallback = onUpdateCallback;
        
        // Signal connections
        this._signals = [];
        
        // Existing windows cache
        this._trackedWindows = new Set();
        
        // Debounced update callback
        this._debouncedUpdate = Utils.debounce(() => {
            if (this._onUpdateCallback) {
                this._onUpdateCallback();
            }
        }, 50);
    }
    
    /**
     * Start tracking windows
     */
    enable() {
        Debug.info('WindowTracker enabled');
        
        const display = global.display;
        
        // Connect to window signals
        this._signals.push(
            display.connect('window-created', (disp, win) => this._onWindowCreated(win)),
            display.connect('window-removed', (disp, win) => this._onWindowRemoved(win)),
            display.connect('notify::focus-window', () => this._onFocusChanged()),
            display.connect('window-entered-monitor', (disp, idx, win) => this._onWindowMoved(win)),
            display.connect('window-left-monitor', (disp, idx, win) => this._onWindowMoved(win))
        );
        
        // Connect to workspace manager signals
        const workspaceManager = global.workspace_manager;
        this._signals.push(
            workspaceManager.connect('active-workspace-changed', () => this._onWorkspaceChanged())
        );
        
        // Track existing windows
        this._trackExistingWindows();
    }
    
    /**
     * Stop tracking windows
     */
    disable() {
        Debug.info('WindowTracker disabled');
        
        // Disconnect all signals
        for (const signal of this._signals) {
            Utils.safeDisconnect(global.display, signal);
        }
        this._signals = [];
        
        // Disconnect workspace signals
        const workspaceManager = global.workspace_manager;
        if (workspaceManager) {
            // Workspace signals would need separate tracking
        }
        
        // Clear tracked windows
        this._trackedWindows.clear();
    }
    
    /**
     * Track all existing windows
     */
    _trackExistingWindows() {
        const display = global.display;
        const windows = display.get_window_actors();
        
        Debug.debug(`Tracking ${windows.length} existing windows`);
        
        for (const actor of windows) {
            const metaWindow = actor.meta_window;
            if (metaWindow && Utils.isWindowRelevant(metaWindow)) {
                this._addWindow(metaWindow);
            }
        }
        
        // Trigger initial update
        this._scheduleUpdate();
    }
    
    /**
     * Handle new window creation
     * @param {Meta.Window} window - New window
     */
    _onWindowCreated(window) {
        Debug.debug(`Window created: ${window.get_title() || 'Untitled'}`);
        
        if (Utils.isWindowRelevant(window)) {
            this._addWindow(window);
            this._scheduleUpdate();
        }
    }
    
    /**
     * Handle window removal
     * @param {Meta.Window} window - Removed window
     */
    _onWindowRemoved(window) {
        Debug.debug(`Window removed: ${window.get_title() || 'Untitled'}`);
        
        const appId = Utils.getAppIdFromWindow(window);
        if (appId) {
            this._model.removeRunningApp(appId, window);
            this._scheduleUpdate();
        }
        
        this._trackedWindows.delete(window);
    }
    
    /**
     * Handle focus change
     */
    _onFocusChanged() {
        const focusWindow = global.display.focus_window;
        
        // Update previous focused window
        // Update new focused window
        
        if (focusWindow && Utils.isWindowRelevant(focusWindow)) {
            const appId = Utils.getAppIdFromWindow(focusWindow);
            if (appId) {
                this._model.updateFocusState(appId, true);
                this._scheduleUpdate();
            }
        }
        
        // Note: Should also update previously focused window to not-focused
        // This is simplified for now
    }
    
    /**
     * Handle window moved between monitors
     * @param {Meta.Window} window - Moved window
     */
    _onWindowMoved(window) {
        // May need to update dock if workspace filter is active
        if (this._model && Utils.isWindowRelevant(window)) {
            this._scheduleUpdate();
        }
    }
    
    /**
     * Handle workspace change
     */
    _onWorkspaceChanged() {
        Debug.debug('Workspace changed');
        
        if (this._model) {
            // If using current workspace filter, need to refresh dock
            this._scheduleUpdate();
        }
    }
    
    /**
     * Add a window to tracking
     * @param {Meta.Window} window - Window to track
     */
    _addWindow(window) {
        if (this._trackedWindows.has(window)) {
            return;
        }
        
        const appId = Utils.getAppIdFromWindow(window);
        if (appId) {
            this._model.addRunningApp(appId, window);
            this._trackedWindows.add(window);
            
            // Connect to minimize signal on the window
            window.connect('notify::minimized', () => {
                this._model.updateMinimizedState(window, window.minimized);
                this._scheduleUpdate();
            });
            
            Debug.debug(`Tracking window for app: ${appId}`);
        }
    }
    
    /**
     * Schedule an update callback
     */
    _scheduleUpdate() {
        // Use idle_add to batch updates and avoid blocking main thread
        GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._debouncedUpdate();
            return GLib.SOURCE_REMOVE;
        });
    }
    
    /**
     * Get all tracked windows
     * @returns {Set} Set of tracked MetaWindow instances
     */
    getTrackedWindows() {
        return new Set(this._trackedWindows);
    }
    
    /**
     * Force refresh of all window states
     */
    forceRefresh() {
        Debug.debug('Force refreshing window tracker');
        this._trackExistingWindows();
    }
}
