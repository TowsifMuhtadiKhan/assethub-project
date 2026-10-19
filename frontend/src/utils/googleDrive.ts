/**
 * Google Drive link parsing and URL helper utilities
 */

export function extractGoogleDriveFolderId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Pattern 1: https://drive.google.com/drive/(u/0/)?folders/{folderId}
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Pattern 2: https://drive.google.com/folderview?id={folderId} or open?id={folderId}
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1];
  }

  // Pattern 3: Raw Folder ID (typical Drive IDs are 25-45 characters alphanumeric with - and _)
  if (/^[a-zA-Z0-9_-]{15,60}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function getGoogleDriveFolderUrl(folderId: string): string {
  if (!folderId) return "";
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

export function extractGoogleDriveFileId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Pattern 1: https://drive.google.com/file/d/{fileId}/view...
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (fileMatch && fileMatch[1]) {
    return fileMatch[1];
  }

  // Pattern 2: https://docs.google.com/(document|spreadsheets|presentation)/d/{fileId}/...
  const docsMatch = trimmed.match(/\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]{15,})/);
  if (docsMatch && docsMatch[1]) {
    return docsMatch[1];
  }

  // Pattern 3: https://drive.google.com/open?id={fileId}
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (queryMatch && queryMatch[1]) {
    return queryMatch[1];
  }

  // Pattern 4: Raw file ID
  if (/^[a-zA-Z0-9_-]{15,60}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function getGoogleDriveFileViewUrl(fileId: string): string {
  if (!fileId) return "";
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

export function getGoogleDriveDirectDownloadUrl(input: string): string {
  if (!input) return "";
  const fileId = extractGoogleDriveFileId(input);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  }
  return input;
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    if (!dataUrl.startsWith("data:")) return null;
    const parts = dataUrl.split(";base64,");
    if (parts.length !== 2) return null;
    const contentType = parts[0].replace(/^data:/, "") || "application/octet-stream";
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: contentType });
  } catch (err) {
    console.error("Failed to parse data URL to blob:", err);
    return null;
  }
}

/**
 * Safely opens or downloads a document file.
 * Prevents Chrome from blocking top-level navigation to data: URIs (about:blank#blocked)
 */
export function openDocumentFile(doc: {
  name: string;
  fileUrl?: string;
  fileType?: string;
  storageProvider?: string;
  driveFileId?: string;
}) {
  const driveId = doc.driveFileId || (doc.fileUrl ? extractGoogleDriveFileId(doc.fileUrl) : null);
  if (driveId) {
    window.open(`https://drive.google.com/file/d/${driveId}/view`, "_blank", "noopener,noreferrer");
    return;
  }

  if (!doc.fileUrl) return;

  // 1. Google Drive files or external URLs
  if (
    doc.storageProvider === "google_drive" ||
    doc.fileUrl.startsWith("http://") ||
    doc.fileUrl.startsWith("https://")
  ) {
    window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // 2. Base64 data: URIs (PDFs, images, etc.)
  if (doc.fileUrl.startsWith("data:")) {
    try {
      const blob = dataUrlToBlob(doc.fileUrl);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const newWin = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (newWin) {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
          return;
        }

        // If popup was blocked, fallback to downloading
        const ext = doc.fileType || (blob.type.includes("pdf") ? "pdf" : "png");
        const fullName = doc.name.includes(".") ? doc.name : `${doc.name}.${ext}`;
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fullName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        return;
      }
    } catch (e) {
      console.error("Error opening document preview:", e);
    }

    // Direct download fallback
    const ext = doc.fileType || "pdf";
    const fullName = doc.name.includes(".") ? doc.name : `${doc.name}.${ext}`;
    const a = document.createElement("a");
    a.href = doc.fileUrl;
    a.download = fullName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Generic fallback
  window.open(doc.fileUrl, "_blank", "noopener,noreferrer");
}

export function getBackendApiUrl(): string {
  const envUrl =
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");

  try {
    const saved = localStorage.getItem("lifenest_backend_url");
    if (saved && saved.trim()) {
      const clean = saved.trim().replace(/\/api\/?$/, "").replace(/\/+$/, "");
      // Vercel only hosts the static frontend, not the backend server.
      // If a user saved a .vercel.app domain, ignore it so it falls back to Render.
      if (!clean.includes(".vercel.app")) {
        return clean;
      }
    }
  } catch {}

  // If running in browser and not on localhost, use default production Render backend
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "https://likherakho-backend.onrender.com";
    }
  }

  return "http://localhost:4000";
}

