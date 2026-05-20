/**
 * SupraDash Extension Entry Point
 * Main extension orchestration: init, enable, disable, reload
 */

import * as Debug from './lib/debug.js';
import * as Dock from './lib/dock.js';
import * as Model from './lib/model.js';
import * as Tracker from './lib/tracker.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class SupraDashExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        
        // Core components
        this._settings = null;
        this._model = null;
        this._tracker = null;
        this._dock = null;
    }
    
    /**
     * Initialize extension (called once when extension is loaded)
     */
    init() {
        Debug.info('SupraDash initialized');
    }
    
    /**
     * Enable extension (called when extension is activated)
     */
    enable() {
        Debug.info('SupraDash enabling...');
        
        try {
            // Get settings
            this._settings = this.getSettings();
            
            // Initialize debug module with settings
            Debug.init(this._settings);
            
            // Create model
            this._model = new Model.DockModel(this._settings);
            
            // Create window tracker
            this._tracker = new Tracker.WindowTracker(
                this._model,
                () => this._onTrackerUpdate()
            );
            
            // Create dock container
            this._dock = new Dock.DockContainer(this._settings, this._model);
            
            // Enable components in order
            this._dock.enable();
            this._tracker.enable();
            
            Debug.info('SupraDash enabled successfully');
        } catch (e) {
            Debug.logException(e, 'Failed to enable SupraDash');
            this._cleanup();
        }
    }
    
    /**
     * Disable extension (called when extension is deactivated)
     */
    disable() {
        Debug.info('SupraDash disabling...');
        
        try {
            // Disable components in reverse order
            if (this._tracker) {
                this._tracker.disable();
                this._tracker = null;
            }
            
            if (this._dock) {
                this._dock.disable();
                this._dock = null;
            }
            
            if (this._model) {
                this._model.clear();
                this._model = null;
            }
            
            this._settings = null;
            
            Debug.info('SupraDash disabled successfully');
        } catch (e) {
            Debug.logException(e, 'Failed to disable SupraDash');
            this._cleanup();
        }
    }
    
    /**
     * Handle tracker update callback
     */
    _onTrackerUpdate() {
        if (this._dock) {
            this._dock.refresh();
        }
    }
    
    /**
     * Cleanup resources on error
     */
    _cleanup() {
        Debug.warn('Cleaning up after error');
        
        try {
            if (this._tracker) {
                this._tracker.disable();
            }
        } catch (e) {
            Debug.debug('Tracker cleanup error:', e.message);
        }
        
        try {
            if (this._dock && this._dock.getActor()) {
                const actor = this._dock.getActor();
                if (actor && actor.destroy) {
                    actor.destroy();
                }
            }
        } catch (e) {
            Debug.debug('Dock cleanup error:', e.message);
        }
        
        this._tracker = null;
        this._dock = null;
        this._model = null;
    }
}
