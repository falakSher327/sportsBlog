const Joi = require("joi");
const User = require("../models/user.js");
const bcrypt = require("bcryptjs");
const UserDTO = require("../dto/user.js");
const JWTService = require("../services/JWTService.js");
const RefreshToken = require("../models/token.js");
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const authController = {
  async register(req, res, next) {
    //1.validate user input
    const userRegisterSchema = Joi.object({
      username: Joi.string().min(5).max(30).required(),
      name: Joi.string().max(30).required(),
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
      confirmPassword: Joi.ref("password"),
    });
    const { error } = userRegisterSchema.validate(req.body);
    //2. if error in validation ,controkb.l error via middleware
    if (error) {
      return next(error);
    }
    //3. if email or username is already registered -> return an error
    const { username, name, email, password } = req.body;
    try {
      const emailInUse = await User.exists({ email });

      const userNameInUse = await User.exists({ username });
      if (emailInUse) {
        const error = {
          status: 409,
          message: "Email already registered",
        };
        return next(error);
      }
      if (userNameInUse) {
        const error = {
          status: 409,
          message: "username is already registered",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    //4.hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    //5.store data to in db
    let accessToken;
    let refreshToken;
    let user;
    try {
      const userToRegister = new User({
        username,
        name,
        email,
        password: hashedPassword,
      });
      user = await userToRegister.save();
      accessToken = JWTService.signAccessToken({ _id: user._id }, "30m");
      refreshToken = JWTService.signRefreshToken({ _id: user._id }, "60m");
    } catch (error) {
      return next(error);
    }
    await JWTService.storeRefreshToken(refreshToken, user._id);
    //send token to cookie
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    const userdto = new UserDTO(user);
    //6.response send
    return res.status(201).json({ user: userdto, auth: true });
  },
  async login(req, res, next) {
    // expecting data to login
    const loginSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().pattern(passwordPattern).required(),
    });
    // to handle error
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    //to match email and password
    const { email, password } = req.body;
    let user;
    try {
      user = await User.findOne({ email });

      if (!user) {
        const error = {
          status: 401,
          message: "Email not found",
        };
        return next(error);
      }
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        const error = {
          status: 401,
          message: "password not matched",
        };
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
    // return response
    const accessToken = JWTService.signAccessToken({ _id: user._id }, "30m");
    const refreshToken = JWTService.signRefreshToken({ _id: user._id }, "60m");

    //update refresh token in db
    try {
      await RefreshToken.updateOne(
        {
          _id: user._id,
        },
        { token: refreshToken },
        { upsert: true }
      );
    } catch (error) {
      return next(error);
    }

    //send to cookie
    res.cookie("accessToken", accessToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });
    res.cookie("refreshToken", refreshToken, {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
    });

    const userdto = new UserDTO(user);
    return res.status(200).json({ user: userdto, auth: true });
  },
  async logout(req, res, next) {
    // 1. delete refreshToken from
    const { refreshToken } = req.cookies;
    try {
      await RefreshToken.deleteOne({ token: refreshToken });
    } catch (error) {
      return next(error);
    }
    // delete cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    // 2. response

    res.status(200).json({ user: null, auth: false });
  },

  async refresh(req, res, next) {
    //get refresh token from cookies
    // verify refresh token
    // generate new token
    // update db,return res

    const originalRefreshToken = req.cookies.refreshToken;

    try {
      id = JWTService.verifyRefreshToken(originalRefreshToken)._id;
    } catch (e) {
      const error = {
        status: 401,
        message: "Unauthorized",
      };
      return next(error);
    }

    try {
      const match = RefreshToken.findOne({
        _id: id,
        token: originalRefreshToken,
      });

      if (!match) {
        const error = {
          status: 401,
          message: "unauthorized",
        };
        return next(error);
      }
    } catch (e) {
      return next(e);
    }
    try {
      const accessToken = JWTService.signAccessToken({ _id: id }, "30m");
      const refreshToken = JWTService.signRefreshToken({ _id: id }, "60m");

      await RefreshToken.updateOne({ _id: id }, { token: refreshToken });

      res.cookie("accessToken", accessToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
      res.cookie("refreshToken", refreshToken, {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: true,
      });
    } catch (error) {
      return next(error);
    }
    const user = await User.findOne({ _id: id });
    const userDto = new UserDTO(user);

    return res.status(200).json({ user: userDto, auth: true });
  },
};
module.exports = authController;
