const express = require("express");
const authController = require("../controller/authController.js");
const auth = require("../middleware/auth.js");
const blogController = require("../controller/blogController.js");
const commentController = require("../controller/commentController.js");
const router = express.Router();

//user

//register
router.post("/register", authController.register);
//login
router.post("/login", authController.login);
//logout
router.post("/logout", auth, authController.logout);
//refresh
router.get("/refresh", authController.refresh);
//blog

//crud
//create
router.post("/blog", auth, blogController.create);
//read all blogs
router.get("/blog/all", auth, blogController.getAll);
//read blog by Id
router.get("/blog/:id", auth, blogController.getById);
//update
router.put("/blog/", auth, blogController.update);
//delete
router.delete("/blog/:id", auth, blogController.delete);
//comments

//create comment
router.post("/comment", auth, commentController.create);
// read
router.get("/comment/:id", auth, commentController.getById);
module.exports = router;
