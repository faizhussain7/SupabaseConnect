import {
  View,
  Alert,
  Pressable,
  BackHandler,
  Text,
  ActivityIndicator,
} from "react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../provider/AuthProvider";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../config/initSupabase";
import { FileObject } from "@supabase/storage-js";
import FileItem from "@/components/FileItem";
import Animated, {
  withDelay,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  SharedValue,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import { MasonryFlashList } from "@shopify/flash-list";
import EmptyState from "@/components/EmptyState";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SPRING_CONFIG = {
  duration: 1000,
  overshootClamping: true,
  dampingRatio: 0.8,
};

const TIMING_CONFIG = {
  duration: 500,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;
const CACHE_DURATION = 3600 * 1000;
const OFFSET = 60;
const AndroidRipple = "rgba(33, 33, 33, 0.3)";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ActionButton = {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => Promise<void>;
  label: string;
};

const FloatingActionButton: React.FC<
  ActionButton & {
    isExpanded: SharedValue<boolean>;
    index: number;
  }
> = ({ isExpanded, index, iconName, onPress, label }) => {
  const animatedStyles = useAnimatedStyle(() => {
    const translateY = withSpring(
      isExpanded.value ? -OFFSET * index : 0,
      SPRING_CONFIG
    );
    const scale = withDelay(
      index * 100,
      withTiming(isExpanded.value ? 1 : 0, {
        duration: 300,
        easing: Easing.out(Easing.exp),
      })
    );
    const opacity = withDelay(
      index * 80,
      withTiming(isExpanded.value ? 1 : 0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      })
    );
    const rotate = withTiming(isExpanded.value ? "0deg" : "-0deg", {
      duration: 250,
      easing: Easing.out(Easing.quad),
    });
    return {
      transform: [{ translateY }, { scale }, { rotate }],
      opacity,
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const opacity = withDelay(
      10 * index,
      withSpring(isExpanded.value ? 1 : 0, TIMING_CONFIG)
    );
    const translateY = withSpring(
      isExpanded.value ? -OFFSET * index : 0,
      SPRING_CONFIG
    );
    const translateX = withTiming(
      isExpanded.value ? 0 : OFFSET * index,
      TIMING_CONFIG
    );
    const scale = withSpring(isExpanded.value ? 1 : 0, TIMING_CONFIG);

    return {
      transform: [{ translateY }, { translateX }, { scale }],
      opacity,
    };
  });

  return (
    <View className="absolute bottom-7 right-7 flex-row items-center justify-end">
      <Animated.Text
        style={labelStyle}
        className="text-black text-sm font-bold bg-supabaseGreen rounded-md right-safe-offset-14 p-1"
      >
        {label}
      </Animated.Text>
      <AnimatedPressable
        onPress={onPress}
        android_ripple={{ color: AndroidRipple, borderless: false }}
        style={[animatedStyles]}
        className="w-10 h-10 bg-supabaseGreen rounded-full shadow-lg justify-center items-center absolute"
      >
        <Ionicons name={iconName} size={20} color="white" />
      </AnimatedPressable>
    </View>
  );
};

const Home = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retryTimeout, setRetryTimeout] = useState<NodeJS.Timeout | null>(null);
  const isExpanded = useSharedValue(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const isOverlayVisible = useSharedValue(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (isExpanded.value) {
        isExpanded.value = false;
        return true;
      } else if (isOverlayVisible.value) {
        isOverlayVisible.value = false;
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, [isExpanded, isOverlayVisible]);

  const loadFromCache = async () => {
    const lastFetchedStr = await AsyncStorage.getItem("lastFetched");
    const lastFetched = lastFetchedStr ? parseInt(lastFetchedStr, 10) : null;
    if (lastFetched && Date.now() - lastFetched < CACHE_DURATION) {
      const cachedFiles = await AsyncStorage.getItem("cachedFiles");
      if (cachedFiles) {
        return JSON.parse(cachedFiles);
      }
    }
    return null;
  };

  const cacheFiles = async (files: FileObject[]) => {
    await AsyncStorage.setItem("cachedFiles", JSON.stringify(files));
    await AsyncStorage.setItem("lastFetched", Date.now().toString());
  };

  const loadFiles = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      const netInfo = await NetInfo.fetch();
      const cachedData = await loadFromCache();
      if (cachedData) {
        setFiles(cachedData);
        setIsInitialLoading(false);
        if (!netInfo.isConnected) {
          return;
        }
      }
      if (netInfo.isConnected) {
        const { data, error } = await supabase.storage
          .from("images")
          .list(user!.id);
        if (error) throw error;
        setFiles(data || []);
        await cacheFiles(data || []);
        setRetryCount(0);
      }
    } catch (error) {
      console.error("Error loading files:", error);
      if (retryCount < MAX_RETRIES) {
        const delayTime = RETRY_DELAY * Math.pow(2, retryCount);
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
        const timeout = setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          loadFiles();
        }, delayTime);
        setRetryTimeout(timeout);
      } else {
        Alert.alert(
          "Error",
          "Failed to load files after multiple attempts. Please check your connection and try again."
        );
      }
    } finally {
      setIsInitialLoading(false);
    }
  }, [user, retryCount]);

  useEffect(() => {
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [retryTimeout]);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user, isConnected]);

  const handleFileOperation = async (operation: () => Promise<void>) => {
    try {
      setIsLoading(true);
      await operation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Operation failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (
    base64: string,
    filePath: string,
    contentType: string
  ) => {
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, decode(base64), { contentType });

    if (error) throw error;

    if (isExpanded.value) {
      isExpanded.value = false;
    }

    const newFile: FileObject = {
      created_at: new Date().toISOString(),
      id: data?.id || Date.now().toString(),
      last_accessed_at: new Date().toISOString(),
      metadata: {
        cacheControl: "max-age=3600",
        contentLength: base64.length,
        eTag: `"${Math.random().toString(36).substring(2)}"`,
        httpStatusCode: 200,
        lastModified: new Date().toISOString(),
        mimetype: contentType,
        size: base64.length,
      },
      name: filePath.split("/").pop() || "unnamed",
      updated_at: new Date().toISOString(),
      bucket_id: "images",
      owner: user!.id,
      buckets: {
        id: "images",
        name: "images",
        owner: user!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        public: false,
      },
    };

    setFiles((prevFiles) => [...prevFiles, newFile]);
    await cacheFiles([...files, newFile]); // Update cache with new file
  };

  // Action handlers
  const handleImagePicker = async (
    pickerFunction: typeof ImagePicker.launchImageLibraryAsync,
    type: ImagePicker.MediaTypeOptions
  ) => {
    const result = await pickerFunction({
      mediaTypes: type,
      allowsEditing: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: "base64",
    });
    const fileExtension = asset.uri.split(".").pop();
    const filePath = `${user!.id}/${Date.now()}.${fileExtension}`;
    await uploadFile(
      base64,
      filePath,
      asset.mimeType || "application/octet-stream"
    );
  };

  const handleDocumentPicker = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const { name, uri, mimeType } = result.assets[0];
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    const filePath = `${user!.id}/${Date.now()}_${name}`;
    await uploadFile(base64, filePath, mimeType || "application/octet-stream");
  };

  const handleRemoveFile = async (item: FileObject) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete File", "Are you sure you want to delete this file?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          handleFileOperation(async () => {
            const { error } = await supabase.storage
              .from("images")
              .remove([`${user!.id}/${item.name}`]);
            if (error) throw error;
            const updatedFiles = files.filter((file) => file.id !== item.id);
            setFiles(updatedFiles);
            await cacheFiles(updatedFiles); // Update cache after deletion
          }),
      },
    ]);
  };

  // UI Elements
  const actionButtons: ActionButton[] = [
    {
      iconName: "camera",
      label: "Camera",
      onPress: () =>
        handleFileOperation(() =>
          handleImagePicker(
            ImagePicker.launchCameraAsync,
            ImagePicker.MediaTypeOptions.Images
          )
        ),
    },
    {
      iconName: "image",
      label: "Image",
      onPress: () =>
        handleFileOperation(() =>
          handleImagePicker(
            ImagePicker.launchImageLibraryAsync,
            ImagePicker.MediaTypeOptions.All
          )
        ),
    },
    {
      iconName: "document",
      label: "Document",
      onPress: () => handleFileOperation(handleDocumentPicker),
    },
  ];

  const renderEmptyState = () => (
    <EmptyState
      onUploadPress={() => {
        if (!isExpanded.value) {
          isExpanded.value = true;
        }
      }}
    />
  );

  const plusIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(isExpanded.value ? "45deg" : "0deg") }],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isExpanded.value ? 0.5 : 0),
    pointerEvents: isExpanded.value ? "auto" : "none",
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isOverlayVisible.value ? 1 : 0, { duration: 300 }),
    transform: [
      {
        scale: isOverlayVisible.value
          ? withSpring(1, { damping: 10, stiffness: 100 })
          : withTiming(0.9, { duration: 300 }),
      },
    ],
    pointerEvents: isOverlayVisible.value ? "auto" : "none",
  }));

  const showImage = (fileUrl: string) => {
    setSelectedImage(fileUrl);
    isOverlayVisible.value = true;
  };

  return (
    <View className="bg-gray-900 flex-1">
      {!isConnected && (
        <View className="w-full p-3 flex-row items-center justify-center bg-red-500/10">
          <Text className="text-red-500 mr-2">
            {retryCount > 0
              ? `Retrying... (Attempt ${retryCount}/${MAX_RETRIES})`
              : "No Internet Connection"}
          </Text>
          <ActivityIndicator size="small" color="#ef4444" />
        </View>
      )}
      {/* Main Content */}
      {isInitialLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3ECF8E" />
        </View>
      ) : files.length === 0 ? (
        renderEmptyState()
      ) : (
        <MasonryFlashList
          contentContainerClassName="pb-24"
          contentContainerStyle={{ paddingHorizontal: 1 }}
          data={files}
          numColumns={2}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeIn.delay(index * 100)}
              exiting={FadeOut.duration(250)}
            >
              <FileItem
                key={item.id}
                item={item}
                userId={user!.id}
                onRemoveItem={() => handleRemoveFile(item)}
                onImagePress={(fileUrl) => showImage(fileUrl)}
              />
            </Animated.View>
          )}
          keyExtractor={(item) => item.id}
          estimatedItemSize={200}
          refreshing={isLoading}
          onRefresh={loadFiles}
          showsVerticalScrollIndicator={false}
        />
      )}

      {!isInitialLoading && (
        <>
          <AnimatedPressable
            onPress={() => {
              isExpanded.value = !isExpanded.value;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onLongPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
            }
            android_ripple={{ color: AndroidRipple, borderless: false }}
            className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-supabaseGreen justify-center items-center shadow-lg z-10"
          >
            <Animated.Text
              style={plusIconStyle}
              className="text-3xl text-white"
            >
              +
            </Animated.Text>
          </AnimatedPressable>

          <Animated.View
            style={[scrimStyle]}
            className="absolute inset-0 bg-black w-full h-full"
            onTouchStart={() => {
              if (isExpanded.value) {
                isExpanded.value = false;
              }
            }}
          />

          <Animated.View>
            {actionButtons.map((button, index) => (
              <FloatingActionButton
                key={button.iconName}
                isExpanded={isExpanded}
                index={index + 1}
                {...button}
              />
            ))}
          </Animated.View>

          <Animated.View
            style={overlayStyle}
            className="absolute top-0 left-0 right-0 bottom-0 bg-[rgba(0,0,0,0.8)] flex justify-center items-center z-10"
          >
            <AnimatedPressable
              onPress={() => {
                isOverlayVisible.value = false;
                setSelectedImage(null);
              }}
              android_ripple={{ color: AndroidRipple, borderless: false }}
              className="absolute top-5 right-5 p-2"
            >
              <Ionicons name="close" size={30} color="white" />
            </AnimatedPressable>
            {selectedImage && (
              <Animated.Image
                source={{ uri: selectedImage }}
                className="w-4/5 h-3/4"
                resizeMode="contain"
              />
            )}
          </Animated.View>
        </>
      )}
    </View>
  );
};

export default Home;
