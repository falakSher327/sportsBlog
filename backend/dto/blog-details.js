class BlogDetailsDTO {
  constructor(blog) {
    this._id = blog._id;
    this.content = blog.content;
    this.title = blog.title;
    this.createdAt = blog.createdAt;
    this.photo = blog.photoPath;
    this.authorName = blog.author.name;
    this.authorUserName = blog.author.username;
  }
}
module.exports = BlogDetailsDTO;
