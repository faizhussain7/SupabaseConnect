import {
  Alert,
  ScrollView,
  View,
  TextInput,
  Text,
  Pressable,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import React from "react";
import Spinner from "react-native-loading-spinner-overlay";
import { supabase } from "../config/initSupabase";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  useAnimatedStyle,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedLogo = () => {
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isFlipping = useSharedValue(false);
  const pressCount = useSharedValue(0);

  const handlePress = useCallback(() => {
    if (isFlipping.value) return; // Prevent multiple triggers during ongoing animation
    isFlipping.value = true;
    pressCount.value += 1;

    // Randomize direction (clockwise or counterclockwise)
    const direction = Math.random() > 0.5 ? 1 : -1;

    // Rotate between 1 and 2 full rotations
    const rotations = Math.random() > 0.5 ? 1 : 2;
    const totalRotation = direction * 360 * rotations;

    // Subtle scale feedback
    scale.value = withSequence(
      withSpring(0.95, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );

    // Adjust duration based on press count
    const duration = Math.max(500, 1500 - pressCount.value * 100);

    // Perform the rotation
    rotateY.value = withTiming(
      rotateY.value + totalRotation,
      {
        duration, // Adjusted duration for smoother interaction
        easing: Easing.bezier(0.4, 0, 0.2, 1), // Smooth easing curve
      },
      () => {
        isFlipping.value = false;
      }
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      handlePress();
    }, 3000); // Trigger every 3 seconds for a balanced rhythm

    return () => clearInterval(interval); // Clean up on unmount
  }, [handlePress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 }, // Keep perspective for 3D effect
      { scale: scale.value }, // Subtle scale effect
      { rotateY: `${rotateY.value}deg` }, // Rotate along the Y-axis
    ],
  }));

  return (
    <Pressable
      onPress={() => {
        handlePress();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <Animated.Image
        className="w-16 h-16 mt-5"
        source={{
          uri: "https://cdn.prod.website-files.com/655b60964be1a1b36c746790/655b60964be1a1b36c746d41_646dfce3b9c4849f6e401bff_supabase-logo-icon_1.png",
        }}
        style={animatedStyle}
      />
    </Pressable>
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  // Sign in with email and password
  const onSignInPress = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  };

  return (
    <ScrollView
      contentContainerClassName="grow"
      keyboardShouldPersistTaps="handled"
    >
      <View
        className="justify-center items-center bg-gray-900 grow"
        style={{ paddingTop: top }}
      >
        <Spinner visible={loading} />

        <Text className="text-3xl font-bold text-center mb-16 text-white">
          Supabase Connect
        </Text>

        <TextInput
          autoCapitalize="none"
          placeholder="Email Address"
          placeholderTextColor="#a9a9a9"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email Address"
          accessibilityHint="Enter your email address"
          accessibilityRole="text"
          inputMode="email"
          className="my-2 h-14 border border-green-700 rounded-lg p-4 text-white bg-gray-800 w-4/5"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#a9a9a9"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="Password"
          accessibilityHint="Enter your password"
          accessibilityRole="text"
          className="my-2 h-14 border border-green-700 rounded-lg p-4 text-white bg-gray-800 w-4/5"
        />

        <Pressable
          onPress={onSignInPress}
          android_ripple={{ color: "#ffffff50" }}
          accessibilityLabel="Sign In"
          accessibilityHint="Sign in to your account"
          accessibilityRole="button"
          className="my-4 items-center bg-supabaseGreen py-4 rounded-lg shadow-lg w-4/5"
        >
          <Text className="text-white text-lg font-semibold">Sign In</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/register")}
          android_ripple={{ color: "#ffffff50" }}
          accessibilityLabel="Create Account"
          accessibilityHint="Create a new account"
          accessibilityRole="button"
          className="my-2 items-center bg-gray-600 py-4 rounded-lg shadow-lg w-4/5"
        >
          <Text className="text-white text-lg font-semibold">
            Create Account
          </Text>
        </Pressable>
      </View>
      <View className="items-center bg-gray-900">
        <AnimatedLogo />
        <Text className="text-white m-5 text-sm">
          Powered by{" "}
          <Text
            style={{ color: "#50C878" }}
            onPress={() => WebBrowser.openBrowserAsync("https://supabase.io")}
          >
            Supabase
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

export default Login;
