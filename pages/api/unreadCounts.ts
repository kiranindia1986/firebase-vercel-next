import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Import Firestore DB

interface Notification {
    users: { id: string; read: boolean }[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "Invalid userId" });
    }

    try {
        console.log(`UserID received: ${userId}`);

        // Fetch notifications
        const notificationSnapshot = await db.collection("notification").get();
        const unreadNotificationsCount = notificationSnapshot.docs
            .map((doc) => doc.data() as Notification)
            .filter((data) => data.users.some((user) => user.id === userId && !user.read)).length;

        console.log(`Unread notifications count: ${unreadNotificationsCount}`);

        // Fetch unread messages from userChats
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

        console.log(`Unread messages count: ${unreadMessagesCount}`);

        return res.status(200).json({
            unreadNotifications: unreadNotificationsCount,
            unreadMessages: unreadMessagesCount,
        });
    } catch (error) {
        console.error("Error fetching unread counts:", error);
        return res.status(500).json({ error: error.message });
    }
}
