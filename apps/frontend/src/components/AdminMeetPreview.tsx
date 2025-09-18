'use client'
import { useState, useEffect, useRef, useCallback, SetStateAction } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocket } from '@/contexts/SocketProvider'
import axios from 'axios'
import peer from '@/services/peer'

interface AdminMeetPreviewProps{
  isMicOn: boolean;
  setIsMicOn: React.Dispatch<SetStateAction<boolean>>;
  isCameraOn: boolean;
  setIsCameraOn: React.Dispatch<SetStateAction<boolean>>;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
}

interface ILog {
  roomId: string;
  eventType: string;
  message: string;
}

interface IJoinRequest {
  userId: number;
  firstName: string;
  lastName: string;
}

export default function AdminMeetPreview({isMicOn, setIsMicOn, isCameraOn, setIsCameraOn, videoTrack, audioTrack}: AdminMeetPreviewProps) {

  const socket = useSocket();
  const params = useParams<{slug: string}>();
  const router = useRouter();

  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [joinRequests, setJoinRequests] = useState<IJoinRequest[]>([]);
  const [logs, setLogs] = useState<ILog[]>([]);

  const handleCallUser = useCallback(async() => {
    if(!socket || !audioTrack || !videoTrack){
      return;
    }

    const offer = await peer.getOffer();
    
    const localStream = new MediaStream([audioTrack, videoTrack]);
    localStream.getTracks().forEach(track => {
      peer.peerConnection?.addTrack(track, localStream);
    })

    setTimeout(() => {
      socket.send(JSON.stringify({
        type: 'outgoing-call',
        payload: {
          roomId: params.slug,
          offer
        }
      }));
    },500);
  },[socket, params, audioTrack, videoTrack]);

  const handleIncomingCall = useCallback(async(offer: RTCSessionDescriptionInit) => {
    if(!socket || !audioTrack || !videoTrack){
      return;
    }
    
    const stream = new MediaStream([audioTrack, videoTrack]);
    peer.peerConnection?.addTrack(videoTrack, stream);
    peer.peerConnection?.addTrack(audioTrack, stream);
    
    const answer = await peer.getAnswer(offer);
    
    socket.send(JSON.stringify({
      type: 'call-accepted',
      payload: {
        roomId: params.slug,
        answer
      }
    }));
  },[socket, params, videoTrack, audioTrack]);

  const handleCallAccepted = useCallback(async (answer: RTCSessionDescriptionInit) => {
    await peer.setRemoteDescription(answer);
  },[]);

  const handleNegotiationNeeded = useCallback(async () => {
    if(!socket){
      return;
    }
    const offer = await peer.getOffer();
    socket.send(JSON.stringify({
      type: 'negotiation-needed',
      payload: {
        roomId: params.slug,
        offer
      }
    }));
  },[socket, params]);

  const handleIncomingNegotiation = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if(!socket){
      return;
    }

    const answer = await peer.getAnswer(offer);
    socket.send(JSON.stringify({
      type: 'negotiation-done',
      payload: {
        roomId: params.slug,
        answer
      }
    }));
  },[socket, params]);

  const handleNegotiationFinal = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (peer.peerConnection?.signalingState === "have-local-offer") {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Failed to set remote description:", error);
      }
    } else {
      console.warn("Received an answer in the wrong state:", peer.peerConnection?.signalingState);
    }
  },[]);

  const handleIceCandidate = useCallback((event: RTCPeerConnectionIceEvent) => {
    if(!socket){
      return;
    }

    if (event.candidate) {
      socket.send(JSON.stringify({
        type: 'new-ice-candidate',
        payload: {
          roomId: params.slug,
          iceCandidate: event.candidate
        }
      }));
    }
  },[socket, params]);

  const handleNewIceCandidate = useCallback(async(iceCandidate: RTCIceCandidateInit) => {
    await peer.peerConnection?.addIceCandidate(iceCandidate);
  },[]);

  const handleMessage = useCallback((event: MessageEvent) => {
    const parsedData = JSON.parse(event.data);
    console.log(parsedData);

    if(parsedData.type === 'logs'){
      setLogs(prev => [...prev, parsedData.payload]);
    }
    else if(parsedData.type === 'ask-to-join'){
      setJoinRequests(prev => {
        if (prev.some(req => req.userId === parsedData.payload.userId)) {
          return prev;
        }
        return [...prev, parsedData.payload];
      });
    }
    else if(parsedData.type === 'user-joined'){
      handleCallUser();
    }
    else if(parsedData.type === 'user-left'){
      peer.closePeer();
      setRemoteStream(null);
    }
    else if(parsedData.type === 'incoming-call'){
      handleIncomingCall(parsedData.payload.offer);
    }
    else if(parsedData.type === 'call-accepted'){
      handleCallAccepted(parsedData.payload.answer);
    }
    else if(parsedData.type === 'negotiation-needed'){
      handleIncomingNegotiation(parsedData.payload.offer);
    }
    else if(parsedData.type === 'negotiation-final'){
      handleNegotiationFinal(parsedData.payload.answer);
    }
    else if(parsedData.type === 'new-ice-candidate'){
      handleNewIceCandidate(parsedData.payload.iceCandidate);
    }
  },[handleCallUser, handleIncomingCall, handleCallAccepted, handleIncomingNegotiation, handleNegotiationFinal, handleNewIceCandidate]);
  
  useEffect(() => {
    if (!socket) {
      return;
    }
    
    socket.addEventListener('message', handleMessage);
    return () => {
      socket.removeEventListener('message', handleMessage);
    }
  },[socket, handleMessage]);

  useEffect(() => {
    const handleTrackEvent = (event: RTCTrackEvent) => {
      const remoteStream = event.streams;
      console.log("Got remote stream", remoteStream[0]);
      setRemoteStream(remoteStream[0]);
    };

    const handleConnectionStateChange = (event: Event) => {
      if (peer.peerConnection?.connectionState === 'connected') {
        console.log('Peers Connected');
      }
    }
    
    peer.peerConnection?.addEventListener('track', handleTrackEvent);
    peer.peerConnection?.addEventListener('connectionstatechange', handleConnectionStateChange);
    
    return () => {
      peer.peerConnection?.removeEventListener('track', handleTrackEvent);
      peer.peerConnection?.removeEventListener('connectionstatechange', handleConnectionStateChange);
    };
  }, []);

  useEffect(() => {
    peer.peerConnection?.addEventListener('icecandidate', handleIceCandidate);
    
    return () => {
      peer.peerConnection?.removeEventListener('icecandidate', handleIceCandidate);
    };
  }, [handleIceCandidate]);

  useEffect(() => {
    peer.peerConnection?.addEventListener('negotiationneeded', handleNegotiationNeeded);
    
    return () => {
      peer.peerConnection?.removeEventListener('negotiationneeded', handleNegotiationNeeded);
    }
  },[handleNegotiationNeeded]);
  
  useEffect(() => {
    const video = remoteVideoRef.current;
    if (video && remoteStream) {
      video.srcObject = remoteStream;

      video.onloadedmetadata = () => {
        console.log('Playing Candidate Video');
        video.play();
      };
    }
  },[remoteStream]);

  async function addCandidate(userId: number,){
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/room/add-candidate`,
        {
          roomId: params.slug,
          userId
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('admin-token')}`
          }
        }
      );

      console.log(response);
      setJoinRequests([]);
    } catch (error) {
      console.log(error);
    }
  }

  function toggleAudio(){
    if(!audioTrack){
      return;
    }
    audioTrack.enabled = !isMicOn;
    setIsMicOn(curr => !curr);
  }
  
  function toggleVideo(){
    if(!videoTrack){
      return;
    }
    videoTrack.enabled = !isCameraOn;
    setIsCameraOn(curr => !curr);
  }

  async function handleFinshInterview(){
    if(!socket){
      return;
    }

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/room/finsh-interview`, 
        {
          roomId: params.slug
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('admin-token')}`
          }
        }
      );

      socket.send(JSON.stringify({
        type: 'leave-room',
        payload: {
          roomId: params.slug
        }
      }));
      router.push('/admin');
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <main>
      <section className='w-full h-[calc(100vh-53px)] bg-gray-100'>
        <div className='p-5 md:p-10 container bg-white'>
          <div className='pb-5 w-full flex flex-col md:flex-row gap-2'>
            <div className='basis-2/3 p-5'>
              <p className='mb-2 text-2xl font-semibold'>Candidate</p>
              <div className='aspect-video bg-gray-100'>
                <video 
                  ref={remoteVideoRef}
                  className={`w-full aspect-video ${remoteStream ? '' : 'hidden'} object-cover transform -scale-x-100`}
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </div>
            <div className='basis-1/3 p-5'>
              <p className='mb-2 font-semibold text-2xl'>Events</p>
              <div className='h-98 space-y-2 border-gray-500 border overflow-y-auto'>
                {
                  joinRequests.map((req, idx) => {
                    return (
                      <div 
                        key={idx}
                        className='w-full p-1 border rounded'
                      >
                        <p className='mb-2 '><span className='capitalize'>{req.firstName + ' ' + req.lastName}</span> requested to join</p>
                        <div className='flex justify-center gap-4'>
                          <button 
                            className='px-1 bg-green-200 text-green-600 border'
                            onClick={() => {addCandidate(req.userId)}}
                          >
                            Accept
                          </button>
                          <button className='px-1 bg-red-200 text-red-600 border'>Decline</button>
                        </div>                          
                      </div>
                    )
                  })
                }

                {
                  logs.map((log, idx) => {
                    return (
                      <p key={idx} className={`m-0 px-2 py-1  ${idx%2 == 0 ? 'bg-gray-100' : ''} border-b`}>{log.message}</p>
                    )
                  })
                }
              </div>
            </div>
          </div>
          <div className='w-full flex justify-center items-center gap-5'>
            <div 
              className='h-10 w-10 bg-gray-200 flex items-center justify-center rounded-full border-gray-400 border'
              onClick={toggleAudio}
            >
              {
                isMicOn ?
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-icon lucide-mic"><path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/></svg>
                :
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off-icon lucide-mic-off"><path d="M12 19v3"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M16.95 16.95A7 7 0 0 1 5 12v-2"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"/><path d="m2 2 20 20"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>
              }
            </div>
            <div 
              className='h-10 w-10 bg-gray-200 flex items-center justify-center rounded-full border-gray-400 border'
              onClick={toggleVideo}  
            >
              {
                isCameraOn ?
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera-icon lucide-camera"><path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/></svg>
                :
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera-off-icon lucide-camera-off"><path d="M14.564 14.558a3 3 0 1 1-4.122-4.121"/><path d="m2 2 20 20"/><path d="M20 20H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 .819-.175"/><path d="M9.695 4.024A2 2 0 0 1 10.004 4h3.993a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v7.344"/></svg>
              }
            </div>
            <div 
              className='h-10 w-10 bg-red-700 text-white flex items-center justify-center rounded-full'
              onClick={handleFinshInterview}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone-icon lucide-phone"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