export function setBackendApiUrl(url: string): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem(
        "lifenest_backend_url",
        url.trim().replace(/\/api\/?$/, "").replace(/\/+$/, ""),
      );
    } else {
      localStorage.removeItem("lifenest_backend_url");
    }
  } catch {}
}

/**
 * Directly downloads the document file to the user's computer.
 * For Google Drive files, streams via backend proxy with Content-Disposition: attachment.
 * For local files, creates and clicks a blob download anchor.
 */
export async function downloadDocumentFile(doc: {
  name: string;
  fileUrl?: string;
  fileType?: string;
  storageProvider?: string;
  driveFileId?: string;
}) {
  const driveId = doc.driveFileId || (doc.fileUrl ? extractGoogleDriveFileId(doc.fileUrl) : null);
  const ext = doc.fileType && doc.fileType !== "gdrive" ? doc.fileType : "pdf";
  const fullName = doc.name.includes(".") ? doc.name : `${doc.name}.${ext}`;

  // 1. Google Drive files: download via backend proxy
  if (driveId) {
    const apiUrl = getBackendApiUrl();
    const downloadUrl = `${apiUrl}/api/documents/download-drive/${driveId}?filename=${encodeURIComponent(fullName)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = fullName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. Base64 data URLs
  if (doc.fileUrl?.startsWith("data:")) {
    try {
      const parts = doc.fileUrl.split(";base64,");
      if (parts.length === 2) {
        const contentType = parts[0].replace("data:", "");
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fullName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return;
      }
    } catch (e) {
      console.error("Local data URI download error:", e);
    }
  }

  // 3. Fallback standard download
  if (doc.fileUrl) {
    const a = document.createElement("a");
    a.href = doc.fileUrl;
    a.download = fullName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Permanently deletes a file from Google Drive via backend proxy (with client token fallback)
 */
export async function deleteDocumentFromMasterGoogleDrive(driveFileId: string): Promise<boolean> {
  if (!driveFileId) return false;
  const cleanId = extractGoogleDriveFileId(driveFileId) || driveFileId.trim();
  if (!cleanId) return false;

  try {
    const apiUrl = getBackendApiUrl();
    const res = await fetch(`${apiUrl}/api/documents/drive-file/${encodeURIComponent(cleanId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn("Backend delete-drive-file API failed, trying client fallback:", err);
  }

  // Client OAuth token fallback
  try {
    const oauth = getGoogleOAuthState();
    if (oauth.isConnected && oauth.accessToken) {
      const directRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(cleanId)}?supportsAllDrives=true`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${oauth.accessToken}` },
        },
      );
      return directRes.ok || directRes.status === 404;
    }
  } catch (cErr) {
    console.warn("Client fallback file delete failed:", cErr);
  }

  return false;
}

/**
 * Permanently deletes a folder (and its child files) from Google Drive
 */
