/**
 * SupraDash Debug Module
 * Provides structured logging and debug utilities for the extension
 */

const GLib = imports.gi.GLib;

let _debugEnabled = false;
const LOG_PREFIX = 'SupraDash:';

/**
 * Log levels
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

let _currentLevel = LogLevel.INFO;

/**
 * Initialize debug module with settings
 * @param {Gio.Settings} settings - GSettings instance
 */
export function init(settings) {
    if (settings) {
        _debugEnabled = settings.get_boolean('debug-mode');
        settings.connect('changed::debug-mode', () => {
            _debugEnabled = settings.get_boolean('debug-mode');
            logInfo(`Debug mode ${_debugEnabled ? 'enabled' : 'disabled'}`);
        });
    }
}

/**
 * Set minimum log level
 * @param {number} level - Minimum log level to display
 */
export function setLogLevel(level) {
    _currentLevel = level;
}

/**
 * Internal log function with prefix and timestamp
 * @param {string} level - Log level string
 * @param {string} message - Message to log
 */
function _log(level, message) {
    const timestamp = new Date().toISOString().substr(11, 12);
    console.log(`${LOG_PREFIX}[${timestamp}][${level}] ${message}`);
}

/**
 * Debug level log (only shown when debug enabled)
 * @param {string} message - Message to log
 * @param {*} ...args - Additional arguments to log
 */
export function debug(message, ...args) {
    if (_debugEnabled && _currentLevel <= LogLevel.DEBUG) {
        let fullMessage = message;
        if (args.length > 0) {
            fullMessage += ' ' + args.map(arg => {
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');
        }
        _log('DEBUG', fullMessage);
    }
}

/**
 * Info level log
 * @param {string} message - Message to log
 * @param {*} ...args - Additional arguments to log
 */
export function info(message, ...args) {
    if (_currentLevel <= LogLevel.INFO) {
        let fullMessage = message;
        if (args.length > 0) {
            fullMessage += ' ' + args.map(arg => String(arg)).join(' ');
        }
        _log('INFO', fullMessage);
    }
}

/**
 * Warning level log
 * @param {string} message - Message to log
 * @param {*} ...args - Additional arguments to log
 */
export function warn(message, ...args) {
    if (_currentLevel <= LogLevel.WARN) {
        let fullMessage = message;
        if (args.length > 0) {
            fullMessage += ' ' + args.map(arg => String(arg)).join(' ');
        }
        _log('WARN', fullMessage);
    }
}

/**
 * Error level log
 * @param {string} message - Message to log
 * @param {*} ...args - Additional arguments to log
 */
export function error(message, ...args) {
    if (_currentLevel <= LogLevel.ERROR) {
        let fullMessage = message;
        if (args.length > 0) {
            fullMessage += ' ' + args.map(arg => String(arg)).join(' ');
        }
        _log('ERROR', fullMessage);
    }
}

/**
 * Log exception with stack trace
 * @param {Error} exception - Exception to log
 * @param {string} context - Optional context message
 */
export function logException(exception, context = '') {
    const contextStr = context ? `${context}: ` : '';
    error(`${contextStr}${exception.message}`);
    if (_debugEnabled && exception.stack) {
        debug(exception.stack);
    }
}

/**
 * Check if debug mode is enabled
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugEnabled() {
    return _debugEnabled;
}

/**
 * Force enable/disable debug mode (for testing)
 * @param {boolean} enabled - Whether to enable debug mode
 */
export function setDebugEnabled(enabled) {
    _debugEnabled = enabled;
}
