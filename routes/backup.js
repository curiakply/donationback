// Backend - Database Backup System
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');
const schedule = require('node-schedule');

// Google Drive Configuration
const GOOGLE_DRIVE_CREDENTIALS = {
  client_id: process.env.GOOGLE_CLIENT_ID,
  client_secret: process.env.GOOGLE_CLIENT_SECRET,
  redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
};

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://jeevan-mongodb:27017/jeevantithe";
const DB_NAME = process.env.DB_NAME || 'jeevantithe';

// FIXED: Use /tmp for Lambda/serverless environments, or custom path from env
const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';

// Ensure backup directory exists with proper error handling
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✓ Backup directory created at: ${BACKUP_DIR}`);
  }
} catch (error) {
  console.error('⚠ Warning: Could not create backup directory:', error.message);
  console.error('Backups will fail unless BACKUP_DIR is set to a writable location.');
}

// Initialize Google Drive API
const getGoogleDriveClient = () => {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_DRIVE_CREDENTIALS.client_id,
    GOOGLE_DRIVE_CREDENTIALS.client_secret,
    GOOGLE_DRIVE_CREDENTIALS.redirect_uri
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_DRIVE_CREDENTIALS.refresh_token
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Create MongoDB backup using mongodump
 */
const createMongoDBBackup = async () => {
  return new Promise((resolve, reject) => {
    // Check if backup directory is available
    if (!fs.existsSync(BACKUP_DIR)) {
      reject(new Error('Backup directory not available'));
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${DB_NAME}_${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Create mongodump command
    const command = `mongodump --uri="${MONGODB_URI}" --db="${DB_NAME}" --out="${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', error);
        reject(error);
        return;
      }

      console.log('Backup created:', stdout);
      resolve({ backupPath, backupName });
    });
  });
};

/**
 * Compress backup folder to zip
 */
