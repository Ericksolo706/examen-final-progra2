import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Alert, Pressable, StyleSheet, Text, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { authRepo } from '.';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const cerrarSesion = async () => {
    try {
      await authRepo.cerrarSesion();
      router.replace('/login');
    } catch (error) {
      Alert.alert(
        'No se pudo cerrar sesion',
        error instanceof Error ? error.message : 'Intenta de nuevo.',
      );
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <Stack
        screenOptions={{
          headerRight: () => (
            <Pressable
              style={styles.logoutBtn}
              onPress={() => cerrarSesion()}
              accessibilityRole="button">
              <Text style={styles.logoutBtnText}>Cerrar sesion</Text>
            </Pressable>
          ),
        }}>
        <Stack.Screen name="index" options={{ title: 'Laboratorio UMG - Estudiante' }} />
        <Stack.Screen name="admin" options={{ title: 'Panel de Control - Administrador' }} />
        <Stack.Screen name="login" options={{ title: 'Iniciar Sesion', headerRight: () => null }} />
        <Stack.Screen name="registro" options={{ title: 'Registro de Estudiante', headerRight: () => null }} />
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 8,
  },
  logoutBtnText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
});
