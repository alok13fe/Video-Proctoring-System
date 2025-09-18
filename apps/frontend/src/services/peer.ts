class PeerService {
  public peerConnection: RTCPeerConnection | null = null;

  constructor(){
    if(!this.peerConnection){
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:global.stun.twilio.com:3478"
            ]
          }
        ]
      });
    }
  }

  public async getOffer() {
    if(this.peerConnection){
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    }
  }

  public async getAnswer(offer: RTCSessionDescriptionInit){
    if(this.peerConnection){
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      return answer;
    }
  }

  public async setRemoteDescription(answer: RTCSessionDescriptionInit){
    if(this.peerConnection){
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  public closePeer() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

const peer = new PeerService();
export default peer;