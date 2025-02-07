import React, { useState, useEffect } from "react";
import { Modal, View, Pressable, Text, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

interface FilePreviewModalProps {
  visible: boolean;
  fileUrl: string;
  onClose: () => void;
}

type PreviewType = "pdf" | "csv" | "office" | "media" | "text" | "unsupported";

interface ViewerConfig {
  [key: string]: {
    types: string[];
    extensions: string[];
    viewer: (url: string) => string;
    directEmbed?: boolean;
  };
}

// Media types and extensions
const MEDIA_TYPES = ["image/", "video/", "audio/"];
const MEDIA_EXTENSIONS = [
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp", // Images
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm", // Videos
  "mp3",
  "wav",
  "ogg",
  "m4a", // Audio
];

// Text types and extensions
const TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "application/json",
  "text/html",
  "text/xml",
];
const TEXT_EXTENSIONS = ["txt", "md", "json", "xml", "html", "css", "js"];

const VIEWER_CONFIG: ViewerConfig = {
  pdf: {
    types: ["pdf"],
    extensions: ["pdf"],
    viewer: (url) =>
      `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(
        url
      )}`,
  },
  csv: {
    types: ["text/csv", "text/comma-separated-values"],
    extensions: ["csv"],
    viewer: (url) =>
      `https://docs.google.com/gview?url=${encodeURIComponent(
        url
      )}&embedded=true`,
  },
  office: {
    types: [
      "msword",
      "wordprocessingml",
      "ms-excel",
      "spreadsheetml",
      "ms-powerpoint",
      "presentationml",
    ],
    extensions: ["doc", "docx", "xls", "xlsx", "ppt", "pptx"],
    viewer: (url) =>
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        url
      )}`,
  },
  media: {
    types: MEDIA_TYPES,
    extensions: MEDIA_EXTENSIONS,
    viewer: (url) => url, // Directly embed media files
    directEmbed: true,
  },
  text: {
    types: TEXT_TYPES,
    extensions: TEXT_EXTENSIONS,
    viewer: (url) =>
      `https://docs.google.com/viewer?url=${encodeURIComponent(
        url
      )}&embedded=true`,
  },
};

const getPreviewType = (url: string, mimeType: string): PreviewType => {
  const extension = url.split(".").pop()?.toLowerCase() || "";

  // Check media files first
  if (
    MEDIA_TYPES.some((t) => mimeType.startsWith(t)) ||
    MEDIA_EXTENSIONS.includes(extension)
  ) {
    return "media";
  }

  // Check text files
  if (
    TEXT_TYPES.some((t) => mimeType.includes(t)) ||
    TEXT_EXTENSIONS.includes(extension)
  ) {
    return "text";
  }

  // Check other types
  for (const [type, config] of Object.entries(VIEWER_CONFIG)) {
    if (
      config.types.some((t) => mimeType.includes(t)) ||
      config.extensions.includes(extension)
    ) {
      return type as PreviewType;
    }
  }

  return "unsupported";
};

const FilePreviewModal = ({
  visible,
  fileUrl,
  onClose,
}: FilePreviewModalProps) => {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [previewUrl, setPreviewUrl] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setStatus("loading");
    const verifyFileAvailability = async () => {
      try {
        // Check network connectivity
        const networkCheck = await fetch("https://www.google.com/", {
          method: "HEAD",
          signal: controller.signal,
        });
        if (!networkCheck.ok) throw new Error("Network error");
        setIsOnline(true);
        // Check file availability
        const fileCheck = await fetch(fileUrl, {
          method: "HEAD",
          signal: controller.signal,
        });
        if (!fileCheck.ok) throw new Error("File unavailable");
        const mimeType = fileCheck.headers.get("content-type") || "";
        const previewType = getPreviewType(fileUrl, mimeType);
        if (previewType === "unsupported")
          throw new Error("Unsupported file type");
        setPreviewUrl(VIEWER_CONFIG[previewType].viewer(fileUrl));
        setStatus("ready");
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Network error") setIsOnline(false);
        }
        setStatus("error");
      }
    };
    verifyFileAvailability();
    return () => controller.abort();
  }, [visible, fileUrl]);

  const handleWebViewError = () => setStatus("error");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-center items-center p-4">
        <View className="w-11/12 h-4/5 bg-white rounded-xl overflow-hidden shadow-2xl">
          {status !== "ready" && (
            <View className="flex-1 justify-center items-center">
              {status === "loading" && <LoadingState />}
              {status === "error" && <ErrorState isOnline={isOnline} />}
            </View>
          )}

          {status === "ready" && (
            <WebView
              source={{ uri: previewUrl }}
              startInLoadingState
              renderLoading={() => <LoadingState />}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              onError={handleWebViewError}
              onHttpError={handleWebViewError}
              className="flex-1"
              {...webViewConfig}
            />
          )}

          <ControlBar onClose={onClose} />
        </View>
      </View>
    </Modal>
  );
};

const webViewConfig = {
  javaScriptEnabled: true,
  domStorageEnabled: true,
  cacheEnabled: true,
  allowFileAccess: true,
  mixedContentMode: "compatibility" as const,
};

const LoadingState = () => (
  <View className="items-center p-6 space-y-4">
    <ActivityIndicator size="large" className="text-supabaseGreen" />
    <Text className="text-gray-600 text-lg font-medium">
      Loading Secure Preview...
    </Text>
  </View>
);

const ErrorState = ({ isOnline }: { isOnline: boolean }) => (
  <View className="items-center p-6 space-y-2">
    <Text className="text-red-500 text-xl font-bold mb-2">
      {isOnline ? "Unsupported Format" : "No Connection"}
    </Text>
    <Text className="text-gray-600 text-center">
      {isOnline
        ? "This file format cannot be previewed"
        : "Please check your internet connection"}
    </Text>
  </View>
);

const ControlBar = ({ onClose }: { onClose: () => void }) => (
  <Pressable
    onPress={onClose}
    className="p-4 bg-gray-50 border-t border-gray-200 active:bg-gray-100"
  >
    <Text className="text-supabaseGreen text-center font-bold text-base">
      Close Preview
    </Text>
  </Pressable>
);

export default FilePreviewModal;
