import {Router} from "express";
import {login} from "../services/auth.service.js";
import {signup} from "../services/auth.service.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);

export default authRouter;