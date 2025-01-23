const { createLogger, format, transports } = require('winston');
const path = require('path');

// Define log file paths
const logFilePath = path.join(__dirname, 'logs', 'application.log');
const errorLogFilePath = path.join(__dirname, 'logs', 'error.log');

// Create the logger instance
const logger = createLogger({
    level: 'info', // Default logging level
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamps
        format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        // Save all logs to a file
        new transports.File({ filename: logFilePath }),
        // Save only error logs to a separate file
        new transports.File({ filename: errorLogFilePath, level: 'error' }),
        // Output logs to the console
        new transports.Console()
    ]
});

// Export the logger
module.exports = logger;
