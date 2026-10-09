import fs from "fs";
import path from "path";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
const MASTER_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || "";

function requireGoogleDriveConfig() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      "Google Drive OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.",
    );
  }
}

let cachedRefreshToken: string | null =
  process.env.GOOGLE_REFRESH_TOKEN || null;
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;
let authorizedEmail: string | null = null;

const folderCache = new Map<string, string>();

/**
 * Persists the refresh token to backend/.env so it survives server restarts
 */
function persistRefreshToken(refreshToken: string) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf-8");
    }
    if (content.includes("GOOGLE_REFRESH_TOKEN=")) {
      content = content.replace(
        /GOOGLE_REFRESH_TOKEN=.*/g,
        `GOOGLE_REFRESH_TOKEN=${refreshToken}`,
      );
    } else {
      content += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
    }
    fs.writeFileSync(envPath, content, "utf-8");
  } catch (err) {
    console.error("Failed to write GOOGLE_REFRESH_TOKEN to .env:", err);
  }
}

export function getDriveStatus() {
  return {
    configured: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && MASTER_FOLDER_ID),
    authorized: Boolean(cachedRefreshToken),
    accountEmail: authorizedEmail,
    folderId: MASTER_FOLDER_ID,
  };
}

/**
 * Exchanges the one-time authorization code for permanent refresh_token
 */
export async function exchangeAuthCode(code: string): Promise<{
  success: boolean;
  email?: string;
}> {
  requireGoogleDriveConfig();

  const params = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: "postmessage",
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

  if (data.refresh_token) {
    cachedRefreshToken = data.refresh_token;
    persistRefreshToken(data.refresh_token);
  }

  // Fetch account email for confirmation
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${cachedAccessToken}` },
    });
    if (userRes.ok) {
      const info = (await userRes.json()) as { email?: string };
      authorizedEmail = info.email || null;
    }
  } catch {}

  return {
    success: true,
    email: authorizedEmail || undefined,
  };
}

/**
 * Ensures an active access token using the stored permanent refresh_token
 */
export async function getFreshAccessToken(): Promise<string> {
  requireGoogleDriveConfig();

  // If access token is still valid (with 60s buffer), reuse it
  if (
    cachedAccessToken &&
    tokenExpiresAt &&
    Date.now() < tokenExpiresAt - 60000
  ) {
    return cachedAccessToken;
  }

  const refreshToken = cachedRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error(
      "Master Google Drive is not authorized. Please complete the one-time authorization.",
    );
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to refresh Google token (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

/**
 * Finds or creates a folder inside a parent folder on Google Drive
 */
export async function getOrCreateDriveFolder({
  folderName,
  parentFolderId,
  accessToken,
}: {
  folderName: string;
  parentFolderId: string;
  accessToken: string;
}): Promise<string> {
  const cacheKey = `${parentFolderId}:::${folderName}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!;
  }

  // 1. Search existing folder
  const cleanName = folderName.replace(/'/g, "\\'");
  const query = `name = '${cleanName}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (searchRes.ok) {
      const data = (await searchRes.json()) as { files?: { id: string; name: string }[] };
      if (data.files && data.files.length > 0 && data.files[0].id) {
        folderCache.set(cacheKey, data.files[0].id);
        return data.files[0].id;
      }
    }
  } catch (err) {
    console.warn("Drive folder search error:", err);
  }

  // 2. Create folder if not found
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Drive folder "${folderName}": ${errText}`);
  }

  const result = (await createRes.json()) as { id: string };
  folderCache.set(cacheKey, result.id);
  return result.id;
}

/**
 * Uploads a document organized user-wise into Master Google Drive:
 * Master Root -> User - {userDisplayName} -> {subfolderName} -> file
 */
export async function uploadUserDocumentToMasterDrive({
  fileBuffer,
  fileName,
  mimeType,
  userDisplayName,
  subfolderName,
  customName,
}: {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  userDisplayName?: string;
  subfolderName?: string;
  customName?: string;
}): Promise<{
  id: string;
  name: string;
  webViewLink: string;
}> {
  const accessToken = await getFreshAccessToken();
  const masterRootId = MASTER_FOLDER_ID;

  // 1. Resolve User Folder: "User - [Name]"
  const sanitizedUser = (userDisplayName || "General User").trim();
  const userFolderId = await getOrCreateDriveFolder({
    folderName: `User - ${sanitizedUser}`,
    parentFolderId: masterRootId,
    accessToken,
  });

  // 2. Resolve Subfolder if specified (e.g. "Tax & Finance", "General")
  let targetFolderId = userFolderId;
  if (subfolderName && subfolderName.trim()) {
    targetFolderId = await getOrCreateDriveFolder({
      folderName: subfolderName.trim(),
      parentFolderId: userFolderId,
      accessToken,
    });
  }

  // 3. Compute final file name
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "pdf";
  const finalFileName = customName ? `${customName}.${ext}` : fileName;

  // 4. Multipart upload via Google Drive v3
  const boundary = "-------LifeNestMasterBoundary" + Math.random().toString(36).substring(2);
  const metadata = JSON.stringify({
    name: finalFileName,
    mimeType: mimeType || "application/octet-stream",
    parents: [targetFolderId],
  });

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const header = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}${delimiter}Content-Type: ${mimeType || "application/octet-stream"}\r\n\r\n`;

  const preBuffer = Buffer.from(header, "utf-8");
  const postBuffer = Buffer.from(closeDelim, "utf-8");
  const fullPayload = Buffer.concat([preBuffer, fileBuffer, postBuffer]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(fullPayload.length),
      },
      body: fullPayload,
    },
  );

  if (!uploadRes.ok) {
    const errorBody = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errorBody}`);
  }

  const result = (await uploadRes.json()) as {
    id: string;
    name: string;
    webViewLink?: string;
  };

  return {
    id: result.id,
    name: result.name,
    webViewLink:
      result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}

/**
 * Permanently deletes a file or folder from Google Drive
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  if (!fileId) return false;
  try {
    const accessToken = await getFreshAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (res.status === 204 || res.status === 200 || res.status === 404) {
      return true;
    }
    const err = await res.text();
    console.warn(`Drive file delete failed (${res.status}):`, err);
    return false;
  } catch (err) {
    console.warn("Failed to delete file from Google Drive:", err);
    return false;
  }
}

/**
 * Searches and removes any files/folders matching a given name query (e.g. "Dewan")
 */
export async function deleteDriveFilesByName(nameSnippet: string): Promise<number> {
  try {
    const accessToken = await getFreshAccessToken();
    const query = encodeURIComponent(`name contains '${nameSnippet}' and trashed = false`);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!searchRes.ok) return 0;
    const data = (await searchRes.json()) as { files?: Array<{ id: string; name: string }> };
    let count = 0;
    if (data.files && data.files.length > 0) {
      for (const f of data.files) {
        await deleteDriveFile(f.id);
        count++;
      }
    }
    return count;
  } catch (err) {
    console.warn("Error deleting files by name snippet:", err);
    return 0;
  }
}

