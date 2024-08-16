import OpenAI from "@/services/openai";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import * as FileSystem from "expo-file-system";
import { Button } from "@/components";
import { Buffer } from "buffer";

const Recording = Audio.Recording;

let recording: Audio.Recording | undefined;

const sleep = (duration: number) => new Promise((resolve, _) => setTimeout(resolve, duration));

const { transcription, analizeImage, textToSpeech } = OpenAI();
export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { width, height } = useWindowDimensions();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraIsReady, setCameraIsReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [audioPermission, requestAudioPermission] = Audio.usePermissions();

  const [images, setImages] = useState<string[]>([]);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!showCamera && cameraIsReady) setCameraIsReady(false);
  }, [showCamera]);

  const onCameraReady = () => {
    setCameraIsReady(true);
  };

  const toggleShowCamera = () => setShowCamera(!showCamera);

  const resetImages = () => setImages([]);

  const requestAllPermissions = async () => {
    await requestPermission();
    await requestAudioPermission();
  };

  if (!permission && !audioPermission) return <View />;

  if (!permission?.granted && !audioPermission?.granted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text> We need your permission to show the camera</Text>
        <TouchableOpacity
          onPress={requestAllPermissions}
          style={{
            backgroundColor: "#D1E9F6",
            width: "40%",
            height: "5%",
            justifyContent: "center",
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              textAlign: "center",
            }}
          >
            grant permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    setProcessing(true);
    const picture = await cameraRef.current?.takePictureAsync({
      base64: true,
      quality: 0.03,
    });
    if (picture && picture?.base64) setImages((prev) => [...prev, `data:image/png;base64,${picture.base64}` ?? ""]);
    toggleShowCamera();
    setProcessing(false);
  };

  const recordAudio = async () => {
    try {
      if (!audioPermission?.granted) {
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: _recording } = await Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recording = _recording;
    } catch (error) {
      Alert.alert("Error", "error recording audio");
      console.log("error", error);
    }
  };

  const processAudio = async () => {
    const t1 = Date.now();
    setProcessing(true);
    try {
      await sleep(250);
      await recording?.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      const uri = recording?.getURI();
      console.log("Audio Uri: ", uri);
      if (uri) {
        const data = await transcription(uri);
        console.log("Transcription: ", data);
        if (data) {
          const description = await analizeImage(images, data);
          const { sound } = await Audio.Sound.createAsync(
            {
              uri: description as string,
            },
            {
              shouldPlay: true,
            },
            null,
            true
          );
          await sound.playAsync();
          const t2 = Date.now();
          console.log("Processin end", t2 - t1, "ms");
        }
      }
    } catch (error) {
      Alert.alert("Error", "error processing audio");
      console.log("error", error);
    }
    setProcessing(false);
    recording = undefined;
  };

  const renderItem = ({ item }: { item: string }) => (
    <View
      style={{
        margin: 5,
      }}
    >
      <Image source={{ uri: item, width: width * 0.3, height: width * 0.3 }} />
    </View>
  );

  const renderEmpty = () => (
    <View style={{ width, justifyContent: "center" }}>
      <Text style={{ textAlign: "center" }}>start taking some pictures ;)</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {!showCamera ? (
        <>
          <View style={{ height: "20%", justifyContent: "center" }}>
            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                }}
              >
                MuseumTalk
              </Text>
            </View>
          </View>
          <FlatList
            data={images}
            renderItem={renderItem}
            contentContainerStyle={styles.column}
            numColumns={3}
            style={styles.list}
            ListEmptyComponent={renderEmpty}
          />

          <View style={[styles.buttonContainer, { width }]}>
            <Button onPress={resetImages} title="reset" />
            <Button onPress={toggleShowCamera} title="Take A Picture" />
            {images.length ? <Button onPressIn={recordAudio} onPressOut={processAudio} title="Ask something" /> : null}
          </View>
        </>
      ) : (
        <CameraView ref={cameraRef} style={styles.camera} facing={"back"} onCameraReady={onCameraReady}>
          <Button title="close" onPress={toggleShowCamera} styles={styles.closeButton} />
          {cameraIsReady && <Button title="Take A Picture" onPress={takePicture} styles={{ height: "5%", marginBottom: 25 }} />}
        </CameraView>
      )}
      {processing ? (
        <View style={{ position: "absolute", width, height, backgroundColor: "black", opacity: 0.5, justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
  },
  column: {
    justifyContent: "flex-start",
    alignItems: "center",
    padding: "1%",
  },
  list: {
    flex: 1,
    flexWrap: "wrap",
  },
  camera: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#D1E9F6",
    width: "30%",
    height: "auto",
    justifyContent: "center",
    borderRadius: 10,
  },
  text: {
    textAlign: "center",
  },
  buttonContainer: {
    height: "7%",
    marginBottom: "5%",
    flexDirection: "row",
    justifyContent: "space-around",
  },
  closeButton: {
    backgroundColor: "#D1E9F6",
    width: "25%",
    height: "5%",
    justifyContent: "center",
    borderRadius: 10,
    position: "absolute",
    top: 25,
    left: 0,
  },
});
