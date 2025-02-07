import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  withSequence,
  withDelay,
  withRepeat,
  interpolateColor,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EmptyStateProps {
  onUploadPress: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onUploadPress }) => {
  const containerOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const floatingAnim = useSharedValue(0);
  const colorAnim = useSharedValue(0);

  // Simple floating animation
  useEffect(() => {
    floatingAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.ease }),
        withTiming(0, { duration: 2000, easing: Easing.ease })
      ),
      -1,
      true
    );
  }, []);

  // Color animation
  useEffect(() => {
    colorAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.ease }),
        withTiming(0, { duration: 1500, easing: Easing.ease })
      ),
      -1,
      true
    );
  }, []);

  // Initial entrance animations
  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 500 });
    textOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const colorStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      colorAnim.value,
      [0, 1],
      ["#9CA3AF", "#3ECF8E"]
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  return (
    <Animated.View
      className="flex-1 items-center justify-center px-8"
      style={containerStyle}
    >
      {/* Simple Outline Folder Icon */}
      <Animated.View className="mb-4 relative">
        <Animated.View
          className="w-20 h-16 border-2 border-gray-400 rounded-lg relative"
          style={colorStyle}
        >
          <Animated.View
            className="absolute -top-2 w-8 h-2 border-2 border-b-0 border-gray-400 rounded-t-md"
            style={colorStyle}
          />
        </Animated.View>
      </Animated.View>

      <Animated.Text
        className="text-gray-400 text-center text-lg mb-2"
        style={textStyle}
      >
        No files found
      </Animated.Text>

      <Animated.Text
        className="text-gray-500 text-center text-base mb-6"
        style={textStyle}
      >
        Get started by uploading your first file
      </Animated.Text>

      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onUploadPress}
        className="bg-supabaseGreen rounded-lg px-6 py-3 flex-row items-center"
        style={buttonStyle}
      >
        <Text className="text-white font-medium">Upload File</Text>
      </AnimatedPressable>
    </Animated.View>
  );
};

export default EmptyState;
