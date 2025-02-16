import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

/**
 * Marks a single notification as read for a specific user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId, notificationId } = req.body;

    if (!userId || !notificationId) {
        return res.status(400).json({ error: "Missing userId or notificationId" });
    }

    try {
        console.log(`🔹 Marking notification ${notificationId} as read for user ${userId}`);

        const notificationRef = db.collection("notification").doc(notificationId);
        const notificationDoc = await notificationRef.get();

        if (!notificationDoc.exists) {
            return res.status(404).json({ error: "Notification not found" });
        }

        const notificationData = notificationDoc.data();

        const updatedUsers = notificationData?.users.map((user: any) => {
            if (user.id === userId) {
                return { ...user, read: true }; // Update read status
            }
            return user;
        });

        await notificationRef.update({ users: updatedUsers });

        console.log(`✅ Notification ${notificationId} marked as read for user ${userId}`);

        return res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("❌ Error updating notification:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
