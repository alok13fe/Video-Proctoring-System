import dotenv from "dotenv";
dotenv.config();

import { createClient } from "redis";
import axios from "axios";

const client = createClient({
  url: process.env.REDIS_URL
});


async function main(){
  await client.connect();

  while(true){
    const result = await client.brPop("logs", 0);

    if(!result){
      continue;
    }

    const {key: queueName, element: data} = result;

    if(typeof(data) !== 'string'){
      return;
    }
    
    try {
      const parsedData = JSON.parse(data);

      if(queueName === 'logs'){
        const {roomId, eventType, message, timestamp, token} = parsedData;
        
        await axios.post(
          `${process.env.BACKEND_URL}/room/add-log`,
          {
            roomId,
            eventType,
            message,
            timestamp
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
      }
    } catch (error) {
      console.log(error);
    }
  }
}

main();