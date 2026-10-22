import React, { useState, useContext, useRef, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import JoystickController from "joystick-controller";
import Modal from "react-bootstrap/Modal";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Popover from "react-bootstrap/Popover";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import CameraPanoSettings from "@/components/imaging/CameraPanoSettings";
import CameraBurstSettings from "@/components/imaging/CameraBurstSettings";
import CameraTimeLapseSettings from "@/components/imaging/CameraTimeLapseSettings";
import CameraWideSettings from "@/components/imaging/CameraWideSettings";
import CameraTeleSettings from "@/components/imaging/CameraTeleSettings";
import { getWideAllParamsFn, getTeleAllParamsFn } from "@/lib/dwarf_utils";
import { modeManual, modeAuto } from "@/services/dwarf";
import {
  decodeMediaState,
  snapshotMediaStates,
  type MediaState,
} from "@/services/dwarf/mediaState";
import styles from "@/components/imaging/CameraAddOn.module.css";

import { ConnectionContext } from "@/stores/ConnectionContext";
import {
  startPhoto,
  startVideo,
  stopVideo,
  startPano,
  stopPano,
  startBurst,
  stopBurst,
  startTimeLapse,
  stopTimeLapse,
} from "@/lib/photo_utils";

type PropTypes = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
};
// Define a generic event handler type that can handle events from both HTMLButtonElement and HTMLImageElement
type GenericMouseEventHandler<T extends HTMLElement> =
  React.MouseEventHandler<T>;

