import { Router } from "express";
import { authAdmin } from "../middlewares/auth.middleware";
import { createRoom, fetchRooms, addCandidate } from "../controllers/room.controller";

const router: Router = Router();

router.post('/create', authAdmin, createRoom);

router.get('/my-rooms', authAdmin, fetchRooms);

router.post('/add-candidate', authAdmin, addCandidate);

export default router;