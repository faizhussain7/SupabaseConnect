import { View, Text, Pressable, Alert } from "react-native";
import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/config/initSupabase";
import * as Linking from "expo-linking";

const Verification = () => {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      // Parse tokens from the URL
      const [params] = url.includes("?") ? url.split("?") : [url, ""];
      const searchParams = new URLSearchParams(params);
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");

      console.log("Tokens found:", { accessToken, refreshToken });

      if (accessToken && refreshToken) {
        try {
          // Set session using tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Session error:", error);
            Alert.alert(
              "Verification Error",
              "Failed to verify your email. Please try again."
            );
          } else {
            console.log("Session set successfully");
            Alert.alert(
              "Email Verified",
              "Your email has been verified successfully!",
              [
                {
                  text: "OK",
                  onPress: () => router.replace("/(auth)"), // Navigate to the authentication screen
                },
              ]
            );
          }
        } catch (error) {
          console.error("Verification error:", error);
          Alert.alert("Error", "An error occurred during verification.");
        }
      } else {
        Alert.alert(
          "Invalid Link",
          "The link is invalid or missing required parameters."
        );
      }
    };

    const setupDeepLinks = async () => {
      // Handle initial deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }

      // Listen for deep links while the app is running
      const subscription = Linking.addEventListener("url", handleDeepLink);
      return () => {
        subscription.remove();
      };
    };

    setupDeepLinks();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-gray-900 p-4">
      <Text className="text-2xl font-bold text-white mb-8">
        Verifying Your Email
      </Text>
      <Text className="text-white text-center mb-6">
        Please wait while we verify your email. If nothing happens, check your
        inbox for a verification link.
      </Text>
      <Pressable
        onPress={() => router.push("/")}
        className="bg-gray-800 py-4 px-8 rounded-lg"
      >
        <Text className="text-white font-semibold">Back to Sign In</Text>
      </Pressable>
    </View>
  );
};

export default Verification;
