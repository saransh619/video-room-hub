import React, { useEffect, useRef } from "react";

const VideoCall = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  let localStream;
  let peerConnection;

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    const startVideoCall = async () => {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localVideoRef.current.srcObject = localStream;

      peerConnection = new RTCPeerConnection(servers);
      peerConnection.ontrack = (event) => {
        remoteVideoRef.current.srcObject = event.streams[0];
      };

      localStream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, localStream));
    };

    startVideoCall();
  }, []);

  return (
    <div className="video-call">
      <video ref={localVideoRef} autoPlay muted />
      <video ref={remoteVideoRef} autoPlay />
    </div>
  );
};

export default VideoCall;
