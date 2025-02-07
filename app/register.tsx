// Previous imports remain the same...
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Stack, router } from "expo-router";
import Spinner from "react-native-loading-spinner-overlay";
import { supabase } from "@/config/initSupabase";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SignUp = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const buttonScale = useSharedValue(1);
  const headerTranslateY = useSharedValue(-50);
  const headerOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);

  let emailInputRef: TextInput | null = null;
  let passwordInputRef: TextInput | null = null;

  useEffect(() => {
    // Animate header and form on mount
    headerOpacity.value = withSpring(1, { damping: 15 });
    headerTranslateY.value = withSpring(0, { damping: 15 });
    formOpacity.value = withTiming(1, { duration: 1000 });
  }, []);

  // Validation functions remain the same...
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  };

  const validateFullName = (name: string) => {
    return name.trim().length >= 2 && name.includes(" ");
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const onSignUpPress = async () => {
    if (!validateFields()) {
      buttonScale.value = withSequence(
        withSpring(1.1),
        withSpring(0.9),
        withSpring(1)
      );
      Alert.alert("Validation Error", "Please correct the errors in the form.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      if (data?.user) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (error) {
      let message = "An error occurred during sign-up.";
      if (error instanceof Error) {
        if (error.message.includes("User already registered")) {
          message =
            "This email is already registered. Please try signing in instead.";
        }
      }
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const validateFields = () => {
    const newErrors = {
      fullName: "",
      email: "",
      password: "",
    };

    let isValid = true;

    if (!validateFullName(fullName)) {
      newErrors.fullName = "Please enter your full name (first and last name)";
      isValid = false;
    }

    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!validatePassword(password)) {
      newErrors.password =
        "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (field: string, value: string) => {
    switch (field) {
      case "fullName":
        setFullName(value);
        if (value && !validateFullName(value)) {
          setErrors((prev) => ({
            ...prev,
            fullName: "Please enter your full name (first and last name)",
          }));
        } else {
          setErrors((prev) => ({ ...prev, fullName: "" }));
        }
        break;
      case "email":
        setEmail(value);
        if (value && !validateEmail(value)) {
          setErrors((prev) => ({
            ...prev,
            email: "Please enter a valid email address",
          }));
        } else {
          setErrors((prev) => ({ ...prev, email: "" }));
        }
        break;
      case "password":
        setPassword(value);
        if (value && !validatePassword(value)) {
          setErrors((prev) => ({
            ...prev,
            password: "Password must meet all requirements",
          }));
        } else {
          setErrors((prev) => ({ ...prev, password: "" }));
        }
        break;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerClassName="grow"
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center items-center bg-gray-900 px-4 py-8">
          <Spinner visible={loading} />

          <Animated.View style={headerAnimatedStyle}>
            <Text className="text-4xl font-bold text-center mb-16 text-supabaseGreen">
              Sign Up
            </Text>
          </Animated.View>

          <Animated.View
            style={formAnimatedStyle}
            className="w-full items-center"
          >
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              className="w-4/5"
            >
              <View className="relative">
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="#a9a9a9"
                  value={fullName}
                  onChangeText={(value) => handleInputChange("fullName", value)}
                  className={`my-2 h-14 border rounded-lg p-4 pl-12 text-white bg-gray-800 w-full ${
                    errors.fullName ? "border-red-500" : "border-green-700"
                  }`}
                  returnKeyType="next"
                  onSubmitEditing={() => emailInputRef?.focus()}
                  blurOnSubmit={false}
                />
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color="#a9a9a9"
                  style={{ position: "absolute", left: 12, top: 18 }}
                />
              </View>
              {errors.fullName ? (
                <Animated.Text
                  entering={FadeIn}
                  className="text-red-500 text-sm px-1"
                >
                  {errors.fullName}
                </Animated.Text>
              ) : null}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(400).springify()}
              className="w-4/5"
            >
              <View className="relative">
                <TextInput
                  ref={(input) => {
                    emailInputRef = input;
                  }}
                  autoCapitalize="none"
                  placeholder="Email Address"
                  placeholderTextColor="#a9a9a9"
                  value={email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  inputMode="email"
                  className={`my-2 h-14 border rounded-lg p-4 pl-12 text-white bg-gray-800 w-full ${
                    errors.email ? "border-red-500" : "border-green-700"
                  }`}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef?.focus()}
                  blurOnSubmit={false}
                />
                <MaterialCommunityIcons
                  name="email"
                  size={24}
                  color="#a9a9a9"
                  style={{ position: "absolute", left: 12, top: 18 }}
                />
              </View>
              {errors.email ? (
                <Animated.Text
                  entering={FadeIn}
                  className="text-red-500 text-sm px-1"
                >
                  {errors.email}
                </Animated.Text>
              ) : null}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(600).springify()}
              className="w-4/5"
            >
              <View className="relative">
                <TextInput
                  ref={(input) => {
                    passwordInputRef = input;
                  }}
                  placeholder="Password"
                  placeholderTextColor="#a9a9a9"
                  value={password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  secureTextEntry
                  className={`my-2 h-14 border rounded-lg p-4 pl-12 text-white bg-gray-800 w-full ${
                    errors.password ? "border-red-500" : "border-green-700"
                  }`}
                  returnKeyType="done"
                  onSubmitEditing={onSignUpPress}
                />
                <MaterialCommunityIcons
                  name="lock"
                  size={24}
                  color="#a9a9a9"
                  style={{ position: "absolute", left: 12, top: 18 }}
                />
              </View>
              {errors.password ? (
                <Animated.Text
                  entering={FadeIn}
                  className="text-red-500 text-sm px-1"
                >
                  {errors.password}
                </Animated.Text>
              ) : null}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(800).springify()}
              className="w-4/5 mb-4"
            >
              <Text className="text-gray-400 text-sm mt-2">
                Password must contain:
              </Text>
              <Text className="text-gray-400 text-sm">
                • At least 8 characters
              </Text>
              <Text className="text-gray-400 text-sm">
                • One uppercase letter
              </Text>
              <Text className="text-gray-400 text-sm">
                • One lowercase letter
              </Text>
              <Text className="text-gray-400 text-sm">• One number</Text>
              <Text className="text-gray-400 text-sm">
                • One special character (!@#$%^&*)
              </Text>
            </Animated.View>

            <AnimatedPressable
              onPress={onSignUpPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={[buttonAnimatedStyle]}
              android_ripple={{ color: "#ffffff50" }}
              className="my-4 items-center bg-green-700 py-4 rounded-lg shadow-lg w-4/5"
            >
              <Text className="text-white text-lg font-semibold">Sign Up</Text>
            </AnimatedPressable>
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;
