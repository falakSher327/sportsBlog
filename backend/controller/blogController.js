const Joi = require("joi");
const fs = require("fs");
const Blog = require("../models/blog");
const { BACKEND_SERVER_PATH } = require("../config/index");
const BlogDTO = require("../dto/blog");
const BlogDetailsDTO = require("../dto/blog-details");
const Comment = require("../models/comment");

const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;
const blogController = {
  async create(req, res, next) {
    // validate req body
    // handle photo storage, naming
    // add to db
    // return response
    // clientside -> base64 encoded string-> decode -> store ->save photopath in db
    const createBlogSchema = Joi.object({
      title: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      content: Joi.string().required(),
      photo: Joi.string().required(),
    });
    const { error } = createBlogSchema.validate(req.body);

    if (error) {
      return next(error);
    }
    const { title, author, content, photo } = req.body;

    // read as buffer
    const buffer = Buffer.from(
      photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
      "base64"
    );
    //allot a random name
    const imagePath = `${Date.now()}-${author}.png`;
    //save locally

    try {
      fs.writeFileSync(`storage/${imagePath}`, buffer);
    } catch (error) {
      return next(error);
    }
    // save blog in db
    let newBlog;
    try {
      newBlog = new Blog({
        title,
        author,
        content,
        photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
      });
      await newBlog.save();
    } catch (error) {
      return next(error);
    }
    const blogDto = new BlogDTO(newBlog);
    return res.status(201).json({ blog: blogDto });
  },
  async getAll(req, res, next) {
    try {
      const blogs = await Blog.find({});
      const blogsDto = [];
      for (let i = 0; i < blogs.length; i++) {
        const dto = new BlogDTO(blogs[i]);
        blogsDto.push(dto);
      }
      return res.status(200).json({ blogs: blogsDto });
    } catch (error) {
      return next(error);
    }
  },
  async getById(req, res, next) {
    // validate id
    // response

    const getByIdSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = getByIdSchema.validate(req.params);

    if (error) {
      return next(error);
    }
    let blog;
    const { id } = req.params;
    try {
      blog = await Blog.findOne({ _id: id }).populate("author");
    } catch (error) {
      return next(error);
    }

    const blogDto = new BlogDetailsDTO(blog);
    return res.status(200).json({ blog: blogDto });
  },
  async update(req, res, next) {
    const updateSchema = Joi.object({
      content: Joi.string().required(),
      title: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      blogId: Joi.string().regex(mongodbIdPattern).required(),
      photo: Joi.string(),
    });
    const { error } = updateSchema.validate(req.body);

    const { content, title, author, blogId, photo } = req.body;

    //delete photo
    // save
    let blog;
    try {
      blog = await Blog.findOne({ _id: blogId });
    } catch (error) {
      return next(error);
    }

    if (photo) {
      let previousPhoto = blog.photoPath;

      previousPhoto = previousPhoto.split("/").at(-1);

      // delete photo

      fs.unlinkSync(`storage/${previousPhoto}`);
      // read as buffer
      const buffer = Buffer.from(
        photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
        "base64"
      );
      //allot a random name
      const imagePath = `${Date.now()}-${author}.png`;
      //save locally

      try {
        fs.writeFileSync(`storage/${imagePath}`, buffer);
      } catch (error) {
        return next(error);
      }
      await Blog.updateOne(
        { _id: blogId },
        {
          title,
          content,
          photo: `${BACKEND_SERVER_PATH}/storage ${imagePath}`,
        }
      );
    } else {
      await Blog.updateOne({ _id: blogId }, { content, title });
    }
    return res.status(200).json({ message: "blog updated" });
  },
  async delete(req, res, next) {
    // validate  // validate id
    //delete blog
    // delete comments on this blog
    const deleteBlogSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });
    const { error } = deleteBlogSchema.validate(req.params);
    const { id } = req.params;

    //delete blog
    // delete comments
    try {
      await Blog.deleteOne({ _id: id });
      await Comment.deleteMany({ blog: id });
    } catch (error) {
      return next(error);
    }
    return res.status(200).json({ message: "blog deleted" });
  },
};
module.exports = blogController;
