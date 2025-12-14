import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { lightLogin } from "../controllers/LightUser/lightAuth.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/light-login", lightLogin);



export default router;
