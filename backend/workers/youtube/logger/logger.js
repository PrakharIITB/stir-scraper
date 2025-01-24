const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const DailyRotateFile = require('winston-daily-rotate-file');

// Define the log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

// Create the logger
const logger = createLogger({
  format: combine(
    colorize(),      // Colorize output
    timestamp(),     // Add timestamp
    logFormat        // Apply custom format
  ),
  transports: [
    new transports.Console(),              // Log to console
    new DailyRotateFile({
      filename: 'workers/youtube/logs/app-%DATE%.log',    // Log file name with date
      datePattern: 'YYYY-MM-DD',           // Date format for filenames
      maxFiles: '7d'                       // Retain logs for 7 days
    })
  ]
});

module.exports = logger;
