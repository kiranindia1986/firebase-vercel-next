import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // Firestore instance

/**
 * Marks all notifications as read for a specific user.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "Missing required parameter: userId" });
    }

    try {
        console.log(`🔹 Marking all notifications as read for UserID: ${userId}`);

        // Fetch all notifications where user exists
        const snapshot = await db.collection("notification").get();

        const batch = db.batch();

        snapshot.forEach((doc) => {
            const notificationData = doc.data() as {
                users: { id: string; read: boolean; deleted?: boolean }[];
            };

            // Update read status for the current user
            const updatedUsers = notificationData.users.map((user) =>
                user.id === userId ? { ...user, read: true } : user
            );

            batch.update(doc.ref, { users: updatedUsers });
        });

        await batch.commit();
        console.log(`✅ All notifications marked as read for ${userId}`);
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("❌ Error marking all notifications as read:", error);
        return res.status(500).json({ error: "Failed to update notifications" });
    }
}
