import { useAuth } from "@/provider/AuthProvider";
import { MaterialIcons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

const AnimatedLogo = ({
  size = 24, // Allow dynamic size
  flipDuration = 1000, // Adjustable flip duration
  interval = 2000, // Adjustable auto-flip interval
  damping = 10, // Adjustable spring damping
}) => {
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isFlipping = useSharedValue(false);

  const handlePress = useCallback(() => {
    if (isFlipping.value) return; // Prevent concurrent animations
    isFlipping.value = true;

    // Scale animation for feedback
    scale.value = withSequence(
      withSpring(0.9, { damping }),
      withSpring(1, { damping })
    );

    // Vertical standing 360 flip
    rotateY.value = withTiming(
      rotateY.value + 360,
      {
        duration: flipDuration,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      },
      () => {
        rotateY.value %= 360; // Reset rotation to prevent overflow
        isFlipping.value = false;
      }
    );
  }, [flipDuration, damping]);

  useEffect(() => {
    const intervalId = setInterval(() => handlePress(), interval);

    return () => clearInterval(intervalId); // Clean up interval on unmount
  }, [handlePress, interval]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 }, // Add perspective for 3D effect
      { scale: scale.value },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  return (
    <Pressable onPress={handlePress}>
      <Animated.Image
        source={{
          uri: "https://cdn.prod.website-files.com/655b60964be1a1b36c746790/655b60964be1a1b36c746d41_646dfce3b9c4849f6e401bff_supabase-logo-icon_1.png",
        }}
        style={[
          {
            width: size,
            height: size,
          },
          animatedStyle,
        ]}
        className="me-5"
      />
    </Pressable>
  );
};

const StackLayout = () => {
  const { signOut } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#111827",
        },
        headerTintColor: "#ffffff",
      }}
    >
      <Stack.Screen
        name="home"
        options={{
          headerTitle: "Supabase Connect",
          headerTitleStyle: { fontWeight: "bold" },
          headerRight: () => (
            <Pressable
              onPress={signOut}
              android_ripple={{ color: "#ffffff50", borderless: true }}
            >
              <MaterialIcons
                name="logout"
                size={24}
                color="white"
                className="py-5"
              />
            </Pressable>
          ),
          headerLeft: () => <AnimatedLogo />,
        }}
      />
    </Stack>
  );
};

export default StackLayout;