export async function deleteFolderFromMasterGoogleDrive({
  folderName,
  folderId,
  userDisplayName,
}: {
  folderName?: string;
  folderId?: string;
  userDisplayName?: string;
}): Promise<boolean> {
  if (!folderName && !folderId) return false;
  try {
    const apiUrl = getBackendApiUrl();
    const res = await fetch(`${apiUrl}/api/documents/delete-drive-folder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderName, folderId, userDisplayName }),
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn("Backend delete-drive-folder failed, trying client fallback:", err);
  }

  // Client OAuth token fallback
  try {
    const oauth = getGoogleOAuthState();
    if (oauth.isConnected && oauth.accessToken) {
      if (folderId) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?supportsAllDrives=true`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${oauth.accessToken}` },
        });
      }
      if (folderName && folderName.trim()) {
        const cleanName = folderName.trim().replace(/'/g, "\\'");
        const q = `name = '${cleanName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        const searchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true`,
          { headers: { Authorization: `Bearer ${oauth.accessToken}` } },
        );
        if (searchRes.ok) {
          const data = (await searchRes.json()) as { files?: Array<{ id: string }> };
          if (data.files && data.files.length > 0) {
            for (const f of data.files) {
              await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${oauth.accessToken}` },
              });
            }
          }
        }
      }
      return true;
    }
  } catch (cErr) {
    console.warn("Client fallback folder delete failed:", cErr);
  }

  return false;
}

// ============================================================================
// Google OAuth 2.0 & Background Drive Upload (Option B)
// ============================================================================

export const G_CLIENT_ID_KEY = "lifenest_google_client_id";
export const G_ACCESS_TOKEN_KEY = "lifenest_gdrive_access_token";
export const G_EXPIRES_AT_KEY = "lifenest_gdrive_token_expires_at";
export const G_ACCOUNT_EMAIL_KEY = "lifenest_gdrive_account_email";

export const MASTER_GOOGLE_CLIENT_ID =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID || "";

export interface GoogleOAuthState {
  clientId: string;
  accessToken: string | null;
  expiresAt: number | null;
  accountEmail: string | null;
  isConnected: boolean;
}

export function getGoogleOAuthClientId(): string {
  try {
    return (
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID ||
      MASTER_GOOGLE_CLIENT_ID ||
      localStorage.getItem(G_CLIENT_ID_KEY) ||
      ""
    );
  } catch {
    return MASTER_GOOGLE_CLIENT_ID;
  }
}

export function setGoogleOAuthClientId(clientId: string): void {
  try {
    localStorage.setItem(G_CLIENT_ID_KEY, clientId.trim());
  } catch {}
}

export function getGoogleOAuthState(): GoogleOAuthState {
  const clientId = getGoogleOAuthClientId();
  try {
    const accessToken = localStorage.getItem(G_ACCESS_TOKEN_KEY);
    const expiresAtRaw = localStorage.getItem(G_EXPIRES_AT_KEY);
    const accountEmail = localStorage.getItem(G_ACCOUNT_EMAIL_KEY);
    const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;

    // Consider connected if access token exists and not expired (with 30s buffer)
    const isConnected = Boolean(
      accessToken && expiresAt && expiresAt > Date.now() + 30000,
    );

    return {
      clientId,
      accessToken: isConnected ? accessToken : null,
      expiresAt,
      accountEmail: isConnected ? accountEmail : null,
      isConnected,
    };
  } catch {
    return {
      clientId,
      accessToken: null,
      expiresAt: null,
      accountEmail: null,
      isConnected: false,
    };
  }
}

export function saveGoogleOAuthSession(
  accessToken: string,
  expiresInSeconds: number,
  email?: string,
): void {
  try {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(G_ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(G_EXPIRES_AT_KEY, String(expiresAt));
    if (email) {
      localStorage.setItem(G_ACCOUNT_EMAIL_KEY, email);
    }
  } catch {}
}

export function disconnectGoogleOAuth(): void {
  try {
    localStorage.removeItem(G_ACCESS_TOKEN_KEY);
    localStorage.removeItem(G_EXPIRES_AT_KEY);
    localStorage.removeItem(G_ACCOUNT_EMAIL_KEY);
  } catch {}
}

/**
 * Initiates Google Identity Services OAuth 2.0 flow
 */
export async function requestGoogleDriveAccessToken(customClientId?: string): Promise<{
  accessToken: string;
  expiresIn: number;
  email?: string;
}> {
  const clientId = customClientId || getGoogleOAuthClientId();
  if (!clientId) {
    throw new Error(
      "Google Client ID is missing. Please enter your Google OAuth Client ID first.",
    );
  }

  // Ensure window.google is loaded
  const win = window as unknown as {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: unknown) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  };

  if (!win.google?.accounts?.oauth2) {
    // Wait up to 3 seconds for GIS script to load
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (win.google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve();
        } else if (attempts > 30) {
          clearInterval(interval);
          reject(
            new Error(
              "Google Identity Services library failed to load. Please check your internet connection or ad-blockers.",
            ),
          );
        }
      }, 100);
    });
  }

  return new Promise((resolve, reject) => {
    try {
      const client = win.google!.accounts!.oauth2!.initTokenClient({
        client_id: clientId,
        scope:
          "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email",
        callback: async (resp: {
          error?: string;
          error_description?: string;
          access_token?: string;
          expires_in?: number;
        }) => {
          if (resp.error) {
            reject(
              new Error(
                resp.error_description || resp.error || "Google authorization was cancelled or failed",
              ),
            );
            return;
          }
          if (!resp.access_token) {
            reject(new Error("No access token returned from Google"));
            return;
          }
          const accessToken = resp.access_token;
          const expiresIn = Number(resp.expires_in || 3600);
          let email: string | undefined = undefined;

          try {
            const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userinfoRes.ok) {
              const info = (await userinfoRes.json()) as { email?: string };
              email = info.email;
            }
          } catch {}

          saveGoogleOAuthSession(accessToken, expiresIn, email);
          resolve({ accessToken, expiresIn, email });
        },
      });

      client.requestAccessToken({ prompt: "consent" });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Uploads a file directly into the user's Google Drive folder using Google Drive API v3
 */
export async function uploadFileToGoogleDrive({
  file,
  folderId,
  customName,
}: {
  file: File;
  folderId?: string;
  customName?: string;
}): Promise<{
  id: string;
  name: string;
  webViewLink: string;
}> {
  const oauth = getGoogleOAuthState();
  if (!oauth.isConnected || !oauth.accessToken) {
    throw new Error(
      "Google Drive is not connected or authorization token expired. Please connect your Google account in Settings > Storage.",
    );
  }

  const boundary = "-------LifeNestBoundary" + Math.random().toString(36).substring(2);
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "pdf";
  const finalFileName = customName ? `${customName}.${ext}` : file.name;

  const metadata: Record<string, unknown> = {
    name: finalFileName,
    mimeType: file.type || "application/octet-stream",
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const metadataBlob = new Blob(
    [
      delimiter,
      "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    ],
    { type: "text/plain" },
  );

  const multipartBlob = new Blob(
    [metadataBlob, file, new Blob([closeDelim], { type: "text/plain" })],
    { type: `multipart/related; boundary=${boundary}` },
  );

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${oauth.accessToken}`,
      },
      body: multipartBlob,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) {
      disconnectGoogleOAuth();
      throw new Error(
        "Google Drive access token expired. Please re-authenticate your Google Account in Settings > Storage.",
      );
    }
    throw new Error(`Google Drive upload error (${response.status}): ${errorBody}`);
  }

  const result = (await response.json()) as { id: string; name: string; webViewLink?: string };
  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}

// ============================================================================
// Master Shared Drive & User-Wise Folder Organizer
// ============================================================================

export const MASTER_GOOGLE_DRIVE_FOLDER_ID = "16nFs8ycnwDKQDAiqpcMsapLPnvvHI6Lf";

export function getMasterGoogleDriveFolderId(): string {
  try {
    return (
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_DRIVE_FOLDER_ID ||
      localStorage.getItem("lifenest_master_drive_folder_id") ||
      MASTER_GOOGLE_DRIVE_FOLDER_ID
    );
  } catch {
    return MASTER_GOOGLE_DRIVE_FOLDER_ID;
  }
}

/**
 * Finds an existing folder inside a parent folder, or creates it if it doesn't exist
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
  const cacheKey = `gdrive_folder_${parentFolderId}_${folderName}`;
  const cachedId = sessionStorage.getItem(cacheKey);
  if (cachedId) return cachedId;

  // 1. Search for existing folder in parent
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
        const existingId = data.files[0].id;
        sessionStorage.setItem(cacheKey, existingId);
        return existingId;
      }
    }
  } catch (err) {
    console.warn("Error searching Drive folder:", err);
  }

  // 2. Create new folder
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
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder "${folderName}": ${errorText}`);
  }

  const createdData = (await createRes.json()) as { id: string };
  sessionStorage.setItem(cacheKey, createdData.id);
  return createdData.id;
}

/**
 * Uploads a file organized user-wise inside the Master Google Drive root:
 * Master Root -> User - {userDisplayName} -> {subfolderName} -> file
 * Automatically uses the backend automated service with permanent refresh token.
 */
export async function uploadUserDocumentToGoogleDrive({
  file,
  userDisplayName,
  subfolderName,
  customName,
}: {
  file: File;
  userDisplayName?: string;
  subfolderName?: string;
  customName?: string;
}): Promise<{
  id: string;
  name: string;
  webViewLink: string;
  userFolderId?: string;
}> {
  // Method 1: Backend Automated Master Upload (Permanent & works for all users)
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const apiUrl =
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
      "http://localhost:4000";

    const response = await fetch(`${apiUrl}/api/documents/upload-drive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type,
        userDisplayName: userDisplayName || "Personal",
        subfolderName: subfolderName || "General",
        customName,
      }),
    });

    if (response.ok) {
      return (await response.json()) as { id: string; name: string; webViewLink: string };
    }
  } catch (backendErr) {
    console.warn("Backend drive upload not available, falling back to client token:", backendErr);
  }

  // Method 2: Client token fallback
  const oauth = getGoogleOAuthState();
  if (oauth.isConnected && oauth.accessToken) {
    const masterRootId = getMasterGoogleDriveFolderId();
    const sanitizedUser = (userDisplayName || "General User").trim();
    const userFolderId = await getOrCreateDriveFolder({
      folderName: `User - ${sanitizedUser}`,
      parentFolderId: masterRootId,
      accessToken: oauth.accessToken,
    });
    let targetFolderId = userFolderId;
    if (subfolderName && subfolderName.trim()) {
      targetFolderId = await getOrCreateDriveFolder({
        folderName: subfolderName.trim(),
        parentFolderId: userFolderId,
        accessToken: oauth.accessToken,
      });
    }
    const uploadResult = await uploadFileToGoogleDrive({
      file,
      folderId: targetFolderId,
      customName,
    });
    return { ...uploadResult, userFolderId };
  }

  throw new Error("Master Google Drive is not connected yet.");
}

/**
 * Checks if the Master Drive backend has an active permanent authorization
 */
export async function checkMasterDriveStatus(): Promise<{
  configured: boolean;
  authorized: boolean;
  accountEmail?: string;
  folderId: string;
}> {
  try {
    const apiUrl =
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
      "http://localhost:4000";
    const res = await fetch(`${apiUrl}/api/google/status`);
    if (res.ok) {
      return (await res.json()) as {
        configured: boolean;
        authorized: boolean;
        accountEmail?: string;
        folderId: string;
      };
    }
  } catch {}
  return { configured: false, authorized: false, folderId: "" };
}

/**
 * Initiates the one-time master authorization popup using Google Identity Services Code Client.
 * Exchanges the authorization code on the backend for a permanent refresh token.
 */
export async function requestMasterAuthorization(): Promise<{
  success: boolean;
  email?: string;
}> {
  const clientId = getGoogleOAuthClientId();
  const win = window as unknown as {
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (config: unknown) => {
            requestCode: () => void;
          };
        };
      };
    };
  };

  if (!win.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services script is not loaded yet. Please refresh the page.");
  }

  return new Promise((resolve, reject) => {
    try {
      const client = win.google!.accounts!.oauth2!.initCodeClient({
        client_id: clientId,
        scope:
          "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email",
        ux_mode: "popup",
        callback: async (response: { code?: string; error?: string }) => {
          if (response.error || !response.code) {
            reject(new Error(response.error || "Google authorization was cancelled"));
            return;
          }
          try {
            const apiUrl =
              (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
              "http://localhost:4000";
            const exchangeRes = await fetch(`${apiUrl}/api/google/exchange-code`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: response.code }),
            });
            if (!exchangeRes.ok) {
              const errBody = await exchangeRes.text();
              reject(new Error(`Failed to save authorization on backend: ${errBody}`));
              return;
            }
            const data = (await exchangeRes.json()) as { success: boolean; email?: string };
            resolve(data);
          } catch (exErr) {
            reject(exErr instanceof Error ? exErr : new Error(String(exErr)));
          }
        },
      });

      client.requestCode();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

