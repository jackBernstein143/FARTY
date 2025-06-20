import Fuse from 'fuse.js';
import FormData from 'form-data';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

const storage = new Storage();
const bucketName = 'myku-app.appspot.com';

/*********************************************************************/
/* 1. secret (OpenAI)                                                 */
/*********************************************************************/
// ... existing code ...
/*********************************************************************/
/* NEW: Cloud Function to cut a video, insert AI image, stitch result */
/*********************************************************************/
export const createFartyVideo = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GiB'
}).https.onCall(async (data) => {
  // --- DIAGNOSTIC LOG ---
  console.log("SERVER LOG: Received payload:", JSON.stringify(data, null, 2));

// ... existing code ...
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
  }
});

/*********************************************************************/
/* 6. Enhanced user search function with fuzzy matching             */
/*********************************************************************/
export const searchUsers = functions.https.onCall(
// ... existing code ...