export default function CameraAddOn(props: PropTypes) {
  let connectionCtx = useContext(ConnectionContext);

  const { showModal, setShowModal } = props;
  const [imgSrc] = useState<string>("/images/photo-camera-white.png");
  const [errorTxt, setErrorTxt] = useState("");
  const [oldErrorTxt, setOldErrorTxt] = useState<string>("");
  const [isVisible, setIsVisible] = useState(true);

  const [joystickId, setJoystickId] = useState<JoystickController | undefined>(
    undefined,
  );
  const joystickSpeed = useRef(0.5);
  const [joystickSpeedValue, setJoystickSpeedValue] = useState(0.5);

  const [activeAction, setActiveAction] = useState<string | undefined>(
    undefined,
  ); // State to track active action
  const [activeBtnPhoto, setActiveBtnPhoto] = useState("tele"); // State to track active button
  const [activeBtnVideo, setActiveBtnVideo] = useState("tele"); // State to track active button
  const [activeBtnPano, setActiveBtnPano] = useState("tele"); // State to track active button
  const [activeBtnBurst, setActiveBtnBurst] = useState("tele"); // State to track active button
  const [activeBtnTimeLapse, setActiveBtnTimeLapse] = useState("tele"); // State to track active button
  const [activeBtnSettings, setActiveBtnSettings] = useState("tele"); // State to track active button
  const [showSettingsPanoMenu, setShowSettingsPanoMenu] = useState(false);
  const [showSettingsBurstMenu, setShowSettingsBurstMenu] = useState(false);
  const [showSettingsTimeLapseMenu, setShowSettingsTimeLapseMenu] =
    useState(false);
  const [showSettingsWideMenu, setShowSettingsWideMenu] = useState(false);
  const [showSettingsTeleMenu, setShowSettingsTeleMenu] = useState(false);
  const [activeActionView, setActiveActionView] = useState<string>("Photo");
  const activeFullView = false;

  const [rowValue, setRowValue] = useState<number>(3);
  const [colValue, setColValue] = useState<number>(3);
  const [countValue, setCountValue] = useState<number>(3);
  const [intervalBurstValue, setIntervalBurstValue] = useState<number>(0);
  const [intervalIndexValue, setIntervalIndexValue] = useState<number>(1);
  const [totalTimeIndexValue, setTotalTimeIndexValue] = useState<number>(120);

  const [wideExposureAuto, setWideExposureAuto] = useState<number | undefined>(
    connectionCtx.cameraWideSettings.exp_mode,
  );
  const [wideExposureIndexValue, setWideExposureIndexValue] = useState<
    number | undefined
  >(connectionCtx.cameraWideSettings.exp_index);
  const [wideGainIndexValue, setWideGainIndexValue] = useState<
    number | undefined
  >(connectionCtx.cameraWideSettings.gain_index);
  const [wideWBAuto, setWideWBAuto] = useState<number | undefined>(
    connectionCtx.cameraWideSettings.wb_mode,
  );
  //  const [wideWBMode, setWideWBMode] = useState<numbe|undefinedr>(1);
  const [wideWBColorTempIndexValue, setWideWBColorTempIndexValue] = useState<
    number | undefined
  >(connectionCtx.cameraWideSettings.wb_index);
  //  const [wideWBSceneValue, setWideWBSceneValue] = useState<number|undefined>(3);
  const [wideBrightnessValue, setWideBrightnessValue] = useState<
    number | undefined
  >(connectionCtx.cameraWideSettings.brightness);
  const [wideContrastValue, setWideContrastValue] = useState<
    number | undefined
  >(connectionCtx.cameraWideSettings.contrast);
  const [wideHueValue, setWideHueValue] = useState<number | undefined>(
    connectionCtx.cameraWideSettings.hue,
  );
  const [wideSaturationValue, setWideSaturationValue] = useState<
    number | undefined
  >(connectionCtx.cameraWideSettings.saturation);
  const [wideSharpnessValue, setWideSharpnessValue] = useState<
    number | undefined
  >(connectionCtx.cameraWideSettings.sharpness);

  const [teleWBAuto, setTeleWBAuto] = useState<number | undefined>(
    connectionCtx.cameraTeleSettings.wb_mode,
  );
  const [teleWBMode, setTeleWBMode] = useState<number | undefined>(
    connectionCtx.cameraTeleSettings.wb_index_mode,
  );
  const [teleWBColorTempIndexValue, setTeleWBColorTempIndexValue] = useState<
    number | undefined
  >(connectionCtx.cameraTeleSettings.wb_index);
  const [teleWBSceneValue, setTeleWBSceneValue] = useState<number | undefined>(
    3,
  );
  const [teleBrightnessValue, setTeleBrightnessValue] = useState<
    number | undefined
  >(connectionCtx.cameraTeleSettings.brightness);
  const [teleContrastValue, setTeleContrastValue] = useState<
    number | undefined
  >(connectionCtx.cameraTeleSettings.contrast);
  const [teleHueValue, setTeleHueValue] = useState<number | undefined>(
    connectionCtx.cameraTeleSettings.hue,
  );
  const [teleSaturationValue, setTeleSaturationValue] = useState<
    number | undefined
  >(connectionCtx.cameraTeleSettings.saturation);
  const [teleSharpnessValue, setTeleSharpnessValue] = useState<
    number | undefined
  >(connectionCtx.cameraTeleSettings.sharpness);

  useEffect(() => {
    if (errorTxt != oldErrorTxt) {
      setIsVisible(true);
      setOldErrorTxt(errorTxt);
      let timer;
      if (activeAction == PhotosModeActions[2].toString()) {
        timer = setTimeout(() => {
          setIsVisible(false);
        }, 30000);
      } else {
        timer = setTimeout(() => {
          setIsVisible(false);
        }, 6000);
      }
      // Clear the timeout if new messages come in within the 10 seconds
      return () => clearTimeout(timer);
    }
  }, [errorTxt]);

  let maxRange = useRef(70);
  let radius = useRef(75);
  let joystickRadius = useRef(45);
  let xValue = useRef("50%");
  let yValue = useRef("50%");
  let intervalTimer = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  let isDwarfII = connectionCtx.typeIdDwarf == 1;

  let gLastTimeMotorCmd = Date.now();
  let gMotorState = false;

  let PhotoMode =
    !connectionCtx.imagingSession.isRecording &&
    !connectionCtx.imagingSession.endRecording;

  const PhotosModeActions = [
    "Photo",
    "Video",
    "Panorama",
    "Burst",
    "Time Lapse",
    "Settings",
  ];

  const CameraType = {
    tele: 0,
    wide: 1,
  };

  const mediaSession = connectionCtx.socketIPDwarf?.session;
  useEffect(() => {
    const apply = (media: MediaState) => {
      const actions = {
        photo: { selected: activeBtnPhoto, action: "Photo", id: "TakePhoto" },
        video: { selected: activeBtnVideo, action: "Video", id: "TakeVideo" },
        burst: {
          selected: activeBtnBurst,
          action: "Burst",
          id: "TakeBurstPhoto",
        },
        timelapse: {
          selected: activeBtnTimeLapse,
          action: "Time Lapse",
          id: "TakeTimeLapse",
        },
        panorama: {
          selected: activeBtnPano,
          action: "Panorama",
          id: "TakePano",
        },
      };
      const { selected, action, id } = actions[media.operation];
      if (media.cameraId !== (selected === "wide" ? 1 : 0)) return;
      const active = media.state === "running" || media.state === "stopping";
      setActiveAction((current) =>
        active ? action : current === action ? undefined : current,
      );
      setErrorTxt(`${action}: ${media.state}.`);
      setMediaButtonState(id, active);
    };
    if (!mediaSession) return;
    snapshotMediaStates(mediaSession.state).forEach(apply);
    return mediaSession.subscribe((state, packet) => {
      if (state.phase !== "ready") {
        setActiveAction(undefined);
        [
          "TakePhoto",
          "TakeVideo",
          "TakeBurstPhoto",
          "TakeTimeLapse",
          "TakePano",
        ].forEach((id) => setMediaButtonState(id, false));
        return;
      }
      const media = decodeMediaState(packet);
      if (media) apply(media);
      else if (packet?.cmd === 16405) snapshotMediaStates(state).forEach(apply);
    });
  }, [
    mediaSession,
    activeBtnPhoto,
    activeBtnVideo,
    activeBtnBurst,
    activeBtnTimeLapse,
    activeBtnPano,
  ]);

  useEffect(() => {
    setShowModal((prev) => prev && PhotoMode);
    const handleResize = () => {
      //setWindowWidth(window.innerWidth);
      update_control();
    };
    update_control();
    setActiveActionView(PhotosModeActions[0].toString());
    window.addEventListener("resize", handleResize);
    isDwarfII = connectionCtx.typeIdDwarf == 1;

    return () => {
      window.removeEventListener("resize", handleResize);
      if (intervalTimer.current) {
        clearInterval(intervalTimer.current);
      }
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  useEffect(() => {
    if (showSettingsWideMenu) {
      void getWideAllParamsFn(connectionCtx);
      updateWideData();
    }
  }, [showSettingsWideMenu]);

  useEffect(() => {
    if (showSettingsTeleMenu) {
      void getTeleAllParamsFn(connectionCtx);
      updateTeleData();
    }
  }, [showSettingsTeleMenu]);

  function updateWideData() {
    setWideExposureAuto(connectionCtx.cameraWideSettings.exp_mode);
    setWideExposureIndexValue(connectionCtx.cameraWideSettings.exp_index);
    setWideGainIndexValue(connectionCtx.cameraWideSettings.gain_index);
    setWideWBAuto(connectionCtx.cameraWideSettings.wb_mode);
    setWideWBColorTempIndexValue(connectionCtx.cameraWideSettings.wb_index);
    setWideBrightnessValue(connectionCtx.cameraWideSettings.brightness);
    setWideContrastValue(connectionCtx.cameraWideSettings.contrast);
    setWideHueValue(connectionCtx.cameraWideSettings.hue);
    setWideSaturationValue(connectionCtx.cameraWideSettings.saturation);
    setWideSharpnessValue(connectionCtx.cameraWideSettings.sharpness);
  }
  function updateTeleData() {
    setTeleWBAuto(connectionCtx.cameraTeleSettings.wb_mode);
    setTeleWBMode(connectionCtx.cameraTeleSettings.wb_index_mode);
    if (
      connectionCtx.cameraTeleSettings.wb_mode == modeManual &&
      connectionCtx.cameraTeleSettings.wb_index_mode == modeAuto
    )
      setTeleWBColorTempIndexValue(connectionCtx.cameraTeleSettings.wb_index);
    if (
      connectionCtx.cameraTeleSettings.wb_mode == modeManual &&
      connectionCtx.cameraTeleSettings.wb_index_mode == modeManual
    )
      setTeleWBSceneValue(connectionCtx.cameraTeleSettings.wb_index);
    setTeleBrightnessValue(connectionCtx.cameraTeleSettings.brightness);
    setTeleContrastValue(connectionCtx.cameraTeleSettings.contrast);
    setTeleHueValue(connectionCtx.cameraTeleSettings.hue);
    setTeleSaturationValue(connectionCtx.cameraTeleSettings.saturation);
    setTeleSharpnessValue(connectionCtx.cameraTeleSettings.sharpness);
  }

  const handleBtnPhotoClick = (buttonName) => {
    if (activeAction !== undefined || mediaRequestPending.current) return;
    setActiveBtnPhoto(buttonName);
  };

  const handleBtnVideoClick = (buttonName) => {
    if (activeAction !== undefined || mediaRequestPending.current) return;
    // Update state to set the active button
    setActiveBtnVideo(buttonName);
  };
  const handleBtnPanoClick = (buttonName) => {
    if (activeAction !== undefined || mediaRequestPending.current) return;
    // Update state to set the active button
    setActiveBtnPano(buttonName);
  };
  const handleBtnBurstClick = (buttonName) => {
    if (activeAction !== undefined || mediaRequestPending.current) return;
    setActiveBtnBurst(buttonName);
  };
  const handleBtnTimeLapseClick = (buttonName) => {
    if (activeAction !== undefined || mediaRequestPending.current) return;
    setActiveBtnTimeLapse(buttonName);
  };
  const handleBtnSettingsClick = (buttonName) => {
    setActiveBtnSettings(buttonName);
  };

  const closeCameraPanel = () => {
    stop_motor();
    setShowModal(false);
    setShowSettingsPanoMenu(false);
    setShowSettingsBurstMenu(false);
    setShowSettingsTimeLapseMenu(false);
    setShowSettingsWideMenu(false);
    setShowSettingsTeleMenu(false);
  };

  const openSelectedCameraSettings = () => {
    if (activeBtnSettings === "wide") setShowSettingsWideMenu(true);
    else setShowSettingsTeleMenu(true);
  };

  const canSendCameraCommand = () => {
    if (connectionCtx.connectionStatus && connectionCtx.IPDwarf) return true;
    setErrorTxt("Camera command not sent: reconnect your DWARF first.");
    setActiveAction(undefined);
    return false;
  };

  function changeColorButton(ImgID, Force = false) {
    const imgElementButton = document.getElementById(ImgID) as HTMLImageElement;
    if (imgElementButton) {
      if (Force) imgElementButton.src = "/images/photo-camera-red.png";
      else if (imgElementButton.src.includes("photo-camera-white"))
        imgElementButton.src = "/images/photo-camera-red.png";
      else imgElementButton.src = "/images/photo-camera-white.png";
    }
  }

  function setMediaButtonState(id: string, active: boolean) {
    const element = document.getElementById(id) as HTMLImageElement | null;
    if (element)
      element.src = active
        ? "/images/photo-camera-red.png"
        : "/images/photo-camera-white.png";
  }

  // Sending/accepting a request is not evidence that a camera is running.
  const mediaRequestPending = useRef(false);
  const requestMedia = async (action: "photo" | "startVideo" | "stopVideo") => {
    if (!canSendCameraCommand() || mediaRequestPending.current) return;
    mediaRequestPending.current = true;
    try {
      const camera =
        CameraType[action === "photo" ? activeBtnPhoto : activeBtnVideo];
      if (action === "photo")
        await startPhoto(camera, connectionCtx, setErrorTxt);
      else if (action === "startVideo")
        await startVideo(camera, connectionCtx, setErrorTxt);
      else await stopVideo(camera, connectionCtx, setErrorTxt);
    } finally {
      mediaRequestPending.current = false;
    }
  };
  const handleClickActionPhoto: GenericMouseEventHandler<
    HTMLImageElement
  > = async () => requestMedia("photo");
  const handleClickActionStartVideo: GenericMouseEventHandler<
    HTMLImageElement
  > = async () => requestMedia("startVideo");
  const handleClickActionStopVideo: GenericMouseEventHandler<
    HTMLImageElement
  > = async () => requestMedia("stopVideo");

  // Requests never change the active operation. Device notifications and the
  // full state snapshot below own running/stopping/stopped UI state.
  const requestSequenceMedia = async (
    action:
      | "startPano"
      | "stopPano"
      | "startBurst"
      | "stopBurst"
      | "startTimeLapse"
      | "stopTimeLapse",
  ) => {
    if (!canSendCameraCommand() || mediaRequestPending.current) return;
    mediaRequestPending.current = true;
    try {
      if (action === "startPano")
        await startPano(
          CameraType[activeBtnPano],
          rowValue,
          colValue,
          connectionCtx,
          setErrorTxt,
        );
      else if (action === "stopPano")
        await stopPano(CameraType[activeBtnPano], connectionCtx, setErrorTxt);
      else if (action === "startBurst")
        await startBurst(
          CameraType[activeBtnBurst],
          countValue,
          intervalBurstValue,
          connectionCtx,
          setErrorTxt,
        );
      else if (action === "stopBurst")
        await stopBurst(CameraType[activeBtnBurst], connectionCtx, setErrorTxt);
      else if (action === "startTimeLapse")
        await startTimeLapse(
          CameraType[activeBtnTimeLapse],
          intervalIndexValue,
          totalTimeIndexValue,
          connectionCtx,
          setErrorTxt,
        );
      else
        await stopTimeLapse(
          CameraType[activeBtnTimeLapse],
          connectionCtx,
          setErrorTxt,
        );
    } finally {
      mediaRequestPending.current = false;
    }
  };
  const handleClickActionStartPano = () => requestSequenceMedia("startPano");
  const handleClickActionStopPano = () => requestSequenceMedia("stopPano");
  const handleClickActionStartBurst = () => requestSequenceMedia("startBurst");
  const handleClickActionStopBurst = () => requestSequenceMedia("stopBurst");
  const handleClickActionStartTimeLapse = () =>
    requestSequenceMedia("startTimeLapse");
  const handleClickActionStopTimeLapse = () =>
    requestSequenceMedia("stopTimeLapse");

  // Set Active Column in Small Screen in no current action
  const handleBtnViewClick = (buttonName) => {
    if (activeAction === undefined) {
      setActiveActionView(buttonName);
      console.log("setActiveActionView:", buttonName);
    }
  };

  function update_control() {
    if (window.innerWidth > 1024) {
      maxRange.current = 70;
      radius.current = 75;
      joystickRadius.current = 45;
    } else {
      maxRange.current = 55;
      radius.current = 50;
      joystickRadius.current = 25;
    }
    xValue.current = "50%";
    yValue.current = "50%";
  }

  const currentSocket = useRef(connectionCtx.socketIPDwarf);
  currentSocket.current = connectionCtx.socketIPDwarf;
  const movingSocket = useRef<typeof connectionCtx.socketIPDwarf>(undefined);
  const joystickRequestPending =
    useRef<typeof connectionCtx.socketIPDwarf>(undefined);
  const joystickController = useRef<JoystickController | undefined>(undefined);
  const joystickSocket = useRef(connectionCtx.socketIPDwarf);
  const modalOpen = useRef(showModal);
  modalOpen.current = showModal;

  function stop_motor() {
    const socket = movingSocket.current;
    movingSocket.current = undefined;
    if (socket?.isConnected())
      void socket
        .request("stopJoystick", {})
        .catch((error) =>
          setErrorTxt(error instanceof Error ? error.message : String(error)),
        );
  }

  useEffect(() => {
    const socket = connectionCtx.socketIPDwarf;
    if (joystickSocket.current !== socket) {
      joystickSocket.current = socket;
      setJoystickId(undefined);
      setShowModal(false);
    }
    return () => {
      joystickController.current?.destroy();
      joystickController.current = undefined;
      if (movingSocket.current === socket) {
        movingSocket.current = undefined;
        if (socket?.isConnected())
          void socket.request("stopJoystick", {}).catch(() => {});
      }
    };
  }, [connectionCtx.socketIPDwarf]);

  function init_joystick() {
    if (
      !modalOpen.current ||
      currentSocket.current !== connectionCtx.socketIPDwarf
    )
      return;
    if (!joystickId) {
      const staticJoystick = new JoystickController(
        {
          maxRange: maxRange.current,
          level: 10,
          radius: radius.current,
          joystickRadius: joystickRadius.current,
          opacity: 0.5,
          leftToRight: false,
          bottomToUp: true,
          containerClass: "joystick-container",
          controllerClass: "joystick-controller",
          joystickClass: "joystick",
          distortion: true,
          x: xValue.current,
          y: yValue.current,
          mouseClickButton: "ALL",
          hideContextMenu: true,
        },
        ({ x, y, leveledX, leveledY, distance, angle }) => {
          console.debug(x, y, leveledX, leveledY, distance, angle);
          console.debug("joystickSpeed", joystickSpeed.current);
          let newTimeMotorCmd = Date.now();
          let elapsedTime = newTimeMotorCmd - gLastTimeMotorCmd;
          let newMotorState = distance > 0;
          // Stop ?
          if (newMotorState === false && gMotorState != newMotorState) {
            gMotorState = newMotorState;
            gLastTimeMotorCmd = newTimeMotorCmd;
            // Send Stop command
            console.debug("stop_motor");
            stop_motor();
          } else if (newMotorState && elapsedTime > 400) {
            gMotorState = newMotorState;
            gLastTimeMotorCmd = newTimeMotorCmd;
            let angle_dec = (angle * 180) / 3.14116;
            if (angle_dec < 0) {
              angle_dec = 360 + angle_dec;
            }
            angle_dec = 360 - angle_dec;
            let vector =
              Math.sqrt(leveledX * leveledX + leveledY * leveledY) / 10;
            console.debug(elapsedTime, angle_dec, vector);
            move_joystick(angle_dec, vector, joystickSpeed.current);
          } else {
            console.debug("command motor not send", elapsedTime);
          }
        },
      );
      joystickController.current = staticJoystick;
      setJoystickId(staticJoystick);

      // Define the idString variable
      let idString = staticJoystick.id;

      // Construct the CSS class selectors using the idString
      let containerSelector = ".joystick-container-" + idString;

      // Get the elements matching the constructed selectors
      let containerElement = document.querySelector(
        containerSelector,
      ) as HTMLElement;

      // Check if the elements exist
      if (containerElement) {
        containerElement.style.position = "relative";
        containerElement.style.inset = "auto";
        containerElement.style.transform = "none";
      }

      let joystickContainer = staticJoystick.container;
      let newParent = document.getElementById("camera-joystick-slot");

      if (joystickContainer && newParent) {
        // Remove joystickContainer from its current parent
        joystickContainer.parentNode.removeChild(joystickContainer);

        newParent.appendChild(joystickContainer);
        staticJoystick.recenterJoystick();

        // Create buttons div element
        create_button_joystick(
          joystickContainer,
          "Up",
          "joystick-button-up",
          90,
          "bi bi-arrow-up-circle",
        );
        create_button_joystick(
          joystickContainer,
          "Down",
          "joystick-button-down",
          270,
          "bi bi-arrow-down-circle",
        );
        create_button_joystick(
          joystickContainer,
          "Left",
          "joystick-button-left",
          180,
          "bi bi-arrow-left-circle",
        );
        create_button_joystick(
          joystickContainer,
          "Right",
          "joystick-button-right",
          0,
          "bi bi-arrow-right-circle",
        );
      }
    }
  }

  function updateNewSpeed(value: number) {
    joystickSpeed.current = value;
    setJoystickSpeedValue(value);
  }

  function create_button_joystick(
    divJoystickContainer,
    title,
    className,
    angle,
    icon,
  ) {
    const newDiv = document.createElement("button");
    newDiv.type = "button";
    // Set attributes and classes for the new div
    newDiv.title = title;
    newDiv.className = className;
    // Create the inner content (icon)
    const iconElement = document.createElement("i");
    iconElement.className = icon;
    newDiv.setAttribute("aria-label", `Move telescope ${title}`);
    newDiv.addEventListener("pointerdown", function (event) {
      if (event.button == 0) {
        newDiv.setPointerCapture(event.pointerId);
        move_joystick(angle, 0.8, joystickSpeed.current, false);
      } else move_joystick(angle, 0.8, joystickSpeed.current, true);
    });
    const stopMovement = () => {
      stop_motor();
    };
    newDiv.addEventListener("pointerup", stopMovement);
    newDiv.addEventListener("pointercancel", stopMovement);
    newDiv.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        move_joystick(angle, 0.8, joystickSpeed.current, false);
      }
    });
    newDiv.addEventListener("keyup", (event) => {
      if (event.key === "Enter" || event.key === " ") stopMovement();
    });
    // Append the icon to the new div
    newDiv.appendChild(iconElement);
    // Append the new div into the joystickContainer
    divJoystickContainer.appendChild(newDiv);
  }

  function move_joystick(
    angle: number,
    vector: number,
    motorspeed: number,
    fixed = false,
  ) {
    const socket = connectionCtx.socketIPDwarf;
    // Joystick event closures can survive changing the selected fleet device.
    // Only the socket captured by the current render may issue a new movement.
    if (
      !socket?.isConnected() ||
      currentSocket.current !== socket ||
      joystickRequestPending.current === socket
    )
      return;
    joystickRequestPending.current = socket;
    movingSocket.current = socket;
    void socket
      .request(fixed ? "joystickStep" : "joystick", {
        vectorAngle: angle,
        vectorLength: Math.min(1, Math.max(0, vector * motorspeed)),
      })
      .catch((error) =>
        setErrorTxt(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => {
        if (joystickRequestPending.current === socket)
          joystickRequestPending.current = undefined;
      });
  }

  function close_joystick(joystick_id) {
    if (joystick_id) {
      stop_motor();
      joystick_id.destroy();
      if (joystickController.current === joystick_id)
        joystickController.current = undefined;
      setJoystickId(undefined);
    }
  }

  const { t } = useTranslation();
  // eslint-disable-next-line no-unused-vars
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      setSelectedLanguage(storedLanguage);
      i18n.changeLanguage(storedLanguage);
    }
  }, []);

  return (
    <>
      {isVisible && errorTxt && showModal && (
        <div className="camera-action-status" role="status" aria-live="polite">
          {errorTxt}
        </div>
      )}
      <Modal
        show={showModal}
        onHide={closeCameraPanel}
        onEntered={() => setTimeout(init_joystick, 100)}
        onExited={() => close_joystick(joystickId)}
        className={styles.cameraModalRoot}
        dialogClassName={styles.cameraDialog}
        scrollable
        fullscreen="lg-down"
        size="xl"
        aria-labelledby="camera-controls-title"
      >
        <Modal.Header closeButton className={styles.cameraModalHeader}>
          <div>
            <span className={styles.eyebrow}>Imaging workspace</span>
            <Modal.Title id="camera-controls-title">
              Camera &amp; mount controls
            </Modal.Title>
            <p>
              Select a capture tool or adjust the telescope without leaving the
              live view.
            </p>
          </div>
        </Modal.Header>
        <Modal.Body className={styles.cameraModalBody}>
          <div
            id="main_SlidingPane"
            className={`${styles.controlLayout} box-element`}
          >
            <section
              className={styles.mountControls}
              aria-label="Mount controls"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <span>Mount</span>
                  <h3>Movement</h3>
                </div>
                <strong>{Math.round(joystickSpeedValue * 100)}%</strong>
              </div>
              <div className="speed-meter">
                <label className="speed-control" htmlFor="camera-motor-speed">
                  <span className="speed-control__label">
                    Movement strength
                  </span>
                  <input
                    id="camera-motor-speed"
                    className="speed-control__range"
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={joystickSpeedValue}
                    aria-label={`Movement strength ${Math.round(joystickSpeedValue * 100)} percent`}
                    onChange={(event) =>
                      updateNewSpeed(Number(event.currentTarget.value))
                    }
                  />
                  <span className="speed-control__limits" aria-hidden="true">
                    <span>Fine</span>
                    <span>Fast</span>
                  </span>
                </label>
              </div>
              <div id="camera-joystick-slot" className={styles.joystickSlot} />
            </section>
            <section
              className={styles.captureControls}
              aria-label="Capture controls"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <span>Camera</span>
                  <h3>Capture tools</h3>
                </div>
              </div>
              <div className="containerCamera">
                <div className="pane">
                  {!activeFullView && (
                    <div className="columnAction">
                      <div className="header-camera">
                        <div className="title">{t("cActiveActionView")}</div>
                      </div>
                      <div className="separator"></div>
                      <div className="button-container-view">
                        {PhotosModeActions.map((action) => (
                          <button
                            type="button"
                            key={action}
                            role="tab"
                            aria-selected={activeActionView === action}
                            className={`button ${
                              activeActionView === action ? "active" : ""
                            }`}
                            onClick={() =>
                              handleBtnViewClick(action.toString())
                            }
                          >
                            {action === "Settings"
                              ? "Settings"
                              : t(`cCameraAddOn${action.replace(" ", "")}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(activeFullView ||
                    (!activeFullView &&
                      activeActionView == PhotosModeActions[0].toString())) && (
                    <div className="column">
                      <div className="header-camera">
                        <div className="title">{t("cCameraAddOnPhoto")}</div>
                      </div>
                      <div className="separator"></div>
                      <img
                        id="TakePhoto"
                        src={imgSrc}
                        className="cameraAddon-image"
                        alt="Take Photos"
                        onClick={
                          activeAction === undefined
                            ? handleClickActionPhoto
                            : undefined
                        }
                        style={{ cursor: "pointer" }}
                      />
                      <div className="button-container">
                        <button
                          className={`button ${
                            activeBtnPhoto === "tele" ? "active" : ""
                          }`}
                          onClick={() => handleBtnPhotoClick("tele")}
                        >
                          Tele
                        </button>
                        <button
                          className={`button ${
                            activeBtnPhoto === "wide" ? "active" : ""
                          }`}
                          onClick={() => handleBtnPhotoClick("wide")}
                        >
                          Wide
                        </button>
                      </div>
                    </div>
                  )}

                  {(activeFullView ||
                    (!activeFullView &&
                      activeActionView == PhotosModeActions[1].toString())) && (
                    <div className="column">
                      <div className="header-camera">
                        <div className="title">{t("cCameraAddOnVideo")}</div>
                      </div>
                      <div className="separator"></div>
                      <img
                        id="TakeVideo"
                        src={imgSrc}
                        className="cameraAddon-image"
                        alt="Take Videos"
                        onClick={
                          activeAction === undefined
                            ? handleClickActionStartVideo
                            : activeAction === PhotosModeActions[1].toString()
                              ? handleClickActionStopVideo
                              : undefined
                        }
                        style={{ cursor: "pointer" }}
                      />
                      {isDwarfII && (
                        <div className="button-container">
                          <button
                            className={`button-cent ${
                              activeBtnVideo === "tele" ? "active" : ""
                            }`}
                            onClick={() => handleBtnVideoClick("tele")}
                          >
                            Tele
                          </button>
                        </div>
                      )}
                      {!isDwarfII && (
                        <div className="button-container">
                          <button
                            className={`button ${
                              activeBtnVideo === "tele" ? "active" : ""
                            }`}
                            onClick={() => handleBtnVideoClick("tele")}
                          >
                            Tele
                          </button>
                          <button
                            className={`button ${
                              activeBtnVideo === "wide" ? "active" : ""
                            }`}
                            onClick={() => handleBtnVideoClick("wide")}
                          >
                            Wide
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {(activeFullView ||
                    (!activeFullView &&
                      activeActionView == PhotosModeActions[2].toString())) && (
                    <div className="column">
                      <div className="header-camera">
                        <div className="title">{t("cCameraAddOnPanorama")}</div>
                        <button
                          type="button"
                          className="cameraAddon-settings-button"
                          title="Panorama settings"
                          aria-label="Open panorama settings"
                        >
                          <OverlayTrigger
                            trigger="click"
                            placement="top"
                            show={showSettingsPanoMenu}
                            onToggle={() => setShowSettingsPanoMenu((p) => !p)}
                            overlay={
                              <Popover
                                id="popover-panorama-settings"
                                className={styles.settingsPopover}
                                role="dialog"
                                aria-label="Panorama settings"
                              >
                                <Popover.Header as="h3">
                                  <span>Panorama settings</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowSettingsPanoMenu(false)
                                    }
                                    aria-label="Close panorama settings"
                                  >
                                    <i
                                      className="bi bi-x-lg"
                                      aria-hidden="true"
                                    />
                                  </button>
                                </Popover.Header>
                                <Popover.Body>
                                  <CameraPanoSettings
                                    colValue={colValue}
                                    setColValue={setColValue}
                                    rowValue={rowValue}
                                    setRowValue={setRowValue}
                                    setShowSettingsMenu={
                                      setShowSettingsPanoMenu
                                    }
                                  />
                                </Popover.Body>
                              </Popover>
                            }
                          >
                            <i
                              className="bi bi-sliders"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.75rem",
                              }}
                            ></i>
                          </OverlayTrigger>
                        </button>
                      </div>
                      <div className="separator"></div>
                      <img
                        id="TakePano"
                        src={imgSrc}
                        className="cameraAddon-image"
                        alt="Take Panoramas"
                        title="Panorama grid configuration is unavailable for this connection."
                        onClick={
                          activeAction === undefined
                            ? handleClickActionStartPano
                            : activeAction === PhotosModeActions[2].toString()
                              ? handleClickActionStopPano
                              : undefined
                        }
                        style={{ cursor: "pointer" }}
                      />
                      {isDwarfII && (
                        <div className="button-container">
                          <button
                            className={`button-cent ${
                              activeBtnPano === "tele" ? "active" : ""
                            }`}
                            onClick={() => handleBtnPanoClick("tele")}
                          >
                            Tele
                          </button>
                        </div>
                      )}
                      {!isDwarfII && (
                        <div className="button-container">
                          <button
                            className={`button ${
                              activeBtnPano === "tele" ? "active" : ""
                            }`}
                            onClick={() => handleBtnPanoClick("tele")}
                          >
                            Tele
                          </button>
                          <button
                            className={`button ${
                              activeBtnPano === "wide" ? "active" : ""
                            }`}
                            disabled
                            title="Panorama capture is only available on the telephoto camera"
                          >
                            Wide
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {(activeFullView ||
                    (!activeFullView &&
                      activeActionView == PhotosModeActions[3].toString())) && (
                    <div className="column">
                      <div className="header-camera">
                        <div className="title">{t("cCameraAddOnBurst")}</div>
                        <button
                          type="button"
                          className="cameraAddon-settings-button"
                          title="Burst settings"
                          aria-label="Open burst settings"
                        >
                          <OverlayTrigger
                            trigger="click"
                            placement="top"
                            show={showSettingsBurstMenu}
                            onToggle={() => setShowSettingsBurstMenu((p) => !p)}
                            overlay={
                              <Popover
                                id="popover-burst-settings"
                                className={styles.settingsPopover}
                                role="dialog"
                                aria-label="Burst settings"
                              >
                                <Popover.Header as="h3">
                                  <span>Burst settings</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowSettingsBurstMenu(false)
                                    }
                                    aria-label="Close burst settings"
                                  >
                                    <i
                                      className="bi bi-x-lg"
                                      aria-hidden="true"
                                    />
                                  </button>
                                </Popover.Header>
                                <Popover.Body>
                                  <CameraBurstSettings
                                    countValue={countValue}
                                    setCountValue={setCountValue}
                                    intervalValue={intervalBurstValue}
                                    setIntervalValue={setIntervalBurstValue}
                                    setShowSettingsMenu={
                                      setShowSettingsBurstMenu
                                    }
                                  />
                                </Popover.Body>
                              </Popover>
                            }
                          >
                            <i
                              className="bi bi-sliders"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.75rem",
                              }}
                            ></i>
                          </OverlayTrigger>
                        </button>
                      </div>
                      <div className="separator"></div>
                      <img
                        id="TakeBurstPhoto"
                        src={imgSrc}
                        className="cameraAddon-image"
                        alt="Take Burst Photos"
                        onClick={
                          activeAction === undefined
                            ? handleClickActionStartBurst
                            : activeAction === PhotosModeActions[3].toString()
                              ? handleClickActionStopBurst
                              : undefined
                        }
                        style={{ cursor: "pointer" }}
                      />
                      <div className="button-container">
                        <button
                          className={`button ${
                            activeBtnBurst === "tele" ? "active" : ""
                          }`}
                          onClick={() => handleBtnBurstClick("tele")}
                        >
                          Tele
                        </button>
                        <button
                          className={`button ${
                            activeBtnBurst === "wide" ? "active" : ""
                          }`}
                          onClick={() => handleBtnBurstClick("wide")}
                        >
                          Wide
                        </button>
                      </div>
                    </div>
                  )}

                  {(activeFullView ||
                    (!activeFullView &&
                      activeActionView == PhotosModeActions[4].toString())) && (
                    <div className="column">
                      <div className="header-camera">
                        <div className="title">
                          {t("cCameraAddOnTimeLapse")}
                        </div>
                        <button
                          type="button"
                          className="cameraAddon-settings-button"
                          title="Time-lapse settings"
                          aria-label="Open time-lapse settings"
                        >
                          <OverlayTrigger
                            trigger="click"
                            placement="top"
                            show={showSettingsTimeLapseMenu}
                            onToggle={() =>
                              setShowSettingsTimeLapseMenu((p) => !p)
                            }
                            overlay={
                              <Popover
                                id="popover-timelapse-settings"
                                className={styles.settingsPopover}
                                role="dialog"
                                aria-label="Time-lapse settings"
                              >
                                <Popover.Header as="h3">
                                  <span>Time-lapse settings</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowSettingsTimeLapseMenu(false)
                                    }
                                    aria-label="Close time-lapse settings"
                                  >
                                    <i
                                      className="bi bi-x-lg"
                                      aria-hidden="true"
                                    />
                                  </button>
                                </Popover.Header>
                                <Popover.Body>
                                  <CameraTimeLapseSettings
                                    intervalIndexValue={intervalIndexValue}
                                    setIntervalIndexValue={
                                      setIntervalIndexValue
                                    }
                                    totalTimeIndexValue={totalTimeIndexValue}
                                    setTotalTimeIndexValue={
                                      setTotalTimeIndexValue
                                    }
                                    setShowSettingsMenu={
                                      setShowSettingsTimeLapseMenu
                                    }
                                  />
                                </Popover.Body>
                              </Popover>
                            }
                          >
                            <i
                              className="bi bi-sliders"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.75rem",
                              }}
                            ></i>
                          </OverlayTrigger>
                        </button>
                      </div>
                      <div className="separator"></div>
                      <img
                        id="TakeTimeLapse"
                        src={imgSrc}
                        className="cameraAddon-image"
                        alt="Take Time Lapse"
                        title="Configure the device interval and duration before starting."
                        onClick={
                          activeAction === undefined
                            ? handleClickActionStartTimeLapse
                            : activeAction === PhotosModeActions[4].toString()
                              ? handleClickActionStopTimeLapse
                              : undefined
                        }
                        style={{ cursor: "pointer" }}
                      />
                      <div className="button-container">
                        <button
                          className={`button ${
                            activeBtnTimeLapse === "tele" ? "active" : ""
                          }`}
                          onClick={() => handleBtnTimeLapseClick("tele")}
                        >
                          Tele
                        </button>
                        <button
                          className={`button ${
                            activeBtnTimeLapse === "wide" ? "active" : ""
                          }`}
                          onClick={() => handleBtnTimeLapseClick("wide")}
                        >
                          Wide
                        </button>
                      </div>
                    </div>
                  )}
                  {activeActionView == PhotosModeActions[5].toString() && (
                    <div className="column">
                      {activeBtnSettings === "wide" && (
                        <div className="header-camera">
                          <div className="title">Settings</div>
                          <button
                            type="button"
                            className="cameraAddon-settings-button"
                            title="Wide-angle camera settings"
                            aria-label="Open wide-angle camera settings"
                          >
                            <OverlayTrigger
                              trigger="click"
                              placement="top"
                              show={showSettingsWideMenu}
                              onToggle={() =>
                                setShowSettingsWideMenu((p) => !p)
                              }
                              overlay={
                                <Popover
                                  id="popover-wide-settings"
                                  className={styles.settingsPopover}
                                  role="dialog"
                                  aria-label="Wide-angle settings"
                                >
                                  <Popover.Header as="h3">
                                    <span>Wide-angle settings</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowSettingsWideMenu(false)
                                      }
                                      aria-label="Close wide-angle settings"
                                    >
                                      <i
                                        className="bi bi-x-lg"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </Popover.Header>
                                  <Popover.Body>
                                    <CameraWideSettings
                                      wideExposureAuto={wideExposureAuto}
                                      setWideExposureAuto={setWideExposureAuto}
                                      wideExposureIndexValue={
                                        wideExposureIndexValue
                                      }
                                      setWideExposureIndexValue={
                                        setWideExposureIndexValue
                                      }
                                      wideGainIndexValue={wideGainIndexValue}
                                      setWideGainIndexValue={
                                        setWideGainIndexValue
                                      }
                                      wideWBAuto={wideWBAuto}
                                      setWideWBAuto={setWideWBAuto}
                                      //wideWBMode={wideWBMode}
                                      //setWideWBMode={setWideWBMode}
                                      wideWBColorTempIndexValue={
                                        wideWBColorTempIndexValue
                                      }
                                      setWideWBColorTempIndexValue={
                                        setWideWBColorTempIndexValue
                                      }
                                      //wideWBSceneValue={wideWBSceneValue}
                                      //setWideWBSceneValue={setWideWBSceneValue}
                                      wideBrightnessValue={wideBrightnessValue}
                                      setWideBrightnessValue={
                                        setWideBrightnessValue
                                      }
                                      wideContrastValue={wideContrastValue}
                                      setWideContrastValue={
                                        setWideContrastValue
                                      }
                                      wideHueValue={wideHueValue}
                                      setWideHueValue={setWideHueValue}
                                      wideSaturationValue={wideSaturationValue}
                                      setWideSaturationValue={
                                        setWideSaturationValue
                                      }
                                      wideSharpnessValue={wideSharpnessValue}
                                      setWideSharpnessValue={
                                        setWideSharpnessValue
                                      }
                                      setShowSettingsWideMenu={
                                        setShowSettingsWideMenu
                                      }
                                    />
                                  </Popover.Body>
                                </Popover>
                              }
                            >
                              <i
                                className="bi bi-sliders"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "1.75rem",
                                }}
                              ></i>
                            </OverlayTrigger>
                          </button>
                        </div>
                      )}
                      {activeBtnSettings === "tele" && (
                        <div className="header-camera">
                          <div className="title">Settings</div>
                          <button
                            type="button"
                            className="cameraAddon-settings-button"
                            title="Telephoto camera settings"
                            aria-label="Open telephoto camera settings"
                          >
                            <OverlayTrigger
                              trigger="click"
                              placement="top"
                              show={showSettingsTeleMenu}
                              onToggle={() =>
                                setShowSettingsTeleMenu((p) => !p)
                              }
                              overlay={
                                <Popover
                                  id="popover-tele-settings"
                                  className={styles.settingsPopover}
                                  role="dialog"
                                  aria-label="Telephoto settings"
                                >
                                  <Popover.Header as="h3">
                                    <span>Telephoto settings</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowSettingsTeleMenu(false)
                                      }
                                      aria-label="Close telephoto settings"
                                    >
                                      <i
                                        className="bi bi-x-lg"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </Popover.Header>
                                  <Popover.Body>
                                    <CameraTeleSettings
                                      teleWBAuto={teleWBAuto}
                                      setTeleWBAuto={setTeleWBAuto}
                                      teleWBMode={teleWBMode}
                                      setTeleWBMode={setTeleWBMode}
                                      teleWBColorTempIndexValue={
                                        teleWBColorTempIndexValue
                                      }
                                      setTeleWBColorTempIndexValue={
                                        setTeleWBColorTempIndexValue
                                      }
                                      teleWBSceneValue={teleWBSceneValue}
                                      setTeleWBSceneValue={setTeleWBSceneValue}
                                      teleBrightnessValue={teleBrightnessValue}
                                      setTeleBrightnessValue={
                                        setTeleBrightnessValue
                                      }
                                      teleContrastValue={teleContrastValue}
                                      setTeleContrastValue={
                                        setTeleContrastValue
                                      }
                                      teleHueValue={teleHueValue}
                                      setTeleHueValue={setTeleHueValue}
                                      teleSaturationValue={teleSaturationValue}
                                      setTeleSaturationValue={
                                        setTeleSaturationValue
                                      }
                                      teleSharpnessValue={teleSharpnessValue}
                                      setTeleSharpnessValue={
                                        setTeleSharpnessValue
                                      }
                                      setShowSettingsTeleMenu={
                                        setShowSettingsTeleMenu
                                      }
                                    />
                                  </Popover.Body>
                                </Popover>
                              }
                            >
                              <i
                                className="bi bi-sliders"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "1.75rem",
                                }}
                              ></i>
                            </OverlayTrigger>
                          </button>
                        </div>
                      )}
                      <div className="separator"></div>
                      <img
                        src="/images/settings-white.png"
                        className="cameraAddon-image"
                        alt="Settings"
                        role="button"
                        tabIndex={0}
                        aria-label={`Open ${activeBtnSettings === "wide" ? "wide-angle" : "telephoto"} camera settings`}
                        onClick={openSelectedCameraSettings}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openSelectedCameraSettings();
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                      <div className="button-container">
                        <button
                          className={`button ${
                            activeBtnSettings === "tele" ? "active" : ""
                          }`}
                          onClick={() => {
                            updateTeleData();
                            handleBtnSettingsClick("tele");
                          }}
                        >
                          Tele
                        </button>
                        <button
                          className={`button ${
                            activeBtnSettings === "wide" ? "active" : ""
                          }`}
                          onClick={() => {
                            updateWideData();
                            handleBtnSettingsClick("wide");
                          }}
                        >
                          Wide
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </Modal.Body>
        <Modal.Footer className={styles.cameraModalFooter}>
          <span>
            Opening these controls does not change the current imaging mode.
          </span>
          <button
            type="button"
            className="dw-button is-secondary"
            onClick={closeCameraPanel}
          >
            Close controls
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
