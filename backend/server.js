const express = require("express");
const dbConnect = require("./database/index");
const router = require("./routes/index");
const { PORT } = require("./config/index");
const errorHandler = require("./middleware/errorHandler.js");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(router);

dbConnect();
app.use("/storage", express.static("storage"));
app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`server is connected to ${PORT}`);
});
