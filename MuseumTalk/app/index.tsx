import OpenAI from "@/services/openai";
import { Audio } from "expo-av";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import * as FileSystem from "expo-file-system";
import { Button } from "@/components";
import { Buffer } from "buffer";
import * as Crypto from "expo-crypto";

const Recording = Audio.Recording;

let recording: Audio.Recording | undefined;

const sleep = (duration: number) => new Promise((resolve, _) => setTimeout(resolve, duration));

const { transcription, analizeImage, textToSpeech, analizeImageStream } = OpenAI();

class AudioPlayer {
  queue: string[];
  isPlaying: boolean;
  text: string;

  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.text = "";
  }

  playAudio = async () => {
    if (this.isPlaying) return;
    await this.playNextAudio();
  };

  addToQueue = (fileUri: string) => {
    this.queue = [...this.queue, fileUri];
  };

  createAudio = async (description: string) => {
    await sleep(500);
    console.log("Text Created: ", description);
    const audio = await textToSpeech(description);
    const UUID = Crypto.randomUUID();
    const fileUri = FileSystem.cacheDirectory + `${UUID}-audio.mp3`;
    const fileReader = new FileReader();
    fileReader.onload = async () => {
      const arrayBuffer = fileReader.result as ArrayBuffer;
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
      this.addToQueue(fileUri);
      this.playAudio();
    };
    fileReader.readAsArrayBuffer(audio);
  };

  playNextAudio = async () => {
    try {
      if (this.queue.length === 0) {
        this.isPlaying = false;
        return;
      }

      this.isPlaying = true;
      const fileUri = this.queue[0];
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.queue = this.queue.slice(1);
          await this.playNextAudio();
        }
      });
      await sound.playAsync();
    } catch (error) {
      console.log("Error", error);
    }
  };

  appendText = (text: string) => {
    this.text += text;
  };

  clearText = () => {
    this.text = "";
  };

  getText = () => {
    return this.text;
  };
}

