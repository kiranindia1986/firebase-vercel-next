import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

/**
 * Marks a single notification as read by updating `read: true` for the user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId, notificationId } = req.body;
    if (!userId || !notificationId) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
        console.log(`🔹 Marking notification as read: ${notificationId} for User: ${userId}`);

        // Fetch notification document
        const notificationRef = db.collection("notification").doc(notificationId);
        const notificationDoc = await notificationRef.get();

        if (!notificationDoc.exists) {
            return res.status(404).json({ error: "Notification not found" });
        }

        const notificationData = notificationDoc.data() as {
            users: { id: string; read: boolean; deleted?: boolean }[];
        };

        // Update the user's `read` status in the users array
        const updatedUsers = notificationData.users.map((user) =>
            user.id === userId ? { ...user, read: true } : user
        );

        await notificationRef.update({ users: updatedUsers });

        console.log(`✅ Notification ${notificationId} marked as read for ${userId}`);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Error marking notification as read:", error);
        return res.status(500).json({ error: "Failed to update notification" });
    }
}
