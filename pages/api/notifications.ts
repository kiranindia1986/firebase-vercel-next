import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

interface Notification {
    id?: string; // Mark id as optional in case it's already present in Firestore
    message: string;
    users: { id: string; deleted?: boolean; read?: boolean }[];
    timestamp: FirebaseFirestore.Timestamp;
}

/**
 * Fetches notifications for a specific user from Firestore.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "Invalid userId" });
    }

    try {
        console.log(`🔹 Fetching notifications for UserID: ${userId}`);

        // Fetch all notifications from Firestore
        const snapshot = await db.collection("notification").get();

        const notifications: Notification[] = [];
        let unreadCount = 0;

        snapshot.forEach((doc) => {
            const notificationData = doc.data() as Notification;

            // Avoid duplicate id assignment if `id` already exists in Firestore document
            const notificationWithId = {
                ...(notificationData.id ? notificationData : { id: doc.id, ...notificationData })
            };

            // Find the user in the 'users' array
            const userEntry = notificationData.users.find(
                (user) => user.id === userId && !user.deleted
            );

            if (userEntry) {
                notifications.push(notificationWithId);

                if (!userEntry.read) unreadCount++;
            }
        });

        console.log(`✅ Unread Count: ${unreadCount}`);
        console.log(`✅ Notifications Fetched:`, notifications);

        return res.status(200).json({ count: unreadCount, notifications });
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

        return res.status(500).json({ error: errorMessage });
    }
}
