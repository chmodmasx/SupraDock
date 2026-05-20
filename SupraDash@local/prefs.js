/**
 * SupraDash Preferences Module
 * GTK4/Adw preferences interface for extension settings
 */

const Gtk = imports.gi.Gtk;
const Adw = imports.gi.Adw;
const Gio = imports.gi.Gio;

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SupraDashPreferences extends ExtensionPreferences {
    /**
     * Fill preferences UI
     * @param {Adw.PreferencesPage} page - Main preferences page
     */
    fillPreferencesWidget(page) {
        // Get settings
        const settings = this.getSettings();
        
        // Create preferences groups
        this._createAppearanceGroup(page, settings);
        this._createBehaviorGroup(page, settings);
        this._createDebugGroup(page, settings);
    }
    
    /**
     * Create appearance settings group
     * @param {Adw.PreferencesPage} page - Main preferences page
     * @param {Gio.Settings} settings - GSettings instance
     */
    _createAppearanceGroup(page, settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Visual customization options'
        });
        
        // Icon size
        const iconSizeRow = new Adw.ActionRow({
            title: 'Icon Size',
            subtitle: 'Base icon size in pixels'
        });
        
        const iconSizeSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 16,
                upper: 128,
                step_increment: 4
            }),
            valign: Gtk.Align.CENTER
        });
        
        iconSizeSpin.set_value(settings.get_int('icon-size'));
        iconSizeSpin.connect('value-changed', () => {
            settings.set_int('icon-size', iconSizeSpin.get_value_as_int());
        });
        
        iconSizeRow.add_suffix(iconSizeSpin);
        iconSizeRow.activatable_widget = iconSizeSpin;
        group.add(iconSizeRow);
        
        // Minimum icon size
        const minIconSizeRow = new Adw.ActionRow({
            title: 'Minimum Icon Size',
            subtitle: 'Minimum size when auto-shrinking'
        });
        
        const minIconSizeSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 8,
                upper: 64,
                step_increment: 2
            }),
            valign: Gtk.Align.CENTER
        });
        
        minIconSizeSpin.set_value(settings.get_int('min-icon-size'));
        minIconSizeSpin.connect('value-changed', () => {
            settings.set_int('min-icon-size', minIconSizeSpin.get_value_as_int());
        });
        
        minIconSizeRow.add_suffix(minIconSizeSpin);
        minIconSizeRow.activatable_widget = minIconSizeSpin;
        group.add(minIconSizeRow);
        
        // Dock position
        const positionRow = new Adw.ComboRow({
            title: 'Dock Position',
            subtitle: 'Position on screen',
            model: Gtk.StringList.new(['Top', 'Bottom', 'Left', 'Right'])
        });
        
        const positionMap = {
            'TOP': 0,
            'BOTTOM': 1,
            'LEFT': 2,
            'RIGHT': 3
        };
        
        const reverseMap = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
        positionRow.selected = positionMap[settings.get_string('dock-position')];
        
        positionRow.connect('notify::selected', () => {
            settings.set_string('dock-position', reverseMap[positionRow.selected]);
        });
        
        group.add(positionRow);
        
        // Dock margin
        const marginRow = new Adw.ActionRow({
            title: 'Dock Margin',
            subtitle: 'Distance from screen edge in pixels'
        });
        
        const marginSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 2
            }),
            valign: Gtk.Align.CENTER
        });
        
        marginSpin.set_value(settings.get_int('dock-margin'));
        marginSpin.connect('value-changed', () => {
            settings.set_int('dock-margin', marginSpin.get_value_as_int());
        });
        
        marginRow.add_suffix(marginSpin);
        marginRow.activatable_widget = marginSpin;
        group.add(marginRow);
        
        // Show separators
        const separatorRow = new Adw.SwitchRow({
            title: 'Show Separators',
            subtitle: 'Display separators between sections'
        });
        
        settings.bind(
            'separator-visible',
            separatorRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        group.add(separatorRow);
        
        page.add(group);
    }
    
    /**
     * Create behavior settings group
     * @param {Adw.PreferencesPage} page - Main preferences page
     * @param {Gio.Settings} settings - GSettings instance
     */
    _createBehaviorGroup(page, settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Behavior',
            description: 'Functional customization options'
        });
        
        // Auto-shrink
        const autoShrinkRow = new Adw.SwitchRow({
            title: 'Auto-Shrink',
            subtitle: 'Automatically shrink dock to fit available space'
        });
        
        settings.bind(
            'auto-shrink',
            autoShrinkRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        group.add(autoShrinkRow);
        
        // Workspace filter
        const workspaceRow = new Adw.ComboRow({
            title: 'Workspace Filter',
            subtitle: 'Which windows to show',
            model: Gtk.StringList.new(['Current Workspace', 'All Workspaces'])
        });
        
        workspaceRow.selected = settings.get_string('workspace-filter') === 'current' ? 0 : 1;
        
        workspaceRow.connect('notify::selected', () => {
            settings.set_string('workspace-filter', workspaceRow.selected === 0 ? 'current' : 'all');
        });
        
        group.add(workspaceRow);
        
        // Show recent apps
        const recentAppsRow = new Adw.SwitchRow({
            title: 'Show Recent Apps',
            subtitle: 'Display recently used applications'
        });
        
        settings.bind(
            'show-recent-apps',
            recentAppsRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        group.add(recentAppsRow);
        
        // Recent apps limit
        const recentLimitRow = new Adw.ActionRow({
            title: 'Recent Apps Limit',
            subtitle: 'Maximum number of recent apps to show'
        });
        
        const recentLimitSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 20,
                step_increment: 1
            }),
            valign: Gtk.Align.CENTER
        });
        
        recentLimitSpin.set_value(settings.get_int('recent-apps-limit'));
        recentLimitSpin.connect('value-changed', () => {
            settings.set_int('recent-apps-limit', recentLimitSpin.get_value_as_int());
        });
        
        recentLimitRow.add_suffix(recentLimitSpin);
        recentLimitRow.activatable_widget = recentLimitSpin;
        group.add(recentLimitRow);
        
        // Show thumbnails
        const thumbnailsRow = new Adw.SwitchRow({
            title: 'Show Thumbnails',
            subtitle: 'Display window thumbnails for minimized apps (future)'
        });
        
        thumbnailsRow.set_sensitive(false); // Not yet implemented
        thumbnailsRow.set_subtitle('Not yet implemented');
        
        group.add(thumbnailsRow);
        
        page.add(group);
    }
    
    /**
     * Create debug settings group
     * @param {Adw.PreferencesPage} page - Main preferences page
     * @param {Gio.Settings} settings - GSettings instance
     */
    _createDebugGroup(page, settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Debug',
            description: 'Development and troubleshooting options'
        });
        
        // Debug mode
        const debugRow = new Adw.SwitchRow({
            title: 'Debug Mode',
            subtitle: 'Enable verbose logging'
        });
        
        settings.bind(
            'debug-mode',
            debugRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        group.add(debugRow);
        
        page.add(group);
    }
}
