'use client'
import { useState} from 'react'
import Lobby from '@/components/Lobby'
import MeetPreview from '@/components/MeetPreview';

export default function Room() {

  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [meetStarted, setMeetStarted] = useState(false);

  if(!meetStarted){
    return (
      <Lobby 
        isMicOn={isMicOn}
        setIsMicOn={setIsMicOn}
        isCameraOn={isCameraOn}
        setIsCameraOn={setIsCameraOn}
        videoTrack={videoTrack} 
        setVideoTrack={setVideoTrack} 
        audioTrack={audioTrack} 
        setAudioTrack={setAudioTrack} 
        setMeetStarted={setMeetStarted} 
      />
    )
  }

  return (
    <MeetPreview 
      isMicOn={isMicOn}
      setIsMicOn={setIsMicOn}
      isCameraOn={isCameraOn}
      setIsCameraOn={setIsCameraOn}
      videoTrack={videoTrack} 
      audioTrack={audioTrack} 
    />
  )
}
