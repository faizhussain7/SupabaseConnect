import { FileObject } from "@supabase/storage-js";
import {
  Image,
  View,
  ActivityIndicator,
  Dimensions,
  Text,
  Pressable,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { supabase } from "../config/initSupabase";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import React from "react";
import FilePreviewModal from "@/components/FilePreviewModal";
import RNFetchBlob from "rn-fetch-blob";

const MAX_ITEM_WIDTH = Dimensions.get("window").width - 32;
const AndroidRipple = "rgba(80, 200, 120, 0.8)";

interface FileItemProps {
  item: FileObject;
  userId: string;
  onRemoveItem: () => void;
  onImagePress: (fileUrl: string) => void;
}

const FileItem = ({
  item,
  userId,
  onRemoveItem,
  onImagePress,
}: FileItemProps) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const getFileType = (filename: string) => {
    const extension = filename.toLowerCase().split(".").pop() || "";
    if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
    if (["mp4", "mov", "avi"].includes(extension)) return "video";
    if (extension === "pdf") return "pdf";
    if (["doc", "docx"].includes(extension)) return "document";
    return "unknown";
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "video":
        return "videocam-outline";
      case "pdf":
        return "document-text-outline";
      case "document":
        return "document-outline";
      case "image":
        return "image-outline";
      default:
        return "document-outline";
    }
  };

  // useEffect to automatically clear the error after a delay
  useEffect(() => {
    let timer: string | number | NodeJS.Timeout | undefined;
    if (error) {
      timer = setTimeout(() => {
        setError(null);
      }, 5000); // Clear the error after 5 seconds
    }
    return () => clearTimeout(timer); // Cleanup timer on component unmount or when error changes
  }, [error]); // Only run the effect when `error` changes

  useEffect(() => {
    const loadFile = async () => {
      try {
        setLoading(true);
        const { data: urlData } = await supabase.storage
          .from("images")
          .createSignedUrl(`${userId}/${item.name}`, 3600);
        if (urlData?.signedUrl) {
          setFileUrl(urlData.signedUrl);
          // Handle image dimensions only for image files
          if (getFileType(item.name) === "image") {
            Image.getSize(
              urlData.signedUrl,
              (width, height) => {
                const aspectRatio = width / height;
                const scaledWidth = Math.min(width, MAX_ITEM_WIDTH);
                setImageSize({
                  width: scaledWidth,
                  height: scaledWidth / aspectRatio,
                });
              },
              (err) => console.error("Error getting image size:", err)
            );
          }
        }
      } catch (error) {
        console.error("Error loading file:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFile();
  }, [item.name, userId]);

  const handleFilePress = () => {
    if (fileUrl) {
      const fileType = getFileType(item.name);
      if (
        [
          "image",
          "pdf",
          "video",
          "docx",
          "xlsx",
          "pptx",
          "txt",
          "csv",
          "json",
          "doc",
          "xls",
          "ppt",
          "mp3",
          "mp4",
          "mov",
          "avi",
          "mpg",
          "mpeg",
          "wmv",
          "flv",
          "webm",
          "unknown",
          "document",
        ].includes(fileType)
      ) {
        setIsPreviewVisible(true);
      } else {
        downloadFile();
      }
    }
  };

  const downloadFile = async () => {
    if (!fileUrl) {
      setError("Unable to process file.");
      return;
    }
    try {
      setDownloading(true);
      setError(null);
      // Get the directory path based on platform
      const dirs = RNFetchBlob.fs.dirs;
      const filePath = `${
        Platform.OS === "ios" ? dirs.DocumentDir : dirs.DownloadDir
      }/${item.name}`;
      // Check if file exists
      const exists = await RNFetchBlob.fs.exists(filePath);
      if (exists) {
        await openFile(filePath);
        return;
      }
      const response = await RNFetchBlob.config({
        fileCache: true,
        path: filePath,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          title: item.name,
          description: "Downloading file...",
          mime: getMimeType(item.name),
          mediaScannable: true,
          path: filePath,
        },
      })
        .fetch("GET", fileUrl, {})
        .progress((received, total) => {
          const progress = received / total;
          setDownloadProgress(progress);
        });

      if (response.path()) {
        await openFile(response.path());
      } else {
        setError("Failed to retrieve the downloaded file path");
      }
    } catch (err) {
      setError("Failed to download file");
      console.error("Download error:", err);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Update the openFile function
  const openFile = async (uri: string) => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL(`file://${uri}`);
      } else {
        // For Android, use the appropriate intent
        await RNFetchBlob.android.actionViewIntent(uri, getMimeType(item.name));
      }
    } catch (error) {
      console.error("File opening error:", error);
      setError("Unable to open file");
    }
  };

  const getMimeType = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
      csv: "text/csv",
      json: "application/json",
    };

    return mimeTypes[extension] || "application/octet-stream";
  };

  const shareFile = async () => {
    try {
      setIsSharing(true);
      if (!(await Sharing.isAvailableAsync()))
        return Alert.alert(
          "Sharing Not Available",
          "Sharing is not supported on this device."
        );
      if (!fileUrl) return setError("Unable to process file.");
      const dirs = RNFetchBlob.fs.dirs;
      const filePath = `${
        Platform.OS === "ios" ? dirs.DocumentDir : dirs.DownloadDir
      }/${item.name}`;

      if (await RNFetchBlob.fs.exists(filePath)) {
        const fileUri = `file://${filePath}`; // Ensure proper URI format
        await Sharing.shareAsync(fileUri, {
          mimeType: getMimeType(item.name),
          dialogTitle: `Share ${item.name}`,
        });
        console.log("File shared successfully!");
        return;
      }
      const response = await RNFetchBlob.config({
        fileCache: true,
        path: filePath,
      }).fetch("GET", fileUrl);
      if (response.info().status !== 200)
        return setError("Failed to download the file");
      const fileUri = `file://${response.path()}`; // Ensure proper URI format
      await Sharing.shareAsync(fileUri, {
        mimeType: getMimeType(item.name),
        dialogTitle: `Share ${item.name}`,
      });
      console.log("File shared successfully!");
    } catch (error) {
      console.error("Error sharing file:", error);
      Alert.alert("Error", "Unable to share the file.");
    } finally {
      setIsSharing(false);
    }
  };

  const renderFileContent = () => {
    const fileType = getFileType(item.name);

    if (loading) {
      return (
        <View className="w-full bg-gray-800 rounded-lg items-center justify-center p-4 shadow-lg">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      );
    }

    if (fileType === "image" && fileUrl && imageSize) {
      return (
        <>
          <View className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <Pressable
              onLongPress={onRemoveItem}
              android_ripple={{ color: AndroidRipple, borderless: false }}
              onPress={() => onImagePress(fileUrl)}
            >
              <Image
                source={{ uri: fileUrl }}
                style={{
                  width: imageSize.width / 2,
                  height: imageSize.height / 2,
                  alignSelf: "center",
                }}
                resizeMode="cover"
              />
            </Pressable>
            <View className="p-3 flex-row justify-between items-center">
              <Text className="text-gray-300 flex-1 mr-2" numberOfLines={1}>
                {item.name}
              </Text>
              <View className="flex-row space-x-2">
                {downloading || isSharing ? (
                  <View className="w-8 h-8 justify-center items-center">
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : (
                  <>
                    <Pressable onPress={downloadFile} className="p-2">
                      <Ionicons
                        name="download-outline"
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                    <Pressable onPress={shareFile} className="p-2">
                      <Ionicons
                        name="share-outline"
                        size={20}
                        color="#9CA3AF"
                      />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
            {error && (
              <Text className="text-red-500 text-sm px-3 pb-2">{error}</Text>
            )}
          </View>
        </>
      );
    }

    return (
      <>
        <View className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <Pressable
            onPress={handleFilePress}
            android_ripple={{ color: AndroidRipple, borderless: false }}
            onLongPress={onRemoveItem}
            className="p-4 items-center"
          >
            <Ionicons name={getFileIcon(fileType)} size={32} color="#9CA3AF" />
            <Text className="text-gray-300 mt-2 text-center" numberOfLines={2}>
              {item.name}
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              {(item.metadata?.size / 1024 / 1024).toFixed(2)} MB
            </Text>
          </Pressable>
          <View className="border-t border-gray-700 flex-row justify-between items-center">
            {downloading ? (
              <View className="w-full items-center p-3">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-gray-400 text-sm mt-1">
                  {Math.round(downloadProgress * 100)}%
                </Text>
              </View>
            ) : isSharing ? (
              <View className="w-full justify-center items-center p-3">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <View className="flex-row justify-around w-full h-full items-center">
                <Pressable
                  onPress={downloadFile}
                  className="p-2 flex-1"
                  android_ripple={{ color: AndroidRipple, borderless: false }}
                >
                  <View className="flex-col space-y-2 items-center">
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color="#9CA3AF"
                    />
                    <Text className="text-gray-400 text-sm">Download</Text>
                  </View>
                </Pressable>
                <View className="border-l border-gray-700 h-full self-center"></View>
                <Pressable
                  onPress={shareFile}
                  android_ripple={{ color: AndroidRipple, borderless: false }}
                  className="p-2 flex-1"
                >
                  <View className="flex-col space-y-2 items-center">
                    <Ionicons name="share-outline" size={20} color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm">Share</Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>
          {error && (
            <Text className="text-red-500 text-sm px-3 pb-2 self-center">
              {error}
            </Text>
          )}
        </View>
        <FilePreviewModal
          visible={isPreviewVisible}
          fileUrl={fileUrl || ""}
          onClose={() => setIsPreviewVisible(false)}
        />
      </>
    );
  };

  return <View className="m-2">{renderFileContent()}</View>;
};

export default FileItem;
