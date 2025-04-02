import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TwilioVideo from "twilio-video";
import axios from "axios";
import socket from "../utils/socket";
import BASE_URL from "../utils/config";
import "../styles/VideoCall.css";

const VideoCall = () => {
  const localVideoRef = useRef();
  const remoteVideoRefs = useRef({});
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const roomId = location.state?.roomId;
  const isAdmin = location.state?.isAdmin;
  const roomName = location.state?.roomName || "Team Meeting";

  const userData = JSON.parse(localStorage.getItem("user"));
  const currentUserId = userData?.userId;
  const currentUsername = userData?.username;

  const [room, setRoom] = useState(null);
  const [joining, setJoining] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState({});
  const [participantUsernames, setParticipantUsernames] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isAdminMutedAll, setIsAdminMutedAll] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({
    message: "",
    persistent: false,
  });
  const notificationTimer = useRef(null);
  const hasJoined = useRef(false);
  const remoteStreams = useRef({});

  const totalParticipants = Object.keys(remoteParticipants).length + 1;

  const setTimedNotification = (
    message,
    persistent = false,
    duration = 3000
  ) => {
    if (notification.persistent && !persistent) return;
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setNotification({ message, persistent });
    if (!persistent) {
      notificationTimer.current = setTimeout(() => {
        setNotification({ message: "", persistent: false });
        notificationTimer.current = null;
      }, duration);
    }
  };

  const clearNotification = () => {
    if (notificationTimer.current) clearTimeout(notificationTimer.current);
    setNotification({ message: "", persistent: false });
  };

  const forceMute = async () => {
    if (!room) return;
    try {
      room.localParticipant.audioTracks.forEach((publication) => {
        if (publication.track) {
          publication.track.stop();
          room.localParticipant.unpublishTrack(publication.track);
        }
      });
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
      setIsMuted(true);
    } catch (error) {
      console.error("Error forcing mute:", error);
    }
  };

  const toggleAudio = async () => {
    if (!room) return;
    if (isAdminMutedAll && !isAdmin) {
      setTimedNotification(
        "Admin has muted all participants. You cannot unmute.",
        true
      );
      await forceMute();
      return;
    }
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (newMuteState) {
      room.localParticipant.audioTracks.forEach((publication) => {
        if (publication.track) {
          publication.track.stop();
          room.localParticipant.unpublishTrack(publication.track);
        }
      });
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
    } else {
      const newTrack = await TwilioVideo.createLocalAudioTrack();
      await room.localParticipant.publishTrack(newTrack);
      localAudioTrackRef.current = newTrack;
    }
    socket.emit("toggle-audio", {
      userId: currentUserId,
      roomId,
      isAudioEnabled: !newMuteState,
    });
  };

  const handleMuteAll = async () => {
    if (!room || !isAdmin) return;
    if (Object.keys(remoteParticipants).length === 0) {
      setTimedNotification(
        "No participants have joined the room yet to mute.",
        true
      );
      return;
    }
    if (isAdminMutedAll) {
      socket.emit("admin-unmute-all", {
        roomId,
        adminId: currentUserId,
        adminName: currentUsername,
      });
      setIsAdminMutedAll(false);
      const newTrack = await TwilioVideo.createLocalAudioTrack();
      await room.localParticipant.publishTrack(newTrack);
      setIsMuted(false);
    } else {
      socket.emit("admin-mute-all", {
        roomId,
        adminId: currentUserId,
        adminName: currentUsername,
      });
      setIsAdminMutedAll(true);
      await forceMute();
    }
  };

  const endCall = async () => {
    try {
      // Stop local media tracks
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const streamTracks = localVideoRef.current.srcObject.getTracks();
        streamTracks.forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current = null;
      }
      if (room) {
        const allLocalTracks = [
          ...Array.from(room.localParticipant.audioTracks.values()),
          ...Array.from(room.localParticipant.videoTracks.values()),
        ]
          .map((pub) => pub.track)
          .filter(Boolean);
        allLocalTracks.forEach((track) => {
          if (track) {
            track.stop();
            room.localParticipant.unpublishTrack(track);
          }
        });
        room.disconnect();
        setRoom(null);
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (err) {}

      // Call the leaveRoom endpoint to update the database
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      try {
        const response = await axios.post(
          `${BASE_URL}/api/rooms/${roomId}/leave`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // console.log("leaveRoom response:", response.data);
      } catch (apiError) {
        console.error(
          "Error calling leaveRoom endpoint:",
          apiError.response?.data || apiError.message
        );
        throw apiError;
      }

      // Emit user-left socket event
      socket.emit("user-left", {
        userId: currentUserId,
        roomId,
        username: currentUsername,
      });

      // Clean up state
      setRemoteParticipants({});
      remoteStreams.current = {};

      // Navigate to call-ended page
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate("/call-ended", { state: { roomId } });
    } catch (error) {
      console.error("Error during endCall cleanup:", error);
      setNotification({
        message: "Failed to properly end the call. Please try again.",
        persistent: true,
      });
      navigate("/call-ended", { state: { roomId } });
    }
  };

  useEffect(() => {
    if (!roomId || !currentUserId) {
      setError("Missing roomId or userId. Please join a room again.");
      return;
    }

    const joinRoom = async () => {
      if (joining) return; // Prevent multiple join attempts
      setJoining(true);
      setError(null);
      try {
        const response = await fetch(
          `${BASE_URL}/api/generate-token?identity=${currentUserId}&roomId=${roomId}`
        );

        const { token, identity: serverAssignedIdentity } =
          await response.json();

        if (!token) {
          throw new Error("Failed to get access token");
        }

        const twilioRoom = await TwilioVideo.connect(token, {
          name: roomId,
          audio: true,
          // video: { width: 640 },
          video: false, // Video off by default
        });

        // Store audio track
        const localAudioTrack = Array.from(
          twilioRoom.localParticipant.audioTracks.values()
        )[0]?.track;
        if (localAudioTrack) {
          localAudioTrackRef.current = localAudioTrack;
        } else {
          console.warn("No initial audio track found on join");
        }

        // Store video track
        const localVideoTrack = Array.from(
          twilioRoom.localParticipant.videoTracks.values()
        )[0]?.track;
        if (localVideoTrack) {
          localVideoTrackRef.current = localVideoTrack;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = new MediaStream([
              localVideoTrack.mediaStreamTrack,
            ]);
          }
        }

        // Prevent new audio tracks during admin mute
        twilioRoom.localParticipant.on("trackPublished", (publication) => {
          if (publication.track && publication.track.kind === "audio") {
            localAudioTrackRef.current = publication.track;
            if (isAdminMutedAll && !isAdmin) {
              publication.track.stop();
              twilioRoom.localParticipant.unpublishTrack(publication.track);
              localAudioTrackRef.current = null;
            }
          }
        });

        setRoom(twilioRoom);

        const participants = {};
        twilioRoom.participants.forEach((participant) => {
          participants[participant.identity] = participant;
        });
        setRemoteParticipants(participants);

        twilioRoom.on("participantConnected", (participant) => {
          console.log(`Participant ${participant.identity} connected`);
          setRemoteParticipants((prev) => ({
            ...prev,
            [participant.identity]: participant,
          }));
        });

        twilioRoom.on("participantDisconnected", (participant) => {
          console.log(`Participant ${participant.identity} disconnected`);
          setRemoteParticipants((prev) => {
            const updated = { ...prev };
            delete updated[participant.identity];
            return updated;
          });
          delete remoteStreams.current[participant.identity];
        });

        const handleTrackSubscribed = (track, participant) => {
          console.log(
            `Track subscribed for ${participant.identity}: ${track.kind}`
          );
          if (!remoteStreams.current[participant.identity]) {
            remoteStreams.current[participant.identity] = new MediaStream();
          }
          remoteStreams.current[participant.identity].addTrack(
            track.mediaStreamTrack
          );
          const videoElement = remoteVideoRefs.current[participant.identity];
          if (videoElement) {
            videoElement.srcObject =
              remoteStreams.current[participant.identity];
            videoElement.style.display = "block";
            videoElement.play().catch((error) => {
              console.error(
                `Error playing remote media for ${participant.identity}:`,
                error
              );
            });
          }
        };

        const handleTrackUnsubscribed = (track, participant) => {
          console.log(
            `Track unsubscribed for ${participant.identity}: ${track.kind}`
          );
          if (remoteStreams.current[participant.identity]) {
            remoteStreams.current[participant.identity].removeTrack(
              track.mediaStreamTrack
            );
            const videoElement = remoteVideoRefs.current[participant.identity];
            if (videoElement) {
              if (
                remoteStreams.current[participant.identity].getTracks()
                  .length === 0
              ) {
                videoElement.srcObject = null;
              } else {
                videoElement.srcObject =
                  remoteStreams.current[participant.identity];
                videoElement.play().catch((error) => {
                  console.error(
                    `Error playing remote media for ${participant.identity}:`,
                    error
                  );
                });
              }
            }
          }
        };

        const handleTrackDisabled = (track, participant) => {
          console.log(
            `Track disabled for ${participant.identity}: ${track.kind}`
          );
          if (track.kind === "video") {
            const videoElement = remoteVideoRefs.current[participant.identity];
            if (videoElement) {
              videoElement.style.display = "none";
            }
          }
        };

        const handleTrackEnabled = (track, participant) => {
          console.log(
            `Track enabled for ${participant.identity}: ${track.kind}`
          );
          if (track.kind === "video") {
            const videoElement = remoteVideoRefs.current[participant.identity];
            if (videoElement) {
              videoElement.style.display = "block";
              if (!remoteStreams.current[participant.identity]) {
                remoteStreams.current[participant.identity] = new MediaStream();
              }
              remoteStreams.current[participant.identity].addTrack(
                track.mediaStreamTrack
              );
              videoElement.srcObject =
                remoteStreams.current[participant.identity];
              videoElement.play().catch((error) => {
                console.error(
                  `Error playing remote media for ${participant.identity}:`,
                  error
                );
              });
            }
          }
        };

        twilioRoom.participants.forEach((participant) => {
          participant.tracks.forEach((publication) => {
            if (publication.isSubscribed && publication.track) {
              handleTrackSubscribed(publication.track, participant);
            }
          });
          participant.on("trackSubscribed", (track) =>
            handleTrackSubscribed(track, participant)
          );
          participant.on("trackUnsubscribed", (track) =>
            handleTrackUnsubscribed(track, participant)
          );
          participant.on("trackDisabled", (track) =>
            handleTrackDisabled(track, participant)
          );
          participant.on("trackEnabled", (track) =>
            handleTrackEnabled(track, participant)
          );
        });

        twilioRoom.on("participantConnected", (participant) => {
          participant.on("trackSubscribed", (track) =>
            handleTrackSubscribed(track, participant)
          );
          participant.on("trackUnsubscribed", (track) =>
            handleTrackUnsubscribed(track, participant)
          );
          participant.on("trackDisabled", (track) =>
            handleTrackDisabled(track, participant)
          );
          participant.on("trackEnabled", (track) =>
            handleTrackEnabled(track, participant)
          );
        });

        socket.emit("user-joined", {
          userId: currentUserId,
          roomId,
          username: currentUsername,
          socketId: socket.id,
          currentUsers: 0,
          roomStatus: "open",
        });
        socket.emit("get-room-users", { roomId });
      } catch (error) {
        console.error("Error joining room:", error);
        if (error.message.includes("duplicate identity")) {
          // Wait a bit and try again with a new identity
          await new Promise((resolve) => setTimeout(resolve, 1000));
          joinRoom();
          return;
        } else if (error.name === "NotAllowedError") {
          setError(
            "Camera/microphone access denied. Please grant permissions and try again."
          );
        } else if (error.name === "NotFoundError") {
          setMediaError(true);
          console.warn("No camera/microphone found; proceeding without media.");
        } else {
          setError("Failed to join video call: " + error.message);
        }
      } finally {
        setJoining(false);
      }
    };

    joinRoom();

    socket.on("connect", () => {
      if (!hasJoined.current && room) {
        if (room) {
          socket.emit("user-joined", {
            userId: currentUserId,
            roomId,
            username: currentUsername,
            socketId: socket.id,
            currentUsers: 0,
            roomStatus: "open",
          });
          socket.emit("get-room-users", { roomId });
          hasJoined.current = true;
        }
      }
    });

    socket.on("disconnect", () => {
      socket.emit("user-left-room", { userId: currentUserId, roomId });
    });

    socket.on("user-joined-room", (data) => {
      if (data.userId === currentUserId) return;
      setParticipantUsernames((prev) => ({
        ...prev,
        [data.userId]: data.username,
      }));
    });

    socket.on("room-users", ({ users }) => {
      const usernames = {};
      users.forEach((user) => {
        if (user.userId !== currentUserId) {
          usernames[user.userId] = user.username;
        }
      });
      setParticipantUsernames(usernames);
    });

    socket.on("user-video-change", ({ userId, isVideoEnabled }) => {
      const participant = remoteParticipants[userId];
      if (participant) {
        participant.videoTracks.forEach((publication) => {
          if (publication.track) {
            const videoElement = remoteVideoRefs.current[userId];
            if (videoElement) {
              videoElement.style.display = isVideoEnabled ? "block" : "none";
            }
          }
        });
      }
    });

    socket.on("admin-mute-all", ({ message, persistent, noParticipants }) => {
      setIsAdminMutedAll(true);
      if (noParticipants) {
        setTimedNotification(message, persistent);
      } else {
        setTimedNotification(message, persistent);
        forceMute();
      }
    });

    socket.on("force-mute", async () => {
      if (!isAdmin) {
        await forceMute();
        setTimedNotification("Admin has muted all participants", true);
      }
    });

    socket.on("admin-unmute-all", ({ message, persistent }) => {
      setIsAdminMutedAll(false);
      setTimedNotification(message, persistent, 3000);
      if (!isAdmin && isMuted) setIsMuted(false);
    });

    socket.on("mute-enforced", ({ message }) => {
      setTimedNotification(message, true);
    });

    socket.on("call-ended", () => {
      endCall();
    });

    socket.on("user-left-room", ({ userId }) => {
      setRemoteParticipants((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setParticipantUsernames((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      delete remoteStreams.current[userId];
    });

    socket.on("user-disconnected", ({ userId }) => {
      setRemoteParticipants((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setParticipantUsernames((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      delete remoteStreams.current[userId];
    });

    return () => {
      socket.emit("user-left", {
        userId: currentUserId,
        roomId,
        username: currentUsername,
      });
      socket.off("connect");
      socket.off("disconnect");
      socket.off("user-joined-room");
      socket.off("room-users");
      socket.off("user-video-change");
      socket.off("admin-mute-all");
      socket.off("admin-unmute-all");
      socket.off("force-mute");
      socket.off("mute-enforced");
      socket.off("call-ended");
      socket.off("user-left-room");
      socket.off("user-disconnected");

      // Clean up media tracks (if not already cleaned up by endCall)
      if (localAudioTrackRef.current) localAudioTrackRef.current.stop();
      if (localVideoTrackRef.current) localVideoTrackRef.current.stop();
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }
      if (room) {
        const allLocalTracks = [
          ...Array.from(room.localParticipant.audioTracks.values()),
          ...Array.from(room.localParticipant.videoTracks.values()),
        ]
          .map((pub) => pub.track)
          .filter(Boolean);
        allLocalTracks.forEach((track) => track?.stop());
        room.disconnect();
        setRoom(null);
      }
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          const tracks = stream.getTracks();
          tracks.forEach((track) => track.stop());
        } catch (err) {}
      })();
      setRemoteParticipants({});
      remoteStreams.current = {};

      if (notificationTimer.current) clearTimeout(notificationTimer.current);
    };
  }, [roomId, currentUserId, currentUsername, isAdmin]);

  const toggleVideo = async () => {
    if (!room) {
      alert("Cannot toggle video: Not connected to the room.");
      return;
    }
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    if (newVideoState) {
      // Turn video ON
      try {
        const newVideoTrack = await TwilioVideo.createLocalVideoTrack({
          width: 640,
        });
        await room.localParticipant.publishTrack(newVideoTrack);
        localVideoTrackRef.current = newVideoTrack;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([
            newVideoTrack.mediaStreamTrack,
          ]);
          localVideoRef.current.play().catch((error) => {
            console.error("Error playing local video:", error);
          });
        }
      } catch (error) {
        console.error("Error enabling video:", error);
        setIsVideoOn(false);
      }
    } else {
      // Turn video OFF
      room.localParticipant.videoTracks.forEach((publication) => {
        if (publication.track) {
          publication.track.stop();
          room.localParticipant.unpublishTrack(publication.track);
        }
      });
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
    socket.emit("toggle-video", {
      userId: currentUserId,
      roomId,
      isVideoEnabled: newVideoState,
    });
  };
  return (
    <div className="video-call">
      {error ? (
        <div>
          <h1>Error</h1>
          <p>{error}</p>
          <button onClick={() => navigate("/join-room")}>Go Back</button>
        </div>
      ) : (
        <>
          <div className="room-header">
            <h1 className="room-name">{roomName}</h1>
            {/* <div className="room-id">Room ID: {roomId}</div> */}
            <div className="participant-count">
              Participants: {totalParticipants}
            </div>
          </div>
          {notification.message && (
            <div
              className={`notification ${
                !notification.persistent ? "fade-out" : ""
              }`}
            >
              {notification.message}
            </div>
          )}
          <div className={`video-container participants-${totalParticipants}`}>
            <div className="participant-container local">
              {/* <h3 className="participant-name">{currentUsername} (You)</h3> */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className={isVideoOn ? "" : "video-off"}
              />
              {!isVideoOn && (
                <div className="avatar-placeholder">
                  {currentUsername.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="participant-info">
                <span className="participant-name">
                  {currentUsername} (You)
                </span>
                <div className="participant-status">
                  <div
                    className={`status-indicator status-audio ${
                      isMuted ? "muted" : ""
                    }`}
                  ></div>
                  <div
                    className={`status-indicator status-video ${
                      !isVideoOn ? "off" : ""
                    }`}
                  ></div>
                </div>
              </div>
            </div>
            {Object.entries(remoteParticipants).map(([userId]) => (
              <div key={userId} className="participant-container remote">
                {/* <h3 className="participant-name">
                  {participantUsernames[userId] || "Unknown"}
                </h3> */}
                <video
                  ref={(el) => (remoteVideoRefs.current[userId] = el)}
                  autoPlay
                  className={
                    remoteStreams.current[userId]?.getVideoTracks().length
                      ? ""
                      : "video-off"
                  }
                />
                {!remoteStreams.current[userId]?.getVideoTracks().length && (
                  <div className="avatar-placeholder">
                    {participantUsernames[userId]?.charAt(0).toUpperCase() ||
                      "?"}
                  </div>
                )}
                <div className="participant-info">
                  <span className="participant-name">
                    {participantUsernames[userId] || "Unknown"}
                  </span>
                  <div className="participant-status">
                    <div
                      className={`status-indicator status-audio ${
                        remoteStreams.current[userId]?.getAudioTracks().length
                          ? ""
                          : "muted"
                      }`}
                    ></div>
                    <div
                      className={`status-indicator status-video ${
                        remoteStreams.current[userId]?.getVideoTracks().length
                          ? ""
                          : "off"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="controls">
            <button
              onClick={toggleAudio}
              disabled={!room}
              className={isMuted ? "button-mute" : "button-unmute"}
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={toggleVideo}
              disabled={!room}
              className={isVideoOn ? "button-video-on" : "button-video-off"}
            >
              {isVideoOn ? "Video Off" : "Video On"}
            </button>
            {isAdmin ? (
              <>
                <button
                  onClick={handleMuteAll}
                  className={
                    isAdminMutedAll ? "button-unmute-all" : "button-mute-all"
                  }
                >
                  {isAdminMutedAll ? "Unmute All" : "Mute All"}
                </button>
                <button
                  onClick={() =>
                    socket.emit("admin-end-call", {
                      roomId,
                      adminId: currentUserId,
                    })
                  }
                  className="button-end-call"
                >
                  End Call
                </button>
              </>
            ) : (
              <button onClick={endCall} className="button-leave">
                Leave
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCall;
