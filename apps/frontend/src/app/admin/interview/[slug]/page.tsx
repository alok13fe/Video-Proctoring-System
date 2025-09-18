'use client'
import { useState, useEffect } from 'react'
import AdminLobby from '@/components/AdminLobby'
import AdminMeetPreview from '@/components/AdminMeetPreview';

export default function Interview() {

  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [meetStarted, setMeetStarted] = useState(false);

  useEffect(() => {
    return () => {
      if (audioTrack && videoTrack) {
        audioTrack.stop();
        videoTrack.stop();
      }
    };
  }, [audioTrack, videoTrack]);

  if(!meetStarted){
    return (
      <AdminLobby 
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
    <AdminMeetPreview 
      isMicOn={isMicOn}
      setIsMicOn={setIsMicOn}
      isCameraOn={isCameraOn}
      setIsCameraOn={setIsCameraOn}
      videoTrack={videoTrack} 
      audioTrack={audioTrack} 
    />
  )
}
