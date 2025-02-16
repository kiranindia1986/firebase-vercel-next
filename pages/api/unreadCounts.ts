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
        console.log(`🔹 Fetching unread notifications count for UserID: ${userId}`);

        // Fetch all notifications where users array contains the given userId
        const snapshot = await db.collection("notification").get();
        let unreadNotificationsCount = 0;

        snapshot.forEach((doc) => {
            const notificationData = doc.data();

            // Find user's entry in `users` array where `read: false`
            const userEntry = notificationData.users?.find(
                (user: any) => user.id === userId && !user.deleted && user.read === false
            );

            if (userEntry) {
                unreadNotificationsCount++;
            }
        });

        console.log(`✅ Correct Unread Notifications Count: ${unreadNotificationsCount}`);

        // Fetch unread messages count from `userChats`
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
        console.error("❌ Error fetching unread counts:", error);

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return res.status(500).json({ error: errorMessage });
    }
}
