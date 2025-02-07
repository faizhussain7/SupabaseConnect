import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";
import "react-native-get-random-values";

class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    // Generate a new 256-bit (32 bytes) encryption key
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));

    // Create a counter for CTR mode
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );

    // Encrypt the value
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    // Store the encryption key in SecureStore
    await SecureStore.setItemAsync(
      key,
      aesjs.utils.hex.fromBytes(encryptionKey)
    );

    // Return the encrypted value as hex string
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string) {
    // Retrieve the encryption key from SecureStore
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return null;
    }

    // Create cipher with the stored key
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );

    // Decrypt the value
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

    // Return the decrypted value as string
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string) {
    try {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) {
        return null;
      }
      return await this._decrypt(key, encrypted);
    } catch (error) {
      console.error("Error retrieving item:", error);
      return null;
    }
  }

  async setItem(key: string, value: string) {
    try {
      const encrypted = await this._encrypt(key, value);
      await AsyncStorage.setItem(key, encrypted);
    } catch (error) {
      console.error("Error setting item:", error);
    }
  }

  async removeItem(key: string) {
    try {
      await AsyncStorage.removeItem(key);
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("Error removing item:", error);
    }
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase with the encrypted storage
export const supabase = createClient(url!, key!, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
