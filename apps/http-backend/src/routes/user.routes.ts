import { Router } from "express"
import { authUser } from "../middlewares/auth.middleware";
import { registerUser, loginUser, userProfile } from "../controllers/user.controller";

const router: Router = Router();

router.post('/register', registerUser);

router.post('/login', loginUser);

router.get('/profile', authUser, userProfile);

export default router;