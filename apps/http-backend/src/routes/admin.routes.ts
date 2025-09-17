import { Router } from "express";
import { registerAdmin, loginAdmin, adminProfile } from "../controllers/admin.controller";
import { authAdmin } from "../middlewares/auth.middleware";

const router: Router = Router();

router.post('/register', registerAdmin);

router.post('/login', loginAdmin);

router.get('/profile', authAdmin, adminProfile);

export default router;