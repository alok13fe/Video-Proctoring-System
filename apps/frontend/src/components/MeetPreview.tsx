'use client'
import { useSocket } from '@/contexts/SocketProvider';
import { useState, useEffect, useRef, SetStateAction, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation';
import { FaceDetector, FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import { intializeFaceDetector, initalizeModel, initializeFaceLandmarker } from '@/utils/utils'
import peer from '@/services/peer';

interface MeetPreviewProps{
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
  timestamp: number;
}

export default function MeetPreview({ isMicOn, setIsMicOn, isCameraOn, setIsCameraOn, videoTrack, audioTrack }: MeetPreviewProps) {

  const socket = useSocket();
  const params = useParams<{slug: string}>();
  const router = useRouter();

  const initializeRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const fndRef = useRef<NodeJS.Timeout | null>(null);
  const mtdRef = useRef<NodeJS.Timeout | null>(null);
  const cnfRef = useRef<NodeJS.Timeout | null>(null);
  const lastTime = useRef<number>(-1);

  const [faceDetector, setFaceDetector] = useState<FaceDetector | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

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
    
    if(parsedData.type === 'user-joined'){
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

  async function initialize(){
    if(!initializeRef.current){
      initializeRef.current = true;

      try{
        const faceDetector = await intializeFaceDetector();
        const faceLandmarker = await initializeFaceLandmarker();
        const model = await initalizeModel();

        setFaceDetector(faceDetector);
        setFaceLandmarker(faceLandmarker);
        setModel(model);
      }
      catch(error){
        console.log(error);
      }
    }
  }

  function getGazeDirection(landmarks: NormalizedLandmark[]) {
    if (!landmarks || landmarks.length !== 478) {
      return { direction: 'Face Not Found', horizontalRatio: 0.5, verticalRatio: 0.5 };
    }

    const eyeLandmarks = {
      leftEyeLeftCorner: landmarks[33],
      leftEyeRightCorner: landmarks[133],
      leftEyeIris: landmarks[473],
      
      rightEyeLeftCorner: landmarks[362],
      rightEyeRightCorner: landmarks[263],
      rightEyeIris: landmarks[468],
    };

    const leftEyeHorizontalDist = eyeLandmarks.leftEyeIris.x - eyeLandmarks.leftEyeLeftCorner.x;
    const leftEyeWidth = eyeLandmarks.leftEyeRightCorner.x - eyeLandmarks.leftEyeLeftCorner.x;
    const leftEyeHorizontalRatio = leftEyeHorizontalDist / leftEyeWidth;

    const rightEyeHorizontalDist = eyeLandmarks.rightEyeIris.x - eyeLandmarks.rightEyeLeftCorner.x;
    const rightEyeWidth = eyeLandmarks.rightEyeRightCorner.x - eyeLandmarks.rightEyeLeftCorner.x;
    const rightEyeHorizontalRatio = rightEyeHorizontalDist / rightEyeWidth;

    const avgHorizontalRatio = (leftEyeHorizontalRatio + rightEyeHorizontalRatio) / 2;

    let direction = 'Forward';
    if (avgHorizontalRatio > 0.65) { 
      direction = 'Right';
    } else if (avgHorizontalRatio < 0.35) {
      direction = 'Left';
    }

    return {
      direction: direction,
      horizontalRatio: avgHorizontalRatio,
    };
  }

  const sendLogs = useCallback((payload: ILog) =>{
    if(!socket){
      return;
    }

    socket.send(JSON.stringify({
      type: 'logs',
      payload
    }));
  },[socket]);

  const startProctoring = useCallback(() => {
    if(!videoRef.current || !faceDetector || !faceLandmarker || !model){
      return;
    }

    const startTime = performance.now();
    if (videoRef.current.currentTime - lastTime.current > 0.2) {
      lastTime.current = videoRef.current.currentTime;

      /* Face Detection */
      const detections = faceDetector.detectForVideo(videoRef.current, startTime).detections;

      if(detections.length == 0){
        if(!fndRef.current){
          const timerId = setTimeout(() => {
            if(videoRef.current){
              sendLogs({
                roomId: params.slug,
                eventType: 'no_face_detected',
                message: 'Face not detected for 10s.',
                timestamp: videoRef.current.currentTime
              });
            }
            fndRef.current = null;
          }, 10000);

          fndRef.current = timerId;
        }
      }
      else if(detections.length == 1){
        if (fndRef.current) {
          clearTimeout(fndRef.current);
          fndRef.current = null;
        }
        if (mtdRef.current) {
          clearTimeout(mtdRef.current);
          mtdRef.current = null; 
        }
      }
      else if(detections.length > 1){
        if(!mtdRef.current){
          const timerId = setTimeout(() => {
            if(videoRef.current){
              sendLogs({
                roomId: params.slug,
                eventType: 'multiple_face_detected',
                message: 'Multiple faces detected.',
                timestamp: videoRef.current.currentTime
              })
            }
            mtdRef.current = null;
          }, 500);

          mtdRef.current = timerId;
        }
      }

      /* Gaze Detection */
      const faceLandmarkerResult = faceLandmarker.detectForVideo(videoRef.current, startTime);

      if (faceLandmarkerResult.faceLandmarks.length > 0) {
        const landmarks = faceLandmarkerResult.faceLandmarks[0];
        const gaze = getGazeDirection(landmarks);

        if (gaze.direction === 'Left' || gaze.direction === 'Right') {
          if(!cnfRef.current){
            const timerId = setTimeout(() => {
              if(videoRef.current){
                sendLogs({
                  roomId: params.slug,
                  eventType: 'candidate_not_focused',
                  message: 'Candidate not looking screen for more than 5 sec.',
                  timestamp: videoRef.current.currentTime
                })
              }
              cnfRef.current = null;
            }, 5000);

            cnfRef.current = timerId;
          }
        }
        else{
          if(cnfRef.current){
            clearTimeout(cnfRef.current);
            cnfRef.current = null;
          }
        }
      }

      /* Object Detection */
      model.detect(videoRef.current).then(predictions => {
        predictions.map((obj) => {
          if(obj.class === 'cell phone' || obj.class === 'laptop' || obj.class === 'tv'){
            if(videoRef.current){
              sendLogs({
                roomId: params.slug,
                eventType: 'electronics_detected',
                message: `${obj.class} detected`,
                timestamp: videoRef.current.currentTime
              })
            }
          }
          else if(obj.class === 'book'){
            if(videoRef.current){
              sendLogs({
                roomId: params.slug,
                eventType: 'book_detected',
                message: `${obj.class} detected`,
                timestamp: videoRef.current.currentTime
              })
            }
          }
        })
      });
    }

    window.requestAnimationFrame(startProctoring);
  },[params, faceDetector, faceLandmarker, model, sendLogs]);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video && videoTrack) {
      const videoStream = new MediaStream([videoTrack]);
      video.srcObject = videoStream;
      video.addEventListener('loadeddata', startProctoring);
      
      const mediaRecorder = new MediaRecorder(videoStream);
      setMediaRecorder(mediaRecorder);

      video.onloadedmetadata = () => {
        video.play();
        // mediaRecorder.sptart();
      };

      return(() => {
        video.removeEventListener('loadeddata', startProctoring);
      });
    }
  }, [videoTrack, startProctoring]);

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

      video.onloadedmetadata = async () => {
        console.log('Playing Interviewer Video');
        await video.play();
      };
    }
  },[remoteStream]);

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

  function handleLeaveRoom(){
    if(!socket){
      return;
    }

    socket.send(JSON.stringify({
      type: 'leave-room',
      payload: {
        roomId: params.slug
      }
    }));

    router.push('/');
  }

  return (
    <main>
      <section className='w-full min-h-[calc(100vh-53px)] bg-gray-100'>
        <div className='p-5 md:p-10 container bg-white'>
          <div className='mb-5 w-full flex gap-2'>
            <div className='basis-3/4 p-5'>
              <div className='aspect-video bg-gray-100'>
                <video 
                  ref={videoRef}
                  className={`w-full ${isCameraOn? 'block': 'hidden'} aspect-video object-cover transform -scale-x-100`}
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            </div>
            <div className='basis-1/4 p-5'>
              <div className='aspect-video border-gray-500 border'>
                <video 
                  ref={remoteVideoRef}
                  className={`w-full aspect-video ${remoteStream ? '' : 'hidden'} object-cover transform -scale-x-100`}
                  autoPlay
                  muted
                />
              </div>
            </div>
          </div>
          <div className='w-full flex justify-center items-center gap-5'>
            <div className='h-10 w-10 bg-gray-200 flex items-center justify-center rounded-full border-gray-400 border'
              onClick={toggleAudio}
            >
              {
                isMicOn ?
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-icon lucide-mic"><path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/></svg>
                :
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mic-off-icon lucide-mic-off"><path d="M12 19v3"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M16.95 16.95A7 7 0 0 1 5 12v-2"/><path d="M18.89 13.23A7 7 0 0 0 19 12v-2"/><path d="m2 2 20 20"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/></svg>
              }
            </div>
            <div className='h-10 w-10 bg-gray-200 flex items-center justify-center rounded-full border-gray-400 border'
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
              onClick={handleLeaveRoom}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone-icon lucide-phone"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
