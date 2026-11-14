import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { AVATAR_POR_DEFECTO } from '@/database/SupabaseRepository';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authRepo } from '.';

export default function RegistroScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [carnet, setCarnet] = useState('');
  const [carrera, setCarrera] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const registrar = async () => {
    try {
      setError('');
      if (!nombre.trim() || !carnet.trim() || !carrera.trim() || !email.trim() || !password.trim()) {
        setError('Nombre, carnet, carrera, correo y contrasena son obligatorios');
        return;
      }

      setCargando(true);
      // Si no ingresa fotoUrl se asigna automaticamente el avatar generico sin foto
      const fotoFinal = fotoUrl.trim().startsWith('http') ? fotoUrl.trim() : AVATAR_POR_DEFECTO;

      const resultado = await authRepo.registrar(
        email.trim(),
        password,
        nombre.trim(),
        carnet.trim(),
        carrera.trim(),
        fotoFinal,
        'Estudiante',
      );

      if (resultado.requiereConfirmacion) {
        if (Platform.OS === 'web') {
          window.alert('Estudiante registrado. Inicia sesion con tu cuenta.');
        } else {
          Alert.alert('Registro', 'Estudiante registrado. Inicia sesion con tu cuenta.');
        }
        router.replace('/login');
        return;
      }

      router.replace('/');
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
              Auto-Registro de Estudiante
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
              Completa los datos de tu perfil universitario
            </ThemedText>

            <View style={styles.fotoContainer}>
              <Image
                source={{
                  uri: fotoUrl.trim().startsWith('http') ? fotoUrl.trim() : AVATAR_POR_DEFECTO,
                }}
                style={styles.fotoPreview}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {fotoUrl.trim().startsWith('http')
                  ? 'Foto personalizada'
                  : 'Sin foto de perfil (por defecto)'}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Nombre completo</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Erick Efrain Solorzano Jimenez"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Carnet universitario</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={carnet}
                onChangeText={setCarnet}
                placeholder="Ej. 0907-25-79532"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Carrera</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={carrera}
                onChangeText={setCarrera}
                placeholder="Ej. Ingenieria en Sistemas"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">URL Foto del estudiante (Opcional)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={fotoUrl}
                onChangeText={setFotoUrl}
                placeholder="Dejar vacio para usar imagen sin foto de perfil"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="correo@miumg.edu.gt"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Password</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimo 6 caracteres"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
              />
            </View>

            {error !== '' && <Text style={styles.errorText}>{error}</Text>}

            <Pressable disabled={cargando} onPress={registrar}>
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="small" style={styles.saveButtonText}>
                  {cargando ? 'Registrando...' : 'Registrarse como Estudiante'}
                </ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable onPress={() => router.replace('/login')}>
              <View style={styles.linkButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  Ya tienes cuenta? Volver a iniciar sesion
                </ThemedText>
              </View>
            </Pressable>
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
  fotoContainer: {
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  fotoPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#CBD5E1',
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
});
