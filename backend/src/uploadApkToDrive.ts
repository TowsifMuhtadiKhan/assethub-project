import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN?.trim() || "";
const MASTER_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || "";

async function getAccessToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing Google OAuth credentials in backend/.env");
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function getOrCreateFolder(accessToken: string, folderName: string, parentId: string): Promise<string> {
  const cleanName = folderName.replace(/'/g, "\\'");
  const q = `name = '${cleanName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = (await searchRes.json()) as { files?: { id: string }[] };
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Folder creation failed: ${err}`);
  }

  const resData = (await createRes.json()) as { id: string };
  return resData.id;
}

async function uploadApk() {
  const apkPath = path.resolve(__dirname, "../../apk-output/LifeNest-debug.apk");
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK file not found at: ${apkPath}`);
  }

  const stats = fs.statSync(apkPath);
  console.log(`[1/4] Found APK file: ${apkPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

  const accessToken = await getAccessToken();
  console.log("[2/4] Authenticated with Google Drive API");

  // Get or create "LifeNest APK Releases" folder in MASTER_FOLDER_ID
  const releasesFolderId = await getOrCreateFolder(accessToken, "LifeNest APK Releases", MASTER_FOLDER_ID);
  console.log(`[3/4] Uploading to Google Drive folder: ${releasesFolderId}...`);

  const fileBuffer = fs.readFileSync(apkPath);
  const fileName = "LifeNest.apk";
  const mimeType = "application/vnd.android.package-archive";

  // Multipart upload
  const boundary = "-------LifeNestApkBoundary" + Math.random().toString(36).substring(2);
  const metadata = JSON.stringify({
    name: fileName,
    mimeType,
    parents: [releasesFolderId],
  });

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  const header = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const preBuffer = Buffer.from(header, "utf-8");
  const postBuffer = Buffer.from(closeDelim, "utf-8");
  const fullPayload = Buffer.concat([preBuffer, fileBuffer, postBuffer]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(fullPayload.length),
      },
      body: fullPayload,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload failed (${uploadRes.status}): ${errText}`);
  }

  const fileData = (await uploadRes.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
    webContentLink?: string;
  };

  console.log(`[4/4] Making APK file publicly accessible to all Android users...`);
  const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });

  if (!permRes.ok) {
    console.warn("Could not set public permission:", await permRes.text());
  }

  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileData.id}`;
  const directUserContentUrl = `https://drive.usercontent.google.com/download?id=${fileData.id}&export=download`;
  const viewUrl = fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;

  const apkInfo = {
    version: "1.0.1",
    buildNumber: 2,
    fileName: fileName,
    fileId: fileData.id,
    fileSizeMb: (stats.size / (1024 * 1024)).toFixed(2),
    updatedAt: new Date().toISOString(),
    viewUrl,
    downloadUrl,
    directUserContentUrl,
  };

  // Write to frontend/public/apk-version.json so the web app and android app can check it
  const frontendPublicDir = path.resolve(__dirname, "../../frontend/public");
  if (!fs.existsSync(frontendPublicDir)) {
    fs.mkdirSync(frontendPublicDir, { recursive: true });
  }
  const publicJsonPath = path.join(frontendPublicDir, "apk-version.json");
  fs.writeFileSync(publicJsonPath, JSON.stringify(apkInfo, null, 2), "utf-8");

  // Also write to apk-output/apk-version.json
  const apkOutputDir = path.resolve(__dirname, "../../apk-output");
  fs.writeFileSync(path.join(apkOutputDir, "apk-version.json"), JSON.stringify(apkInfo, null, 2), "utf-8");

  console.log("\n============================================================");
  console.log("  APK UPLOAD TO GOOGLE DRIVE COMPLETE!");
  console.log(`  File ID:        ${fileData.id}`);
  console.log(`  Drive View:     ${viewUrl}`);
  console.log(`  Direct Download: ${downloadUrl}`);
  console.log("============================================================\n");
}

uploadApk().catch((err) => {
  console.error("Error uploading APK to Google Drive:", err);
  process.exit(1);
});
