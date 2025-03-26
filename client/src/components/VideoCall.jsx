import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../utils/socket";

const VideoCall = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const { roomId, isAdmin } = useParams();

  const userData = JSON.parse(localStorage.getItem("user"));
  const currentUserId = userData?.userId;
  const currentUsername = userData?.username;

  let localStream;
  let peerConnection;

  const servers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    const setupVideoCall = async () => {
      try {
        if (!currentUserId) {
          throw new Error("User not authenticated");
        }

        // Join room with user details
        socket.emit("join-room", {
          roomId,
          userId: currentUserId,
          username: currentUsername,
          isAdmin: isAdmin === "true",
        });

        // Initialize media stream
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localVideoRef.current.srcObject = localStream;

        // WebRTC peer connection setup
        peerConnection = new RTCPeerConnection(servers);
        peerConnection.ontrack = (event) => {
          remoteVideoRef.current.srcObject = event.streams[0];
        };

        localStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, localStream);
        });

        // Socket event listeners
        socket.on("admin-muted-all", () => {
          localStream?.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
        });

        socket.on("call-ended", () => {
          endCall();
        });
      } catch (error) {
        console.error("Video call setup error:", error);
      }
    };

    const endCall = () => {
      localStream?.getTracks().forEach((track) => track.stop());
      peerConnection?.close();
    };

    setupVideoCall();

    return () => {
      socket.emit("leave-room", { roomId, userId: currentUserId });
      socket.off("admin-muted-all");
      socket.off("call-ended");
      endCall();
    };
  }, [roomId, currentUserId, currentUsername, isAdmin]);

  const handleMuteAll = () => {
    socket.emit("admin-mute-all", {
      roomId,
      adminId: currentUserId,
    });
  };

  const handleEndCall = () => {
    socket.emit("admin-end-call", {
      roomId,
      adminId: currentUserId,
    });
  };

  return (
    <div className="video-call">
      <video ref={localVideoRef} autoPlay muted />
      <video ref={remoteVideoRef} autoPlay />
      {isAdmin === "true" && (
        <div className="admin-controls">
          <button onClick={handleMuteAll}>Mute All</button>
          <button onClick={handleEndCall}>End Call</button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
