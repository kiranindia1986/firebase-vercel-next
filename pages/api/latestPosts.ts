import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // ✅ Firestore Admin Import

interface BlogPost {
    id: string;
    isDeleted: boolean;
    createdAt: FirebaseFirestore.Timestamp;
    messageTitle: string;
    messageContent: string;
    teams?: { label?: string; value?: string }[]; // Optional `teams` array
    userId: string;
    orgId: string;
    notificationId: string;
    isPinned: boolean;
    isDisablePostComments: boolean;
    pollData?: object;
    likes: string[];
    comments: object[];
    viewed: string[];
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
        console.log(`📡 Fetching teams for user: ${userId}`);

        // ✅ Fetch User Document
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            console.warn("⚠️ User document not found.");
            return res.status(200).json({ posts: [] });
        }

        const userData = userDoc.data();
        console.log("🔹 User Data:", userData);

        // ✅ Extract user's teams correctly
        const userTeams: string[] = userData?.teams?.map((team: { teamUid: string }) => team.teamUid) || [];
        console.log("✅ Corrected User's Teams:", userTeams);

        if (userTeams.length === 0) {
            console.warn("⚠️ User has no team access.");
            return res.status(200).json({ posts: [] });
        }

        // ✅ Fetch latest 5 posts where `isDeleted` is false and user has access
        const postsSnapshot = await db.collection("blogs")
            .where("isDeleted", "==", false)
            .where("teams", "array-contains-any", userTeams) // ✅ Match team access
            .orderBy("createdAt", "desc") // ✅ Fetch in descending order
            .limit(5) // ✅ Get only latest 5
            .get();

        console.log(`✅ Latest Posts Found: ${postsSnapshot.size}`);

        // ✅ Fetch User Data for Each Post Author
        const posts = await Promise.all(
            postsSnapshot.docs.map(async (doc) => {
                const postData = doc.data() as BlogPost;

                // ✅ Fetch Author Info from Users Collection
                let authorName = "Unknown";
                let authorImageUrl = "https://via.placeholder.com/40"; // Default Image
                if (postData.userId) {
                    const authorDoc = await db.collection("users").doc(postData.userId).get();
                    if (authorDoc.exists) {
                        const authorData = authorDoc.data();
                        authorName = authorData?.displayName || authorName;
                        authorImageUrl = authorData?.photoURL || authorImageUrl;
                    }
                }

                return {
                    ...postData,  // ✅ Spread original post data
                    id: doc.id,    // ✅ Ensure `id` is correctly set
                    createdAt: postData.createdAt.toMillis(), // ✅ Convert Firestore timestamp to milliseconds
                    authorName,
                    authorImageUrl,
                };
            })
        );

        console.log("✅ Final Processed Posts:", posts);

        return res.status(200).json({ posts });
    } catch (error) {
        console.error("❌ Error fetching latest posts:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
