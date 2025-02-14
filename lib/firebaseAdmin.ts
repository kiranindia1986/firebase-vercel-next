import admin from "firebase-admin";

// Ensure Firebase isn't initialized multiple times
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Fix private key formatting
        }),
    });
}

const db = admin.firestore(); // Firestore instance

export { db };
