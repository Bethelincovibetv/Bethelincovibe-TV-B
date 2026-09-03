import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export type AvatarAnimationState = "entrance" | "waving" | "talking" | "idle";

interface Avatar3DStageProps {
  animState: AvatarAnimationState;
  isTalking: boolean;
  speechVolumeLevel?: number; // 0 to 1 for live lip-sync jaw opening
  voiceStyle?: "friendly" | "formal" | "energetic";
  className?: string;
  avatarGender?: "female" | "male";
}

/**
 * High-performance, realistic-styled Three.js 3D Humanoid Concierge Avatar.
 * Features:
 * - Natural skin PBR materials & tailored formal business attire
 * - Procedural blinking eyes with realistic pupils and reflections
 * - Articulated mouth & jaw rigging with live audio lip-sync modulation
 * - Full skeletal animation transitions:
 *   * entrance (steps forward onto spotlight podium)
 *   * waving (friendly welcoming hand wave)
 *   * talking (expressive jaw movements, head nods, cadence gestures)
 *   * idle (sinusoidal diaphragmatic breathing cycle, micro head tilts, blinking)
 * - Studio lighting setup with warm key light, soft fill light, and glowing LED rim
 */
export default function Avatar3DStage({
  animState,
  isTalking,
  speechVolumeLevel = 0,
  voiceStyle = "friendly",
  className = "w-full h-full",
  avatarGender = "female",
}: Avatar3DStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // References to dynamic model parts for animation
  const stateRef = useRef({
    animState,
    isTalking,
    speechVolumeLevel,
    clock: new THREE.Clock(),
    head: null as THREE.Group | null,
    jaw: null as THREE.Mesh | null,
    mouthInner: null as THREE.Mesh | null,
    leftEye: null as THREE.Mesh | null,
    rightEye: null as THREE.Mesh | null,
    leftEyelid: null as THREE.Mesh | null,
    rightEyelid: null as THREE.Mesh | null,
    rightArm: null as THREE.Group | null,
    rightForearm: null as THREE.Group | null,
    leftArm: null as THREE.Group | null,
    torso: null as THREE.Group | null,
    characterRoot: null as THREE.Group | null,
    podiumRing: null as THREE.Mesh | null,
    keyLight: null as THREE.SpotLight | null,
    nextBlinkTime: 2.0,
    isBlinking: false,
    blinkProgress: 0,
  });

  // Keep stateRef in sync with props without recreating scene
  useEffect(() => {
    stateRef.current.animState = animState;
    stateRef.current.isTalking = isTalking;
    stateRef.current.speechVolumeLevel = speechVolumeLevel;
  }, [animState, isTalking, speechVolumeLevel]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animFrameId: number;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0c16, 0.08);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.35, 2.7);
    camera.lookAt(0, 1.25, 0);

    // 3. WebGL Renderer with performance optimizations
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 4. Lighting Setup (Professional 3-Point Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.9);
    scene.add(ambientLight);

    // Key Spotlight (Warm, casting soft shadows on avatar)
    const keyLight = new THREE.SpotLight(0xffedd5, 4.0, 15, Math.PI / 4.5, 0.45, 1);
    keyLight.position.set(1.2, 3.2, 2.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);
    stateRef.current.keyLight = keyLight;

    // Soft Cyan/Blue Rim Light (Cyber luxury edge separation)
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 2.2);
    rimLight.position.set(-1.8, 2.4, -1.8);
    scene.add(rimLight);

    // Subtle Under-Fill / Stage Glow Light
    const stageLight = new THREE.PointLight(0xf59e0b, 1.8, 4);
    stageLight.position.set(0, 0.2, 0.3);
    scene.add(stageLight);

    // 5. Build Humanoid Concierge 3D Character
    const characterRoot = new THREE.Group();
    scene.add(characterRoot);
    stateRef.current.characterRoot = characterRoot;

    // 5A. Podium Base
    const podiumGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.12, 32);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x111422,
      roughness: 0.35,
      metalness: 0.8,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = 0.06;
    podium.receiveShadow = true;
    characterRoot.add(podium);

    // Glowing Neon Ring around podium
    const ringGeo = new THREE.TorusGeometry(0.88, 0.025, 16, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
    });
    const podiumRing = new THREE.Mesh(ringGeo, ringMat);
    podiumRing.rotation.x = Math.PI / 2;
    podiumRing.position.y = 0.11;
    characterRoot.add(podiumRing);
    stateRef.current.podiumRing = podiumRing;

    // Materials: Realistic Warm African Tone & Attire
    const skinToneColor = avatarGender === "female" ? 0x6e4732 : 0x5d3a24;
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinToneColor,
      roughness: 0.55,
      metalness: 0.05,
    });

    const blazerColor = avatarGender === "female" ? 0x1e293b : 0x0f172a;
    const blazerMat = new THREE.MeshStandardMaterial({
      color: blazerColor,
      roughness: 0.6,
      metalness: 0.2,
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.9,
    });

    // 5B. Torso / Upper Body
    const torso = new THREE.Group();
    torso.position.set(0, 0.75, 0);
    characterRoot.add(torso);
    stateRef.current.torso = torso;

    // Lower body / formal skirt or slacks
    const lowerBodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.7, 16);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, blazerMat);
    lowerBody.position.y = -0.32;
    lowerBody.castShadow = true;
    torso.add(lowerBody);

    // Upper chest/blazer jacket
    const chestGeo = new THREE.CylinderGeometry(0.28, 0.23, 0.55, 16);
    const chest = new THREE.Mesh(chestGeo, blazerMat);
    chest.position.y = 0.26;
    chest.castShadow = true;
    torso.add(chest);

    // Inner formal shirt collar
    const collarGeo = new THREE.ConeGeometry(0.16, 0.25, 4);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.position.set(0, 0.44, 0.14);
    collar.rotation.y = Math.PI / 4;
    collar.rotation.x = 0.2;
    torso.add(collar);

    // Gold Merchant Concierge Badge on lapel
    const badgeGeo = new THREE.BoxGeometry(0.06, 0.035, 0.015);
    const badge = new THREE.Mesh(badgeGeo, goldAccentMat);
    badge.position.set(0.12, 0.38, 0.2);
    badge.rotation.y = 0.2;
    torso.add(badge);

    // 5C. Neck and Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.6, 0);
    torso.add(headGroup);
    stateRef.current.head = headGroup;

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.15, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 0.05;
    neck.castShadow = true;
    headGroup.add(neck);

    // Cranium / Face base
    const headGeo = new THREE.SphereGeometry(0.2, 28, 24);
    headGeo.scale(1, 1.25, 1.05);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, 0.25, 0);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Hair Styling (Sleek professional updo / tapered crown)
    const hairColor = 0x181210;
    const hairMat = new THREE.MeshStandardMaterial({
      color: hairColor,
      roughness: 0.85,
    });

    if (avatarGender === "female") {
      // Elegant braided bun / crown
      const hairBaseGeo = new THREE.SphereGeometry(0.22, 24, 20);
      hairBaseGeo.scale(1.02, 1.1, 1.05);
      const hairBase = new THREE.Mesh(hairBaseGeo, hairMat);
      hairBase.position.set(0, 0.32, -0.04);
      headGroup.add(hairBase);

      const bunGeo = new THREE.SphereGeometry(0.11, 20, 16);
      const bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, 0.44, -0.12);
      headGroup.add(bun);
    } else {
      // Sharp tapered fade
      const hairGeo = new THREE.SphereGeometry(0.21, 24, 20);
      hairGeo.scale(1.02, 1.12, 1.02);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.32, -0.02);
      headGroup.add(hair);
    }

    // Eyes setup
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.2 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const createEye = (xPos: number) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(xPos, 0.28, 0.175);

      const eyeball = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), eyeWhiteMat);
      eyeGroup.add(eyeball);

      const iris = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 16), irisMat);
      iris.rotation.x = Math.PI / 2;
      iris.position.z = 0.034;
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.009, 16), pupilMat);
      pupil.rotation.x = Math.PI / 2;
      pupil.position.z = 0.035;
      eyeGroup.add(pupil);

      // Eyelid for realistic blinking
      const eyelidGeo = new THREE.SphereGeometry(0.042, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const eyelid = new THREE.Mesh(eyelidGeo, skinMat);
      eyelid.rotation.x = Math.PI / 2;
      eyelid.scale.set(1, 0.01, 1); // 0 = open, 1 = shut
      eyeGroup.add(eyelid);

      return { eyeGroup, eyeball, eyelid };
    };

    const leftEyeObj = createEye(0.075);
    const rightEyeObj = createEye(-0.075);
    headGroup.add(leftEyeObj.eyeGroup);
    headGroup.add(rightEyeObj.eyeGroup);

    stateRef.current.leftEye = leftEyeObj.eyeball;
    stateRef.current.rightEye = rightEyeObj.eyeball;
    stateRef.current.leftEyelid = leftEyeObj.eyelid;
    stateRef.current.rightEyelid = rightEyeObj.eyelid;

    // Nose bridge
    const noseGeo = new THREE.ConeGeometry(0.03, 0.08, 12);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.22, 0.21);
    nose.rotation.x = -0.18;
    headGroup.add(nose);

    // Articulated Mouth & Lip-sync Jaw Rig
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, 0.13, 0.17);
    headGroup.add(mouthGroup);

    // Lips
    const lipMat = new THREE.MeshStandardMaterial({
      color: avatarGender === "female" ? 0x933345 : 0x754336,
      roughness: 0.35,
    });
    const jawGeo = new THREE.TorusGeometry(0.042, 0.014, 12, 24, Math.PI * 0.9);
    const jawMesh = new THREE.Mesh(jawGeo, lipMat);
    jawMesh.rotation.z = Math.PI;
    jawMesh.scale.set(1, 0.4, 1);
    mouthGroup.add(jawMesh);
    stateRef.current.jaw = jawMesh;

    // Inner mouth cavity
    const mouthInnerGeo = new THREE.PlaneGeometry(0.06, 0.02);
    const mouthInnerMat = new THREE.MeshBasicMaterial({ color: 0x24080a });
    const mouthInner = new THREE.Mesh(mouthInnerGeo, mouthInnerMat);
    mouthInner.position.z = -0.01;
    mouthGroup.add(mouthInner);
    stateRef.current.mouthInner = mouthInner;

    // 5D. Arms (Right arm rigged for entrance greeting wave, left resting naturally)
    // Right Shoulder / Arm
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.32, 0.46, 0);
    torso.add(rightArmGroup);
    stateRef.current.rightArm = rightArmGroup;

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 12), blazerMat);
    rightUpperArm.position.y = -0.14;
    rightArmGroup.add(rightUpperArm);

    const rightForearmGroup = new THREE.Group();
    rightForearmGroup.position.set(0, -0.28, 0);
    rightArmGroup.add(rightForearmGroup);
    stateRef.current.rightForearm = rightForearmGroup;

    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 12), blazerMat);
    rightForearm.position.y = -0.14;
    rightForearmGroup.add(rightForearm);

    // Right Hand
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
    rightHand.scale.set(0.7, 1.2, 0.6);
    rightHand.position.set(0, -0.3, 0);
    rightForearmGroup.add(rightHand);

    // Left Arm (Natural resting pose)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.32, 0.46, 0);
    torso.add(leftArmGroup);
    stateRef.current.leftArm = leftArmGroup;

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 12), blazerMat);
    leftUpperArm.position.y = -0.14;
    leftArmGroup.add(leftUpperArm);
    leftArmGroup.rotation.z = -0.15;
    leftArmGroup.rotation.x = 0.05;

    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.28, 12), blazerMat);
    leftForearm.position.y = -0.42;
    leftArmGroup.add(leftForearm);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
    leftHand.scale.set(0.7, 1.2, 0.6);
    leftHand.position.set(0, -0.58, 0);
    leftArmGroup.add(leftHand);

    // Set initial position for entrance animation (steps in from back)
    characterRoot.position.z = -1.5;
    characterRoot.position.y = 0;

    // 6. Interactive Mouse Parallax Look-At
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (stateRef.current.head) {
        stateRef.current.head.rotation.y = mouseX * 0.25;
        stateRef.current.head.rotation.x = -mouseY * 0.15;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 7. Animation Loop with 60 FPS delta
    let entranceProgress = 0;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const delta = stateRef.current.clock.getDelta();
      const elapsed = stateRef.current.clock.getElapsedTime();

      const {
        animState: currentAnim,
        isTalking: talking,
        speechVolumeLevel: vol,
        head,
        jaw,
        mouthInner,
        leftEyelid,
        rightEyelid,
        rightArm,
        rightForearm,
        torso: bodyTorso,
        podiumRing: ring,
      } = stateRef.current;

      // 7A. Entrance Animation: Steps onto the stage smoothly
      if (entranceProgress < 1.0) {
        entranceProgress += delta * 1.4;
        const t = Math.min(1.0, entranceProgress);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);
        characterRoot.position.z = -1.5 + ease * 1.5; // reaches z = 0
        characterRoot.position.y = Math.sin(ease * Math.PI) * 0.05; // slight walking step arc
      }

      // 7B. Glowing Ring Pulsing
      if (ring) {
        ring.rotation.z += delta * 0.5;
      }

      // 7C. Diaphragmatic Breathing Cycle (Chest & Shoulders subtle rise/fall)
      if (bodyTorso) {
        const breath = Math.sin(elapsed * 2.2) * 0.015;
        bodyTorso.position.y = 0.75 + breath;
        bodyTorso.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);
      }

      // 7D. Natural Eye Blinking Logic
      if (elapsed > stateRef.current.nextBlinkTime) {
        stateRef.current.isBlinking = true;
        stateRef.current.blinkProgress = 0;
        stateRef.current.nextBlinkTime = elapsed + 3.0 + Math.random() * 4.0;
      }
      if (stateRef.current.isBlinking) {
        stateRef.current.blinkProgress += delta * 12.0;
        const blinkAmount = Math.sin(Math.min(Math.PI, stateRef.current.blinkProgress));
        if (leftEyelid && rightEyelid) {
          leftEyelid.scale.y = 0.01 + blinkAmount * 1.99;
          rightEyelid.scale.y = 0.01 + blinkAmount * 1.99;
        }
        if (stateRef.current.blinkProgress >= Math.PI) {
          stateRef.current.isBlinking = false;
          if (leftEyelid && rightEyelid) {
            leftEyelid.scale.y = 0.01;
            rightEyelid.scale.y = 0.01;
          }
        }
      }

      // 7E. Animation State Switching
      if (currentAnim === "entrance" || currentAnim === "waving") {
        // Welcoming friendly wave
        if (rightArm && rightForearm) {
          rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 1.45, delta * 6);
          rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0.2, delta * 6);
          // Wave forearm back and forth
          rightForearm.rotation.z = THREE.MathUtils.lerp(
            rightForearm.rotation.z,
            0.6 + Math.sin(elapsed * 7.5) * 0.35,
            delta * 12
          );
        }
      } else if (talking) {
        // Speaking state: hand gestures subtly while jaw and lips articulate
        if (rightArm && rightForearm) {
          rightArm.rotation.z = THREE.MathUtils.lerp(
            rightArm.rotation.z,
            0.35 + Math.sin(elapsed * 2.8) * 0.1,
            delta * 4
          );
          rightArm.rotation.x = THREE.MathUtils.lerp(
            rightArm.rotation.x,
            0.3 + Math.cos(elapsed * 3.2) * 0.15,
            delta * 4
          );
          rightForearm.rotation.x = THREE.MathUtils.lerp(
            rightForearm.rotation.x,
            0.5 + Math.sin(elapsed * 4.0) * 0.2,
            delta * 6
          );
        }

        // Real-time lip-sync mouth articulation
        if (jaw && mouthInner) {
          // Modulate with speech volume if available, or sinusoidal phoneme cadence
          const speechMod = vol > 0 ? vol : (Math.sin(elapsed * 15) * 0.5 + 0.5) * 0.8;
          const targetJawY = 0.4 + speechMod * 1.3;
          jaw.scale.y = THREE.MathUtils.lerp(jaw.scale.y, targetJawY, delta * 24);
          mouthInner.scale.y = THREE.MathUtils.lerp(mouthInner.scale.y, targetJawY * 1.2, delta * 24);
        }

        // Expressive subtle head nod cadence while talking
        if (head) {
          const nod = Math.sin(elapsed * 4.5) * 0.04;
          head.rotation.x = nod;
        }
      } else {
        // Idle animation: arm returns softly to resting position
        if (rightArm && rightForearm) {
          rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.15, delta * 4);
          rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0.05, delta * 4);
          rightForearm.rotation.z = THREE.MathUtils.lerp(rightForearm.rotation.z, 0.05, delta * 4);
          rightForearm.rotation.x = THREE.MathUtils.lerp(rightForearm.rotation.x, 0.1, delta * 4);
        }

        // Jaw returns to closed natural smile
        if (jaw && mouthInner) {
          jaw.scale.y = THREE.MathUtils.lerp(jaw.scale.y, 0.4, delta * 12);
          mouthInner.scale.y = THREE.MathUtils.lerp(mouthInner.scale.y, 0.2, delta * 12);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [avatarGender]);

  return (
    <div
      ref={mountRef}
      className={`relative overflow-hidden pointer-events-none select-none ${className}`}
    />
  );
}
