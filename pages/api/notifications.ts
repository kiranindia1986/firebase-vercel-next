import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

interface Notification {
    id?: string;
    messageContent: string;
    users: {
        id: string;
        deleted?: boolean;
        read?: boolean;
        email?: string;
        displayName?: string;
        lastName?: string;
        photoURL?: string
    }[];
    createdAt: { _seconds: number; _nanoseconds: number };
    userId: string; // User who created the notification
    teams?: { label?: string; value?: string }[];
    photoURL?: string; // Profile picture of the author
}

/**
 * Fetches notifications for a specific user, ensuring the correct `photoURL` is assigned from the `users` array.
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
        let notifications: Notification[] = [];
        let unreadCount = 0;

        const userIdsToFetch = new Set<string>(); // Collect user IDs for batch fetching

        snapshot.forEach((doc) => {
            const notificationData = doc.data() as Notification;
            const notificationWithId = { id: doc.id, ...notificationData };

            // Check if the notification contains the requested user
            const userEntry = notificationData.users.find(
                (user) => user.id === userId && !user.deleted
            );

            if (userEntry) {
                notifications.push(notificationWithId);
                if (!userEntry.read) unreadCount++;
            }

            // Collect unique `users.id` for fetching `photoURL`
            notificationData.users.forEach((user) => {
                if (user.id) {
                    userIdsToFetch.add(user.id);
                }
            });
        });

        console.log(`✅ Unread Count: ${unreadCount}`);

        // **Batch Fetch Users to Get photoURL**
        const userProfiles: Record<string, string> = {}; // Map uid -> photoURL

        if (userIdsToFetch.size > 0) {
            const userDocs = await db.collection("users").where("uid", "in", Array.from(userIdsToFetch)).get();

            userDocs.forEach((doc) => {
                const userData = doc.data();
                userProfiles[userData.uid] = userData.photoURL || ""; // Store photoURL
            });
        }

        // **Assign photoURL to correct users**
        notifications = notifications.map((notif) => ({
            ...notif,
            users: notif.users.map(user => ({
                ...user,
                photoURL: userProfiles[user.id] || "", // Assign correct photoURL
            })),
        }));

        // **Sort notifications in descending order of createdAt**
        notifications.sort((a, b) => b.createdAt._seconds - a.createdAt._seconds);

        console.log(`✅ Notifications Fetched:`, notifications);

        return res.status(200).json({ count: unreadCount, notifications });
    } catch (error) {
        console.error("❌ Error fetching notifications:", error);

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return res.status(500).json({ error: errorMessage });
    }
}
