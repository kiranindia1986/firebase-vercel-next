import admin from "firebase-admin";

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"), // 🔹 Fixes \n issue
            }),
        });
        console.log("✅ Firebase Admin Initialized Successfully");
    } catch (error) {
        console.error("❌ Firebase Admin Initialization Error:", error);
    }
}

export const db = admin.firestore();
