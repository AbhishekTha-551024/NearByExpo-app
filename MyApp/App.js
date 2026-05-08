import * as React from 'react';
import * as TaskManager from 'expo-task-manager';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  React.useEffect(() => {
    // Forcefully stop any leftover background tasks
    const cleanup = async () => {
      try {
        const tasks = await TaskManager.getRegisteredTasksAsync();
        if (tasks.length > 0) {
          await TaskManager.unregisterAllTasksAsync();
          console.log('Successfully cleared all background tasks');
        }
      } catch (e) {
        console.log('Task cleanup error:', e);
      }
    };
    cleanup();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
