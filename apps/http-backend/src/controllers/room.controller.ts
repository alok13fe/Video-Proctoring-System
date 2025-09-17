import { Request, Response } from "express";
import { nanoid } from 'nanoid';
import { prismaClient, Status } from "@repo/db/client";

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
          status: true,
          createdAt: true
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
        createdAt: true
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
        status: Status.ONGOING
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
