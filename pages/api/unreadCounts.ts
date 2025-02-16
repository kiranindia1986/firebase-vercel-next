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

        // Query Firestore for notifications where the user has `read: false`
        const unreadNotificationsSnapshot = await db
            .collection("notification")
            .where("users", "array-contains", { id: userId, read: false }) // ✅ Filter directly in Firestore
            .get();

        const unreadNotificationsCount = unreadNotificationsSnapshot.size;

        console.log(`✅ Total Unread Notifications Count: ${unreadNotificationsCount}`);

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
        console.error("❌ Error fetching unread counts:", error);

        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

        return res.status(500).json({ error: errorMessage });
    }
}
