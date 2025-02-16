import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

interface User {
    id: string;
    deleted?: boolean;
    read?: boolean;
    email?: string;
    displayName?: string;
    lastName?: string;
    photoURL?: string;
}

interface Notification {
    id?: string;
    messageContent: string;
    users: User[];
    createdAt: { _seconds: number; _nanoseconds: number };
    userId: string; // User who created the notification
    teams?: { label?: string; value?: string }[];
    photoURL?: string; // Profile picture of the author
}

/**
 * Fetches only unread (`read: false`) notifications for a specific user.
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
        console.log(`🔹 Fetching unread notifications count for UserID: ${userId}`);

        // Fetch notifications from Firestore
        const snapshot = await db.collection("notification").get();
        let unreadNotificationsCount = 0;

        snapshot.forEach((doc) => {
            const notificationData = doc.data() as Notification;

            // Explicitly type `user` and filter unread notifications
            const userEntry = notificationData.users?.find(
                (user: User) => user.id === userId && !user.deleted && user.read === false
            );

            if (userEntry) {
                unreadNotificationsCount++;
            }
        });

        console.log(`✅ Correct Unread Notifications Count: ${unreadNotificationsCount}`);

        // Fetch unread messages from `userChats`
        const userChatsSnapshot = await db.collection("userChats").get();
        let unreadMessagesCount = 0;

        userChatsSnapshot.forEach((doc) => {
            const data = doc.data();
            Object.keys(data).forEach((key) => {
                const subDoc = data[key];
                if (subDoc.uid === userId && subDoc.lastMessage && subDoc.lastMessage.isRead === false) {
                    unreadMessagesCount++;
                }
            });
        });

        console.log(`✅ Unread Messages Count: ${unreadMessagesCount}`);

        return res.status(200).json({
            unreadNotifications: unreadNotificationsCount,
            unreadMessages: unreadMessagesCount,
        });
    } catch (error) {
        console.error("❌ Error fetching unread notifications:", error);

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return res.status(500).json({ error: errorMessage });
    }
}
