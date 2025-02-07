import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/provider/AuthProvider";
import "../global.css";
import { StatusBar, View } from "react-native";
import Spinner from "react-native-loading-spinner-overlay";

// Makes sure the user is authenticated before accessing protected pages
const InitialLayout = () => {
  const { session, initialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (session && !inAuthGroup) {
      router.replace("/(auth)/home");
    } else if (!session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Spinner visible animation="slide" size="large" />
      </View>
    );
  }

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
        name="index" // Main or login screen
        options={{ title: "Login", headerShown: false }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Create an Account",
          presentation: "modal",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="verification"
        options={{
          title: "Verify Email",
          presentation: "modal",
          headerShown: true,
        }}
      />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
};

const RootLayout = () => {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
};

export default RootLayout;
