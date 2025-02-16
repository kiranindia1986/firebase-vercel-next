import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

/**
 * Marks all unread notifications as read for a specific user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
    }

    try {
        console.log(`🔹 Marking all notifications as read for user ${userId}`);

        const snapshot = await db.collection("notification").get();

        const batch = db.batch(); // Batch Firestore writes for efficiency

        snapshot.forEach((doc) => {
            const notificationData = doc.data();

            const updatedUsers = notificationData.users.map((user: any) => {
                if (user.id === userId && !user.read) {
                    return { ...user, read: true }; // Mark unread as read
                }
                return user;
            });

            batch.update(doc.ref, { users: updatedUsers });
        });

        await batch.commit(); // Commit all updates at once

        console.log(`✅ All notifications marked as read for user ${userId}`);

        return res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("❌ Error updating notifications:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
