import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // ✅ Correct import

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "Invalid userId" });
    }

    try {
        console.log(`Fetching unread counts for user: ${userId}`);

        // Fetch unread notifications
        const notificationsSnapshot = await db.collection("notification").get();
        const unreadNotifications = notificationsSnapshot.docs.filter((doc) => {
            const users = doc.data().users || [];
            return users.some((user: any) => user.id === userId && user.read === false);
        }).length;

        // Fetch unread chat messages
        const userChatsSnapshot = await db.collection("userChats").get();
        let unreadMessages = 0;

        userChatsSnapshot.forEach((doc) => {
            const data = doc.data();
            for (const key in data) {
                const subDoc = data[key];
                if (subDoc.uid === userId && subDoc.lastMessage?.isRead === false) {
                    unreadMessages++;
                }
            }
        });

        return res.status(200).json({
            unreadNotifications,
            unreadMessages,
        });
    } catch (error) {
        console.error("Error fetching unread counts:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
