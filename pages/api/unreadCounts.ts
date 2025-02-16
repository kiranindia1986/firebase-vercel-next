import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "Invalid userId" });
    }

    try {
        console.log(`🔹 Fetching unread notifications for UserID: ${userId}`);

        // Fetch notifications where the user exists in the `users` array
        const notificationSnapshot = await db
            .collection("notification")
            .where("users.id", "==", userId) // Fetch only relevant notifications
            .get();

        let unreadNotificationsCount = 0;

        // Iterate through notifications and filter only `read: false`
        notificationSnapshot.forEach((doc) => {
            const notificationData = doc.data();

            // Ensure `users` exists and is an array before using `.find()`
            if (Array.isArray(notificationData.users)) {
                const userEntry = notificationData.users.find(
                    (user: { id: string; read?: boolean }) => user.id === userId && !user.read // Type explicitly defined here ✅
                );

                if (userEntry) {
                    unreadNotificationsCount++;
                }
            }
        });

        console.log(`✅ Unread notifications count: ${unreadNotificationsCount}`);

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

        console.log(`✅ Unread messages count: ${unreadMessagesCount}`);

        return res.status(200).json({
            unreadNotifications: unreadNotificationsCount,
            unreadMessages: unreadMessagesCount,
        });
    } catch (error: unknown) {
        console.error("❌ Error fetching unread counts:", error);

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

        return res.status(500).json({ error: errorMessage });
    }
}
