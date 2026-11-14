import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authRepo } from '.';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [user, setUser] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const iniciarSesion = async () => {
    setError('');
    if (!user.email.trim() || !user.password.trim()) {
      setError('Ingresa tu correo y contrasena');
      return;
    }

    setCargando(true);
    try {
      const response = await authRepo.iniciarSesion(user.email.trim(), user.password);
      if (response.rol === 'Administrador') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const ingresarPerfilPrueba = async (rol: 'Estudiante' | 'Administrador') => {
    setError('');
    setCargando(true);
    try {
      const sesion = await authRepo.iniciarSesionPrueba(rol);
      if (sesion.rol === 'Administrador') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="subtitle" style={styles.centerText}>
              Gestion de Equipos de Laboratorio
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Inicia sesion con tu cuenta de Estudiante o Administrador
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="smallBold">Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={user.email}
                onChangeText={(text) => setUser((prev) => ({ ...prev, email: text }))}
                placeholder="correo@miumg.edu.gt"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Password</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={user.password}
                onChangeText={(text) => setUser((prev) => ({ ...prev, password: text }))}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
              />
            </View>

            {error !== '' && <Text style={styles.errorText}>{error}</Text>}

            <Pressable disabled={cargando} onPress={iniciarSesion}>
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="small" style={styles.saveButtonText}>
                  {cargando ? 'Iniciando sesion...' : 'Iniciar sesion'}
                </ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable onPress={() => router.push('/registro')}>
              <View style={styles.linkButton}>
                <ThemedText type="smallBold" style={{ color: '#2563EB' }}>
                  No tienes cuenta? Auto-registrate como Estudiante
                </ThemedText>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.centerText}>
              Usuarios de Prueba (Acceso Rapido para Demostracion)
            </ThemedText>

            <View style={styles.quickButtons}>
              <Pressable
                disabled={cargando}
                onPress={() => ingresarPerfilPrueba('Estudiante')}
                style={[styles.quickBtn, { backgroundColor: '#059669' }]}>
                <Text style={styles.quickBtnTitle}>Usuario de Prueba: Estudiante</Text>
                <Text style={styles.quickBtnSub}>
                  Erick Solorzano (esolorzano@miumg.edu.gt)
                </Text>
              </Pressable>

              <Pressable
                disabled={cargando}
                onPress={() => ingresarPerfilPrueba('Administrador')}
                style={[styles.quickBtn, { backgroundColor: '#4F46E5' }]}>
                <Text style={styles.quickBtnTitle}>Usuario de Prueba: Administrador</Text>
                <Text style={styles.quickBtnSub}>
                  Panel de Control (admin@umg.edu.gt)
                </Text>
              </Pressable>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  field: {
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: '700',
  },
  linkButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  quickButtons: {
    gap: Spacing.two,
  },
  quickBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBtnTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  quickBtnSub: {
    color: '#E2E8F0',
    fontSize: 12,
  },
});
