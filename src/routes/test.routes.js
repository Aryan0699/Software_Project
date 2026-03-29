import { Router } from "express";
import  verifyJWTToken  from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/rbac.middleware.js";

const router = Router();

router.get("/admin-only", verifyJWTToken, authorizeRoles("ADMIN"), (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome admin",
  });
});

router.get(
  "/faculty-or-admin",
  verifyJWTToken,
  authorizeRoles("FACULTY", "ADMIN"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome faculty/admin",
    });
  }
);

router.get(
  "/staff-or-admin",
  verifyJWTToken,
  authorizeRoles("STAFF", "ADMIN"),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Welcome staff/admin",
    });
  }
);

router.get("/any-auth-user", verifyJWTToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome authenticated user",
    user: req.user,
  });
});

export default router;