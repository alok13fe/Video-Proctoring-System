import dotenv from 'dotenv';
dotenv.config();

import { WebSocketServer, WebSocket } from 'ws';
import { prismaClient, Status } from '@repo/db/client';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { logSchema } from '@repo/common/schema';

const wss = new WebSocketServer({port: 1234});

const client = createClient({
  url: process.env.REDIS_URL
});
client.connect();

const users: Record<number, WebSocket> = {};
const rooms: Record<string, Set<WebSocket>> = {};

async function authenticateUser(token: string): Promise<number | null> {
  try {
    if(!process.env.JWT_SECRET){
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }
  
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if(typeof decoded === 'string'){
      return null;
    }
  
    if(!decoded || !decoded.id){
      return null;
    }

    /* Check if User Exists */
    const user = await prismaClient.user.findFirst({
      where: {
        id: decoded.id,
      }
    });

    if(!user){
      return null;
    }
  
    return decoded.id;
  } catch (error) {
    return null;
  }
}

function broadcastMessage(roomId: string, message: object, excludeClient?: WebSocket): void{
  if(rooms[roomId]){
    rooms[roomId].forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client !== excludeClient) {
        client.send(JSON.stringify(message));
      }
    })
  }
}

wss.on("connection", async function connection(ws, req){
  const token = req.url?.split('token=')[1];

  if(!token){
    ws.close(1008, 'Authentication Token Required');
    return;
  }

  const userId = await authenticateUser(token);

  if(!userId){
    ws.close(1008, 'Invalid token');
    return;
  }

  users[userId] = ws;

  ws.on('message', async (data, isBinary) => {  
    const message = isBinary ? data : data.toString();
    if(typeof message !== 'string'){
      return;
    }
    
    let parsedData, type, payload;
    try {
      parsedData = JSON.parse(message);
      type = parsedData.type;
      payload = parsedData.payload;
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: {
          message: 'Invalid Message Format'
        }
      })); 
    }

    if(type === 'join-room'){
      try {
        const { roomId } = payload;
        
        if(!roomId || typeof(roomId) !== 'string'){
          ws.send(JSON.stringify({
            type: 'error',
            payload: {
              message: 'Room Id is required.'
            }
          }));
          return;
        }
        
        /* Check if Room Exists */
        const room = await prismaClient.room.findFirst({
          where: {
            slug: roomId,
            status: { in: [Status.ACTIVE, Status.ONGOING] },
          }
        });

        if(!room){
          ws.send(JSON.stringify({
            type: 'error',
            payload: {
              message: "Room doesn't exists."
            }
          }));
          return;
        }

        if(room.adminId === userId || room.candidateId === userId){
          if(!rooms[roomId]){
            rooms[roomId] = new Set<WebSocket>();
          }

          if(!rooms[roomId].has(ws)){
            rooms[roomId].add(ws);
          }

          ws.send(JSON.stringify({
            type: 'join-success',
            payload: {
              message: `Successfully joined Room: ${roomId}.`  
            }
          }));

          const joinNotification = {
            type: 'user-joined',
            payload: {
              message: `User: ${userId} joined Room: ${roomId}`
            }
          }
          broadcastMessage(roomId, joinNotification, ws);
        }
        else if(room.candidateId === null){
          if(!rooms[roomId]){
            ws.send(JSON.stringify({
              type: 'error',
              payload: {
                message: 'Host has not joined Yet.'
              }
            }));
          }
          else{
            const user = await prismaClient.user.findFirst({
              where: {
                id: userId,
              }
            });

            if(!user){
              return;
            }

            const notification = {
              type: 'ask-to-join',
              payload: {
                userId,
                firstName: user.firstName,
                lastName: user.lastName
              }
            }
            broadcastMessage(roomId, notification);
          }
          return;
        }
        else{
          ws.send(JSON.stringify({
            type: 'error',
            payload: {
              message: 'Room is already Occupied'
            }
          }));
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
    else if(type === 'join-accepted'){
      if(!payload.userId || !payload.roomId){
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        })); 
        return;
      }

      const room = await prismaClient.room.findFirst({
        where: {
          slug: payload.roomId,
          adminId: userId,
          candidateId: payload.userId
        }
      });

      if(!room){
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Unauthorized Request'
          }
        })); 
        return;
      }

      // users[payload.userId]
      // .send(JSON.stringify({
      //   type: 'join-success',
      //   payload: {
      //     message: ''
      //   }
      // }));
    }
    else if(type === 'logs'){
      try {
        const { roomId, eventType, message, timestamp } = payload;

        /* Input Validation */
        logSchema.parse({
          roomId,
          eventType,
          message,
          timestamp
        });

        await client.lPush("logs", JSON.stringify({roomId, eventType, message, timestamp, token}));
        broadcastMessage(roomId, parsedData, ws);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
    else if(type === 'outgoing-call'){
      const { roomId, offer } = payload;
      
      if(!roomId || !offer){
        console.log(payload);
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        })); 
      }

      const room = await prismaClient.room.findFirst({
        where: {
          slug: roomId
        }
      });

      if(!room){
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Room Id'
          }
        })); 
      }

      if(room?.adminId === userId || room?.candidateId === userId){
        broadcastMessage(roomId, {...parsedData, type: 'incoming-call'}, ws);
      }
      else{
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Unauthorized Request'
          }
        })); 
      }
    }
    else if(type === 'call-accepted'){
      const { roomId, answer } = payload;
      
      if(!roomId || !answer){
        console.log(payload);
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        })); 
      }

      broadcastMessage(roomId, parsedData, ws);
    }
    else if(type === 'negotiation-needed'){
      const { roomId, offer } = payload;
      
      if(!roomId || !offer){
        console.log(payload);
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        })); 
      }

      broadcastMessage(roomId, parsedData, ws);
    }
    else if(type === 'negotiation-done'){
      const { roomId, answer } = payload;
      
      if(!roomId || !answer){
        console.log(payload);
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        })); 
      }

      broadcastMessage(roomId, { type: 'negotiation-final', payload }, ws);
    }
    else if(type === 'new-ice-candidate'){
      const { roomId, iceCandidate } = payload;
      
      if(!roomId || !iceCandidate){
        console.log(payload);
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        })); 
      }

      broadcastMessage(roomId, parsedData, ws);
    }
    else if(type === 'leave-room'){
      try {
        const { roomId } = payload;
  
        if(!roomId || typeof(roomId) !== 'string'){
          ws.send(JSON.stringify({
            type: 'error',
            payload: {
              message: 'Room Id is required.'
            }
          }));
          return;
        }
  
        if(rooms[roomId] && rooms[roomId].has(ws)){
          rooms[roomId].delete(ws);
  
          if (rooms[roomId].size === 0) {
            delete rooms[roomId];
          }
        }
  
        if(rooms[roomId]){
          const leaveNotification = {
            type: 'user-left',
            payload: {
              message: `User: ${userId} joined Room: ${roomId}`
            }
          }
          broadcastMessage(roomId, leaveNotification, ws);
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          payload: {
            message: 'Invalid Message Format'
          }
        }));
      }
    }
  });
});