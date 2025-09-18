import { Router } from "express";
import { authUser, authAdmin } from "../middlewares/auth.middleware";
import { createRoom, fetchRooms, addCandidate, finishInterview, addLog, fetchLogs } from "../controllers/room.controller";

const router: Router = Router();

router.post('/create', authAdmin, createRoom);

router.get('/my-rooms', authAdmin, fetchRooms);

router.post('/add-candidate', authAdmin, addCandidate);

router.patch('/finsh-interview', authAdmin, finishInterview);

router.post('/add-log', authUser, addLog);

router.get('/logs', authAdmin, fetchLogs);


export default router;