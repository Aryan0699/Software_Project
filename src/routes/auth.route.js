import {Router} from "express";
import {login,signup,getUser} from "../controllers/auth.controller.js";
import verifyJWTToken from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.get("/getCurrentUser", verifyJWTToken, getUser);

export default authRouter;
