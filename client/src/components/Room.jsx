import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

function Room() {
  const { roomID } = useParams();

  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerRef = useRef();
  const wsRef = useRef();
  const localStreamRef = useRef();

  // Get camera and microphone
  const openCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    userVideo.current.srcObject = stream;
    localStreamRef.current = stream;
  };

  useEffect(() => {
    openCamera().then(() => {
      // Connect to WebSocket signaling server
      wsRef.current = new WebSocket(`ws://localhost:8000/join?roomID=${roomID}`);

      wsRef.current.onopen = () => {
        wsRef.current.send(JSON.stringify({ join: true }));
      };

      wsRef.current.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        // First user joins → initiator
        if (msg.join) {
          if (!peerRef.current) createPeer(true);
        }

        // Receive offer → responder
        if (msg.offer) {
          if (!peerRef.current) createPeer(false);

          // Must await setRemoteDescription first
          await peerRef.current.setRemoteDescription(msg.offer);

        //   if (peerRef.current.signalingState === "have-remote-offer") {
        //     const answer = await peerRef.current.createAnswer();
        //     await peerRef.current.setLocalDescription(answer);
        //     wsRef.current.send(JSON.stringify({ answer: peerRef.current.localDescription }));
        // } else {
        //     console.warn("Cannot create answer yet, signalingState =", peerRef.current.signalingState);
        //   }
        // }

          const answer = await peerRef.current.createAnswer();
          await peerRef.current.setLocalDescription(answer);

          wsRef.current.send(JSON.stringify({ answer: peerRef.current.localDescription })
        );
        }

        // Receive answer → initiator
        if (msg.answer) {
          if (peerRef.current.signalingState === "have-local-offer") {
            await peerRef.current.setRemoteDescription(msg.answer);
          }
        }

        // ICE candidate exchange
        if (msg.iceCandidate) {
          try {
            await peerRef.current.addIceCandidate(msg.iceCandidate);
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        }
      };
    });
  }, []);

  // Create RTCPeerConnection
  const createPeer = (isOfferer) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add local tracks once, before creating any offer
    localStreamRef.current.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current);
    });

    // Handle remote tracks
    peer.ontrack = (event) => {
      partnerVideo.current.srcObject = event.streams[0];
    };

    // ICE candidates
    peer.onicecandidate = (e) => {
      if (e.candidate) {
        wsRef.current.send(JSON.stringify({ iceCandidate: e.candidate }));
      }
    };

    // Only initiator creates offer automatically
    if (isOfferer) {
      peer.onnegotiationneeded = async () => {
        if (peer.signalingState !== "stable") return;

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        wsRef.current.send(JSON.stringify({ offer: peer.localDescription }));
      };
    }

    peerRef.current = peer;
    return peer;
  };

  return (
        <div>
            <video autoPlay controls={true} ref={userVideo}></video>
            <video autoPlay controls={true} ref={partnerVideo}></video>
        </div>
    );
}

export default Room;
