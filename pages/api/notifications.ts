import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

interface Notification {
    id?: string;
    messageContent: string;
    users: { id: string; deleted?: boolean; read?: boolean; email?: string; displayName?: string; lastName?: string; photoURL?: string }[];
    createdAt: FirebaseFirestore.Timestamp;
    userId: string;
    teams?: { label?: string; value?: string }[];
}

/**
 * Fetches notifications for a specific user, adding author's profile picture (photoURL).
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

        const userIdsToFetch = new Set<string>(); // To batch fetch user details

        snapshot.forEach((doc) => {
            const notificationData = doc.data() as Notification;
            const notificationWithId = { id: doc.id, ...notificationData };

            // Find the user in the 'users' array
            const userEntry = notificationData.users.find(
                (user) => user.id === userId && !user.deleted
            );

            if (userEntry) {
                notifications.push(notificationWithId);
                if (!userEntry.read) unreadCount++;
            }

            // Collect unique userIds to fetch `photoURL`
            if (notificationData.userId) {
                userIdsToFetch.add(notificationData.userId);
            }
        });

        console.log(`✅ Unread Count: ${unreadCount}`);

        // **Fetch photoURLs from 'users' collection**
        const userProfiles: Record<string, string> = {}; // Map userId -> photoURL

        if (userIdsToFetch.size > 0) {
            const userDocs = await db.collection("users").where("uid", "in", Array.from(userIdsToFetch)).get();

            userDocs.forEach((doc) => {
                const userData = doc.data();
                userProfiles[userData.id] = userData.photoURL || ""; // Store photoURL
            });
        }

        // Append photoURL to each notification author
        const enrichedNotifications = notifications.map((notif) => {
            return {
                ...notif,
                photoURL: userProfiles[notif.userId] || "", // Assign photoURL if exists
            };
        });

        console.log(`✅ Notifications Fetched:`, enrichedNotifications);

        return res.status(200).json({ count: unreadCount, notifications: enrichedNotifications });
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return res.status(500).json({ error: errorMessage });
    }
}
