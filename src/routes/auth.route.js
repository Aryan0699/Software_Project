import {Router} from "express";
import {login,signup,getUser} from "../controllers/auth.controller.js";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signupSchema, loginSchema } from "../validators/auth.validator.js";

const authRouter = Router();

authRouter.post("/signup", validate(signupSchema), signup);
authRouter.post("/login", validate(loginSchema), login);
authRouter.get("/getCurrentUser", verifyJWTToken, getUser);
export default authRouter;
