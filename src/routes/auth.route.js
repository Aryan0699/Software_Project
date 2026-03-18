import {Router} from "express";
import {login,signup,getUser} from "../controllers/auth.controller.js";
const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.get("/getCurrentUser", getUser);
export default authRouter;
