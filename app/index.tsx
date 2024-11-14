import { useRouter } from 'expo-router';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
export default function Index() {
  const router = useRouter();

  const handleRouting = () => router.push('/main');

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 items-center justify-center">
        <TouchableOpacity onPress={handleRouting}>
          <Text className="text-4xl">Go to Home Screen</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
