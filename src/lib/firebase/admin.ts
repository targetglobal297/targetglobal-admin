import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth }      from "firebase-admin/auth";

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === "admin");
  if (existing) return existing;
  return initializeApp(
    {
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n")!,
      }),
    },
    "admin"
  );
}

const adminApp = getAdminApp();
export const adminDb   = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

export async function verifyAdmin(token: string | undefined) {
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const user    = await adminDb.collection("users").doc(decoded.uid).get();
    if (!user.exists) return null;
    return user.data()?.role === "super_admin" ? decoded : null;
  } catch {
    return null;
  }
}