const audioPlayer = new AudioPlayer();
//data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhUTExMVFhUXGBcYFxcXFxUVGBcXFxoXFxcXFxUYHSggGB0lHRcVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIARIAuAMBIgACEQEDEQH/xAAbAAABBQEBAAAAAAAAAAAAAAADAAECBAUGB//EADwQAAEDAgIGCAIJBAMBAAAAAAEAAhEDIQQxBRJBUWGRBhMicYGhsfDB0RQyQlNygrLh8RVSYpIjQ6Iz/8QAGQEAAwEBAQAAAAAAAAAAAAAAAQIDAAQF/8QAJxEAAgICAgIBBAIDAAAAAAAAAAECEQMhEjFBUQQTFCIycbEFYaH/2gAMAwEAAhEDEQA/AMOnh2mYY2AdwS6gD7I5BH0Ldrp3q85q59BlOV9mX1G5jeSINYW1G/6q4EzghoXnL2UyXbGt/wBQhu1puxvi35LRa1M50o6Nzl7Mwyf+un/qpQYjUZHEBXXJLaNzl7KBpi3/AB0yPwwVP6OLRTZHdxV2Ak4QFqib6k/ZnPwrY/8AmzPcnp4YD/rp9xarmqiNhNxRvqS9mW7CA/8AWzwAUX6PH3beRWuAFKJW4pG+pL2YztHD7tnmFD+nN+7b/wCvmtws4KJbwStB5yMU6Ob923zKR0a37tnJbjWKWpwR0bnIw/6a37unyTDRLfumeYW6RwU9Tgm0DnI57+kt+6ZzKh/Sh903nK6ZtPgnbTG5bRucjlq+jKbRenFjt2gEp1qacbZsf5ebSkhZaG1YtAOs7vHotdwWZ0abId+L4Ba1Rl1NvZKXYEgQo9UEYUoF08QhYoE0kNzeCPKfwWs1FQ00g1WSxQhbkagQamcMlZDJROpstYaKjacqbaCDiNJUadnPE7hLj5Ku3T9H/Lkm5BWOT8Fw0ymaFClpeg/J4H4pHqrbW7RdDkZxa7BsbKRCPCG8ItgSBhqlqp2JwELDQzGIpTAXU9W6awUQUgE7wp0whyNRh6dZGr+f9JTqfSMfV/P+lJEvj6I9GDZ34vgtt/BYfRy+tGw/DYt+m6M0snsjJbBOBKQp2R1BzVNmAlicMU9UqeqhYaAOPBIMCmWo1Omj2Ar1Ia3WNgBJK5DTGmXVeywlrOFi7x3LW6S4ovc3Dszce13LW0N0WphoLmAn/Iz5ZKeTLGJ04cVqzhHUQGAb/YVctXrVfQlMiNVvILmNNaAZEhoB4WU4fKSdM6ZYr6OL1yOKs4HSr6Rlplu1hy8Nx4qGKwxaVUXZqW0c7taZ6JozGsrMD2dxG0HcUarSXB6C0maFUH7Js8cN/eF6HAInMFCqdHPJUVGhGY0KWopNprXQpDq7qYCIOCWqkdjIGQnYE0IlMLJmaMbpI3sg/i/SUlPpK3sj836UlVdFcfRS6MVIe8W+sPRdQALrhtF4kMeZ2xfOLLafjjaCdnklktkpdmzTI1o3qy1oWA2sQ4OCuHSWzJTugUaXUi6E8LPpaR1TJy27yr2GxbKlsjuQRh3jZ3JYysKdPWO5WmASuc6ZYjs6gOyfO45BBseEbZjaBHWYp785OZXpFB8ALzrobWa11QuIGRvZdhhtNUnO1QbnLj4rk+RfNno4kuJsmrZZGkXEyIUtKaaZRbJzOxZY6QMI1nNIG+DHNQpsoYOldHncubqtgwuyxumabxDSCuOxju0V6HxnLpnNlS7RXqLuej2ktbDsBu5vZPhl5QuH2XWvoKsQxwGesCPEfsuuSOSa0dqMQO9WG1cvHl7hc/RqyZm+5WxijBPAqdMk2azDKOLqlgK4IA2wroF1JyodIG5qegLqeIaW5KjTrlpkrR2wvRV6UAao/N+lJU9OV3OInLt/pKZdC0h4dGBT+vbgtikzIKjhQOtdNx/PwCMMReIHmjLslJGgMzfJBLpNyhCtsgKAbIzupyQEM1+1aWAxDetaSYAAjiT2QDzWRUmEKSg0E6qvpsB0AdmInisDpXWBcIPAnmQPXmqjq1oM5qljMTr24z6pa0Vxr8jQ6L6K68VDeWubEEeOa2ToR/XF2tV1REB7gQCN1yeKodAa4FSoybGCu6qvBLRvK488pc2juxpcUzl+kOD6yuwX1YFk+kej5qFpaKwgRAdY8bmy0dIvAreIC2RiYbdR5NVRSkzkafR2nSaXOHb4mY8AuO0i4a5Xa9IMdnBXB4m7iV2fG5SdyIZqSpAtq0NFPguHAHfl/Kz3K/omq1r5dlBFvA/NdzOOXRsYcmbeaJUeSIO9KjVpHa4eOfkpltI/ad78FkQZpaFr9qCeHvkt4uC5jC0mAy2otX6Va7goZIbseLLVZ85KpTf277IQKmkgNov3pfSABJIuhCLT2GW0U9NCT/uf/KSDisQCY/xqX/KZ9I8UlZ+CmPoyn1dV7u79k7STzQsQYed1kSi+8rSexGXDn78VBx3JB07kz3wkYEibnWuoTmhTO1P1Z9wiDoHUKza+ZHFa7aEnLzVDGU9UngSsUx9i0DVLK4vE2+K7xuLYRq1Xars2uyg7wfFeZkkEOFiLrveiumhWGoSA+PZC5PlY2/zR24ZL9TCq0SKxdUrzebHO8hdSzSJqtkAgbDvTaS0Q8HWdUa4bOyAs/EY/UbBKg3zop+pl6WOd1zlTNamNxOtJWS83Xdhi0jmyOyLkTCZoZKNhswuhvRDyazWp7ooZlCIaUXKyZFkKdQjLNGpueUFpRHVHZQi0AJWO85BAa64unAJzScAChQR6keVSdttVOoVDeMuy735Jlmy0Fop4v65SZEX2KePu+3v3CTMPKElYjJUM5ixVh9OdiFTwp25BWmsgS4Jf5BforCi72Qisw54Zb0YVGAeW9HY8QCMsrRyRVCuyFLCj7QHgVlaYp6rzuN/gfRbRqSN+SytMVAW8Q6PJBj420zEqOKHhsQ5jg5pIIyIRKhQU8VaotN1s6B3SKvUbfLKQs2riydhK1ui1MPY9jt4I9D6BExmiYMrkcscJNUVXKSuzCEuzUatKM10GG0eVT0thCLorMm6Rvp6MVynTskW3UniACuiyLRs06pIEeiMXmP4VHB4tpA1ld62kYAJCNkGiHWqD6yudQ3OY3T8lJuBBEwfNBzS7YUr8AKTxt2KQa0m3vmi1cOwZTJ4fuhU4aeM8PNBZEw8GAcBr8dV1+KSlXH/JbLVPIR8UlrtJlYqtAXjtE8Vbw7gQqzR2ne9pUi2YSSy8ZBWJSiWWYgXz4X2qNevA3yhYalcjajiibZfyufNmcnXgaGFRKrTPaib/AAVN9QhztUnZ+60sQ6AABvBVCmy/ghjn5DKINtUuDrneZVSvUJgeatMpxO74Ki4ySurHTZNqiLmrZ0X0ffUhxBAOzae/chaHwBqVGjjJ+S9PwmEDQIChn+Q4vjEvDEntmRg9DsY0QMkR+Ek5Lce0BBbTuuBybZdIzBgQAsjT+FbqE+8l1VVq5npGB1bgbceayf5INHHUqcuhCrtsBwVljr2yhUXPkr04NtnNNJCoiD7zWnh8M5xEEZ2VA0SRMFFoVSDBMFPJ2ScDX/ojzBJ+XgtEN1KcOdJ4SU2Fx/ZDTJgQY8s1Kq1sE9oAZ2FjzuuSc2+wxjRSY8zLs9voAqtS7rZLR6lpuSY42JQKzBcCQN6eE1ZminVI1rZajvT+UlGsIv8A4u8LD9k67IfqhHpkQ/tH3tKIAbeirtPbOy/7q3rRxXNnVSOjEriDpPc12tlBkK9hNItMNeL37VveSrii5xyKZuDMx8QuWThL9inFlrFUxGXmqDjqgkrQGGcLucGxxGXdtWRpvGh5AbkMzvKGCDnKl0LOoq2Z9eqXHgpaOw+u8NCFsWloZxpuDomDfu716OV8YNRIwVytnZ6C0Jqu1zsGWecGSeS6UCFX0VpGjUaNUgHaDY+IR6r+1AK8W3ezrbERKZrYKtUqXNTdTCZJg5GZXZ4LlOkxEAcffvgu2xQEXXFaZqsJzn08fktFPkMmqOaZRc42Hw3q3g9CA5HWPAT8gnfj6TNmueOQ8FVxWm6rrawY3+0W8gu1LI+tEW49s0MVgQG3PNzW+QWDi2NBseRn4BDqYknb80IvnaunFhlHtkpzTLmE0i5ljlvgH1W1htM/3taRlOqJnn8Fy7Vaw1T7PL5I5MK7QINPTOrpaWZN2CIz+EKxUr03iA2J3BcpTcWmRbwBHIroMDphsHrG32Fth4jYuaeOuilNFHSOFDCL2LXZiNxSRNKVQ64/tfy7PzSXZi/RWQmmmZOIdfkr+DfInP3uWdVz8AoYJxkhLnx8olfjz4ujoC4wIsds7VGlTdGV1Vp1yNpUxiHLzeEl0dzporaYc9oDSCCd4IsshwV7Slcudc5DgqDnL08Eagjz8z/Jh6LZICvNIaDCpYU3lSfUJEbzKWcbdATpF1tc2N5+zsPC60sHpauwz1k/iE+eawWO7Q8leFQRw9n5rnniRRTOpp9Mav2mMPcSFZZ0xBsaZ5hcRUrDL3kmFSLk+Hz+Sn9uhnkOg0x0ic8f2tOQ2lc1jcXYAnwzPjsCBiMVJ+Jz/ZU4krqxfHUSUsrYcVZyRG4fMn2ffompAAIwdMDYPVVb9CpeyvUaPfegharcG2Jdc7hYDvO1AdSbsA996EcqM4MohTY+CCk5gTBit2KtGqyu0jL33p6A1kLBMDmxaR7ClXbqlctK2kdnK0pMnQcSCDsa74JlHDtgO29lySujll2Qc28ncFoaJwcy47ZA7t6B1gAuAT2fRGpaQNrCyhm5tUh8dLZrNwzYyHohV8KwNJjftyVY48i5HqqWktJlwLRtz+S5I4sjkXeRJdmbiCJtkq7kSJSfThemmlo42rIMfCm037vkhhSYs0ZD033JROsIQQc1KJKDiayzSJN+QQ8RVjK528O5OXWt7Cr1HQljHYWwTs+KmwIYU5VWIibjeyuUGRA5qnh81adWA8PVRn6RWHsvPeBnsWbiMVNghYjEFyEQhjxpdhlK+h5R2tkSgI9N9ldkl2Tw1KTEwrFegQAbkZKrSqwQdxV86RGWrIUp8rtFYNVTYPCkifwu/SUlNtUGREWKdMn7Fktjl3Z5eiTXJy2By+aq1KmwHv7lN7dBWkErYmcuf7KqWpza6ZtYzlKZKlo3fYajTUq9OBcQgCoTs8x6Jn1CN/ilabYdJAXBDBRqzkFpVY9CSHlEZ77kGEdp1e9Fiodz4zVZ5kqTzJUIWiqA2TCgnBTymMFoGEN9SUnGyi1qWvI1+CbWp5UmlS1BEwlvY9aBEKYyUSpTATiMQR2gIDSrVIWKEugw7LGHYJ32PokiYVlz3H4JlO9DPsZ7+wPfBZ5NyrmIMNWe1GK2wPpBhcgFXsM1ozEjbxO62aoUT2pWtRqarAbTs2yTYfEqHyW1pFsNETRcBrGGA5NENJHdkg4jDmIDBOZveN5iwCsVat9d3aqH6jdgGzgBuCi7ExEQ47N2tkXRti4G8gncuaLl2irox61NzTqkX3bkPqznBjf+69F6PaOpgazgCZ23kjNx33lbuKa0iPJF/wCQrXET7a/J44o9ZzXoOkej9J8ktg7xY/uucxfRKoLscHDcbH5FXxfOxT70Tn8ea62YBfKZRrUXMdquBBGYKdi7VVaOb+SbRCiHXTuUWLGJKbWqEqTUGNEKExlSZCi5J5K+BiE8qCm1qckNKNRfCEVJoC3aMtM08E6/NJC0fn4O9EyjNFosnjPq+Pv0VBoCu4h7dUybrOATx8iPwTLoKtU6twTkDMclRcSpNqHcjOHIEZUy+6pJJPvIAKbXjWEbreBlZ7K107qkxGexR+iV+odhonSgFMCbiZ5rSpaQkrlMHoqs6Lak7zc/l+a12Yc0TDiTaxNl5ebFBN8Xs68cm+0dA2qClq7FmUMQiDExcmy5KZYWN0HSqzrAE+fgRkuS0z0dNI9l1tzrHwIsV0ukH1WjraXaAzbvHBD/AK3TxDNSoIduOcjcuvBky41adr0TyY4T0+zgHSEy6w4doM9WyRkQADbbI281LE4oOERfaDBHLI+ELv8AvfUf+nL9p7ZzFLCvd9VpPvipvwVRubCPTnktokC4BE7rjkVN1xrNMHbBz4ofdyvrQy+LGuzCgjMe+9Jy0ah1gZjkAfGFnVWwV0Y8nLsjOHETQTZTMfshsfdO5/BWJCUmobSi01mZFvCG47neiSVLPwd6JJKsLdAcb9YqswqxjT2iq7E66FJFiUKc702sEGMgLwVsdHoaH1IEiACdm+FmxK0tF1g0BtvrT37PgofIt42kVwr89nS4IxD3m5+q34n5K7pGgHNvnn3LKwZc585xlxKsaR0i1o1JE7V5Di+VI7k9GZTqlri0/wAq/QxbCdR4zHNYGLxc32+KD9NJEOBkZELqfx3JWT+qkzo6r34Yi5dSOTtreB+ao6TwjXzUpi+ZA9RxVQaXOrqOu3f80Kni+ruDLd27uQjhmt+f7G5x68f0PRx0CHAniMwhurSQdtvNNpGuwkPYRexHxhUxUuuhY7V0Tlka1ZoUqwkgoD8zH8qo2pdSFRFYaehHlDOqFV8UZT1KqC90qsIUyc52qBKbUwaiU2roshQzQrNBtxZCARqeYKEnoaCplotiO4+hSSDgT4FJLHo2R7KmLaNYoTRCLi/rHwQWhN4ATqQohoSCkgEWqkHxkme5INQf+wo2tHY8hjjt9JzWdWxBc8ygMqEDvQ3OUIYkpNotLJaSLL6p2JBxO5AZUU/pCfiJYepUts5KsX+4Q3VuCh1pTqAvIIWjcoFqXWpw5NTBaZCFKVF5SCIBJiE5KSxhmlHaLdyrq1QvZaWkaO2IJwclEpxmghi3hxLgDlDvJpSQWPu47g79JSW4tk5ypgqrr+CiCiYygQQY2BBLDu9PmmXRrRMFQc5MGHcpNpO3FCg2iTWpEpw1x+yUzqLon337kvFh5IESbpB8p/o7t3ombRduKagWOwoT3qwKLpyKgcI45A8iglsZtUCBUHFF+ju4+aY4d248imEYMFEaUhTO424FTYw7kGFAnFIORfo5N4PJCdTIMQsgMdOUmUzOXkUng7jyKwbREFHpOQAw7lJrjuKzTZk0gxTNN0wDjaDyTNpnYCfAoJMLki1RZIcdwPmD8kkTDMIY4kfZyi83+HqknWiU9syNc7zzS1zvPNJJOSH61288ynFQ7zzSSWMHpvO85orXHVTpKcikQQcb3TsOaSSKCydHMe9qrmod5z3lJJYxaDjOaOHGT3/EpJIGRFxVZzjvTpLBFSquBsTzKcFOksEeq47yhlxgXO1JJEXwM1xUykkiKyYcd6Qed5SSWMBr1Xdq55ncnSSRQGf/2Q==
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
      quality: 0.0001,
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
          analizeImageStream(
            images,
            data,
            async (_text) => {
              audioPlayer.appendText(_text);
              if (_text == ".") {
                audioPlayer.createAudio(audioPlayer.getText());
                audioPlayer.clearText();
              }
            },
            () => {
              setProcessing(false);
              recording = undefined;
              const t2 = Date.now();
              console.log("Process end in", t2 - t1, "ms");
            }
          );
        }
      }
    } catch (error) {
      Alert.alert("Error", "error processing audio");
    }
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
