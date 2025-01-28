const express = require("express");
const router = express.Router();
const db = require("../db/db")

router.get("/instagram-users", async (req, res) => {
  const page = Number.parseInt(req.query.page) || 1;
  const limit = Number.parseInt(req.query.limit) || 20;
  const sortBy = req.query.sortBy || "user_id";
  const sortOrder = req.query.sortOrder || "asc";
  const offset = (page - 1) * limit;

  try {
    const totalCount = await db("insta_users").count("* as count").first();
    const users = await db("insta_users")
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    res.json({
      instagramUsers: users,
      totalCount: Number.parseInt(totalCount.count),
      totalPages: Math.ceil(Number.parseInt(totalCount.count) / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching Instagram users" });
  }
});

router.get("/instagram-users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db("insta_users").where({ user_id: id }).first();

    if (!user) {
      return res.status(404).json({ error: "Instagram user not found" });
    }

    const emails = await db("insta_users_emails").where({ user_id: id });
    const links = await db("insta_users_links").where({ user_id: id });

    user.emails = emails;
    user.links = links;

    res.json(user);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching the Instagram user" });
  }
});

module.exports = router;
