import { Request, Response } from "express";
import { nanoid } from 'nanoid';
import { prismaClient, Status } from "@repo/db/client";
import { logSchema } from "@repo/common/schema";

export async function createRoom(req: Request, res: Response){
  try {
    let roomId, roomIdExists;
    
    do{
      roomId = nanoid(10);

      roomIdExists = await prismaClient.room.findFirst({
        where: {
          slug: roomId
        },
        select: {
          id: true,
          slug: true,
          candidateId: true,
          status: true
        }
      });
    } while(roomIdExists);

    const room = await prismaClient.room.create({
      data: {
        slug: roomId,
        admin: {
          connect: {
            id: req.userId
          }
        }
      }
    });

    res
    .status(200)
    .json({
      success: true,
      data: {
        room
      },
      message: 'Room created successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't create room.",
      error
    });
  }
}

export async function fetchRooms(req: Request, res: Response){
  try {
    const rooms = await prismaClient.room.findMany({
      where: {
        adminId: req.userId
      },
      select: {
        id: true,
        slug: true,
        candidateId: true,
        status: true,
        startTime: true,
        endTime: true
      }
    });

    res
    .status(200)
    .json({
      success: true,
      data: {
        rooms
      },
      message: 'Room created successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't fetch rooms.",
      error
    });
  }
} 

export async function addCandidate(req: Request, res: Response){
  try {
    const { roomId, userId } = req.body;

    if(!roomId || !userId){
      res
      .status(400)
      .json({
        success: false,
        message: "Room ID and User ID is required",
      });
      return;
    }

    /* Check if Room Exists */
    const room = await prismaClient.room.findFirst({
      where: {
        slug: roomId,
        adminId: req.userId,
        candidateId: null
      }
    });

    if(!room){
      res
      .status(400)
      .json({
        success: false,
        message: "Room ID is Invalid",
      });
      return;
    }

    const updatedResponse = await prismaClient.room.update({
      where: {
        id: room.id
      },
      data: {
        candidateId: userId,
        status: Status.ONGOING,
        startTime: new Date()
      }
    });
    
    res
    .status(200)
    .json({
      success: true,
      data: {
        room: updatedResponse
      },
      message: 'Candidate added successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't add Candidate.",
      error
    });
  }
}

export async function finishInterview(req: Request, res: Response){
  try {
    const { roomId } = req.body;

    if(!roomId){
      res
      .status(400)
      .json({
        success: false,
        message: "Room ID is required",
      });
      return;
    }

    /* Check if Room Exists */
    const room = await prismaClient.room.findFirst({
      where: {
        slug: roomId,
        adminId: req.userId,
      }
    });

    if(!room){
      res
      .status(400)
      .json({
        success: false,
        message: "Room ID is Invalid",
      });
      return;
    }

    const updatedResponse = await prismaClient.room.update({
      where: {
        id: room.id
      },
      data: {
        status: Status.COMPLETED,
        endTime: new Date()
      }
    });

    res
    .status(200)
    .json({
      success: true,
      data: {
        room: updatedResponse
      },
      message: 'Interview finished successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't finish Interview.",
      error
    });
  }
}

export async function addLog(req: Request, res: Response){
  try {
    const { roomId, eventType, message, timestamp } = req.body;

    /* Input Validation */
    logSchema.parse({
      roomId,
      eventType,
      message,
      timestamp
    });

    /* Check if Room Exists */
    const room = await prismaClient.room.findFirst({
      where: {
        slug: roomId,
        candidateId: req.userId,
      }
    });

    if(!room){
      res
      .status(400)
      .json({
        success: false,
        message: "Room ID is Invalid",
      });
      return;
    }

    await prismaClient.log.create({
      data: {
        roomId: room.id,
        userId: req.userId!,
        eventType,
        message,
        timestamp
      }
    });

    res
    .status(200)
    .json({
      success: true,
      message: 'Log Added successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't add Log.",
      error
    });
  }
}

export async function fetchLogs(req: Request, res: Response){
  try {
    const { roomId, candidateId } = req.query;

    if(!roomId || typeof(roomId) !== 'string' || !candidateId){
      res
      .status(400)
      .json({
        success: false,
        message: "Room ID is required",
      });
      return;
    }

    /* Check if Room Exists */
    const room = await prismaClient.room.findFirst({
      where: {
        slug: roomId,
        adminId: req.userId,
        candidateId: parseInt(candidateId as unknown as string)
      },
      include: {
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        logs: true
      },
    });

    if(!room){
      res
      .status(400)
      .json({
        success: false,
        message: "Room ID is Invalid",
      });
      return;
    }

    res
    .status(200)
    .json({
      success: true,
      data: {
        candidate: room.candidate,
        logs: room.logs,
        startTime: room.startTime,
        endTime: room.endTime
      },
      message: 'Interview finished successfully!'
    });
  } catch (error) {
    console.log(error);
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Couldn't fetch Logs.",
      error
    });
  }
}