const compressBackup = async (backupPath, backupName) => {
  return new Promise((resolve, reject) => {
    const zipPath = `${backupPath}.zip`;
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Backup compressed: ${archive.pointer()} bytes`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(backupPath, backupName);
    archive.finalize();
  });
};

/**
 * Upload file to Google Drive
 */
const uploadToGoogleDrive = async (filePath, fileName) => {
  try {
    const drive = getGoogleDriveClient();

    // Create folder if doesn't exist
    const folderName = 'Database Backups';
    let folderId = await findOrCreateFolder(drive, folderName);

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, size, createdTime, webViewLink'
    });

    console.log('File uploaded to Google Drive:', response.data);
    return response.data;
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw error;
  }
};

/**
 * Find or create folder in Google Drive
 */
const findOrCreateFolder = async (drive, folderName) => {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id;
  } catch (error) {
    console.error('Error finding/creating folder:', error);
    throw error;
  }
};

/**
 * Clean up local backup files
 */
const cleanupLocalBackup = async (backupPath, zipPath) => {
  try {
    // Remove backup directory
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    
    // Remove zip file
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    console.log('Local backup files cleaned up');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

/**
 * GET /api/backup/status
 * Get backup system status
 */
router.get('/status', async (req, res) => {
  try {
    // Check if Google Drive is configured
    const isDriveConfigured = !!(
      GOOGLE_DRIVE_CREDENTIALS.client_id &&
      GOOGLE_DRIVE_CREDENTIALS.client_secret &&
      GOOGLE_DRIVE_CREDENTIALS.refresh_token
    );

    // Check if backup directory is writable
    const isBackupDirWritable = fs.existsSync(BACKUP_DIR);

    // Get list of local backups
    const localBackups = isBackupDirWritable
      ? fs.readdirSync(BACKUP_DIR)
          .filter(file => file.endsWith('.zip'))
          .map(file => {
            const stats = fs.statSync(path.join(BACKUP_DIR, file));
            return {
              name: file,
              size: stats.size,
              created: stats.birthtime
            };
          })
      : [];

    res.json({
      success: true,
      status: {
        googleDriveConfigured: isDriveConfigured,
        backupDirectory: BACKUP_DIR,
        backupDirWritable: isBackupDirWritable,
        databaseName: DB_NAME,
        localBackupsCount: localBackups.length,
        localBackups
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check backup status',
      error: error.message
    });
  }
});

/**
 * POST /api/backup/create
 * Create manual backup and upload to Google Drive
 */
router.post('/create', async (req, res) => {
  let backupPath, zipPath;

  try {
    // Check if backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      throw new Error(`Backup directory not available: ${BACKUP_DIR}. Set BACKUP_DIR environment variable to a writable location.`);
    }

    // Step 1: Create MongoDB backup
    console.log('Creating MongoDB backup...');
    const { backupPath: bp, backupName } = await createMongoDBBackup();
    backupPath = bp;

    // Step 2: Compress backup
    console.log('Compressing backup...');
    zipPath = await compressBackup(backupPath, backupName);

    // Step 3: Upload to Google Drive
    console.log('Uploading to Google Drive...');
    const driveFile = await uploadToGoogleDrive(zipPath, `${backupName}.zip`);

    // Step 4: Clean up local files
    await cleanupLocalBackup(backupPath, zipPath);

    res.json({
      success: true,
      message: 'Backup created and uploaded successfully',
      backup: {
        name: driveFile.name,
        size: driveFile.size,
        created: driveFile.createdTime,
        driveLink: driveFile.webViewLink,
        fileId: driveFile.id
      }
    });
  } catch (error) {
    console.error('Backup creation error:', error);
    
    // Cleanup on error
    if (backupPath || zipPath) {
      await cleanupLocalBackup(backupPath, zipPath);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

/**
 * GET /api/backup/list
 * List all backups from Google Drive
 */
router.get('/list', async (req, res) => {
  try {
    const drive = getGoogleDriveClient();
    const folderName = 'Database Backups';
    const folderId = await findOrCreateFolder(drive, folderName);

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, size, createdTime, modifiedTime, webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 50
    });

    const backups = response.data.files.map(file => ({
      id: file.id,
      name: file.name,
      size: parseInt(file.size) || 0,
      created: file.createdTime,
      modified: file.modifiedTime,
      driveLink: file.webViewLink
    }));

    res.json({
      success: true,
      backups,
      total: backups.length
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    });
  }
});

/**
 * DELETE /api/backup/:fileId
 * Delete backup from Google Drive
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const drive = getGoogleDriveClient();

    await drive.files.delete({
      fileId: fileId
    });

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete backup',
      error: error.message
    });
  }
});

/**
 * POST /api/backup/schedule
 * Setup automatic backup schedule
 * Body: { frequency: 'daily' | 'weekly' | 'monthly', time: '02:00' }
 */
router.post('/schedule', async (req, res) => {
  try {
    const { frequency, time } = req.body;

    // Cancel existing scheduled jobs
    schedule.gracefulShutdown();

    let cronExpression;
    const [hour, minute] = time.split(':');

    switch (frequency) {
      case 'daily':
        cronExpression = `${minute} ${hour} * * *`;
        break;
      case 'weekly':
        cronExpression = `${minute} ${hour} * * 0`; // Sunday
        break;
      case 'monthly':
        cronExpression = `${minute} ${hour} 1 * *`; // 1st of month
        break;
      default:
        throw new Error('Invalid frequency');
    }

    // Schedule the job
    schedule.scheduleJob(cronExpression, async () => {
      console.log('Running scheduled backup...');
      try {
        const { backupPath, backupName } = await createMongoDBBackup();
        const zipPath = await compressBackup(backupPath, backupName);
        await uploadToGoogleDrive(zipPath, `${backupName}.zip`);
        await cleanupLocalBackup(backupPath, zipPath);
        console.log('Scheduled backup completed successfully');
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    });

    res.json({
      success: true,
      message: 'Backup schedule configured',
      schedule: {
        frequency,
        time,
        cronExpression
      }
    });
  } catch (error) {
    console.error('Schedule configuration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure schedule',
      error: error.message
    });
  }
});

module.exports = router;

// ============================================
// SETUP INSTRUCTIONS:
// ============================================

/*
1. Install required packages:
   npm install googleapis archiver node-schedule

2. Setup Google Drive API:
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI
   - Get refresh token using OAuth playground

3. Add to .env file:
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=your_redirect_uri
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   MONGODB_URI=mongodb://localhost:27017
   DB_NAME=your_database_name
   BACKUP_DIR=/tmp/backups  # Add this for Lambda/serverless

4. Register routes in your main app:
   const backupRoutes = require('./routes/backup');
   app.use('/api/backup', backupRoutes);

5. Make sure mongodump is installed:
   - MongoDB Database Tools must be installed
   - Download from: https://www.mongodb.com/try/download/database-tools
   
6. For AWS Lambda/Serverless:
   - Set BACKUP_DIR=/tmp/backups in environment variables
   - Note: /tmp has 512MB limit and is ephemeral
   - Consider uploading directly to S3 or Google Drive without local storage
*/