import { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/firebaseAdmin"; // ✅ Firestore Admin Import

interface BlogPost {
    id: string;
    isDeleted: boolean;
    createdAt: FirebaseFirestore.Timestamp;
    teams?: { label?: string; value?: string }[]; // Optional `teams` array
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

        // ✅ Correct Extraction of Team UIDs
        const userTeams: string[] = userData?.teams?.map((team: { teamUid: string }) => team.teamUid) || [];
        console.log("✅ Corrected User's Teams:", userTeams);

        if (userTeams.length === 0) {
            console.warn("⚠️ User has no team access.");
            return res.status(200).json({ posts: [] });
        }

        // ✅ Fetch all posts where `isDeleted` is false
        const postsSnapshot = await db.collection("blogs")
            .where("isDeleted", "==", false)
            .get();

        console.log(`✅ Posts Found: ${postsSnapshot.size}`);

        // ✅ Filter Posts based on user’s teams
        const filteredPosts = postsSnapshot.docs
            .map((doc) => {
                const postData = doc.data() as BlogPost;
                return {
                    ...postData, // ✅ Spread first
                    id: doc.id,  // ✅ Ensure `id` is added explicitly
                };
            })
            .filter((post) =>
                post.teams &&
                Array.isArray(post.teams) &&
                post.teams.some((team) => userTeams.includes(team.value!))
            )
            .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()) // ✅ Sort by createdAt
            .slice(0, 5); // ✅ Return latest 5 posts

        console.log("✅ Final Filtered Posts:", filteredPosts);

        return res.status(200).json({ posts: filteredPosts });
    } catch (error) {
        console.error("❌ Error fetching latest posts:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
