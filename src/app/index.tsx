import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { SupabaseLaboratorioRepository } from '@/database/SupabaseLaboratorioRepository';
import { AVATAR_POR_DEFECTO, SupabaseAuthRepository } from '@/database/SupabaseRepository';
import { supabase } from '@/database/supabase';
import { useTheme } from '@/hooks/use-theme';
import type { Equipo, EstadoPrestamo, Prestamo } from '@/models/Laboratorio';
import type { UsuarioSesion } from '@/models/UsuarioSesion';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// El UNICO lugar donde se eligen las implementaciones
export const authRepo = new SupabaseAuthRepository(supabase);
export const labRepo = new SupabaseLaboratorioRepository(supabase);

function mostrarMensaje(mensaje: string) {
  if (Platform.OS === 'web') {
    window.alert(mensaje);
  } else {
    Alert.alert('Aviso', mensaje);
  }
}

function colorEstado(estado: EstadoPrestamo): string {
  if (estado === 'Aprobado') return '#10B981';
  if (estado === 'Rechazado') return '#EF4444';
  if (estado === 'Devuelto') return '#3B82F6';
  return '#F59E0B';
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [misPrestamos, setMisPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del Modal para editar perfil del usuario
  const [modalPerfilVisible, setModalPerfilVisible] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editCarnet, setEditCarnet] = useState('');
  const [editCarrera, setEditCarrera] = useState('');
  const [editFotoUrl, setEditFotoUrl] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const sesion = await authRepo.obtenerSesion();
      if (!sesion) {
        router.replace('/login');
        return;
      }
      setUsuario(sesion);

      const [listaEquipos, prestamos] = await Promise.all([
        labRepo.obtenerEquipos(),
        labRepo.obtenerPrestamosUsuario(sesion.id),
      ]);
      setEquipos(listaEquipos);
      setMisPrestamos(prestamos);
    } catch (err) {
      mostrarMensaje(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModalPerfil = () => {
    if (!usuario) return;
    setEditNombre(usuario.nombre);
    setEditCarnet(usuario.carnet);
    setEditCarrera(usuario.carrera);
    setEditFotoUrl(usuario.fotoUrl === AVATAR_POR_DEFECTO ? '' : usuario.fotoUrl);
    setModalPerfilVisible(true);
  };

  const guardarCambiosPerfil = async () => {
    if (!usuario) return;
    if (!editNombre.trim() || !editCarnet.trim() || !editCarrera.trim()) {
      mostrarMensaje('El nombre, carnet y carrera son obligatorios.');
      return;
    }

    setGuardandoPerfil(true);
    try {
      const actualizado = await authRepo.actualizarPerfil(
        usuario,
        editNombre.trim(),
        editCarnet.trim(),
        editCarrera.trim(),
        editFotoUrl.trim(),
      );
      setUsuario(actualizado);
      setModalPerfilVisible(false);
      mostrarMensaje('Perfil actualizado correctamente.');
    } catch (err) {
      mostrarMensaje(err instanceof Error ? err.message : String(err));
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const solicitarEquipo = async (equipo: Equipo) => {
    if (!usuario) {
      router.replace('/login');
      return;
    }

    try {
      await labRepo.solicitarPrestamo(usuario.id, equipo.id);
      mostrarMensaje(
        `Solicitud registrada para "${equipo.nombre}".\nEstado inicial: Pendiente (Devolucion en 3 dias).`,
      );
      cargarDatos();
    } catch (err) {
      mostrarMensaje(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* 1. Tarjeta de Perfil del Estudiante */}
          {usuario && (
            <ThemedView type="backgroundElement" style={styles.perfilCard}>
              <Image source={{ uri: usuario.fotoUrl }} style={styles.foto} />
              <View style={styles.perfilInfo}>
                <View style={styles.rolBadge}>
                  <Text style={styles.rolBadgeText}>Rol: {usuario.rol}</Text>
                </View>
                <ThemedText type="subtitle">{usuario.nombre}</ThemedText>
                <ThemedText type="smallBold">Carnet: {usuario.carnet}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Carrera: {usuario.carrera}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Correo: {usuario.correo}
                </ThemedText>
              </View>

              <View style={styles.perfilBotones}>
                <Pressable style={styles.editarPerfilBtn} onPress={abrirModalPerfil}>
                  <Text style={styles.adminButtonText}>Editar Perfil / Foto</Text>
                </Pressable>

                {usuario.rol === 'Administrador' && (
                  <Pressable style={styles.adminButton} onPress={() => router.push('/admin')}>
                    <Text style={styles.adminButtonText}>Ir a Panel de Control</Text>
                  </Pressable>
                )}
              </View>
            </ThemedView>
          )}

          {/* 2. Catalogo de Equipos Disponibles */}
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Catalogo de Equipos de Laboratorio</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Selecciona un equipo disponible para generar un prestamo por 3 dias
            </ThemedText>
          </View>

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Cargando catalogo...
            </ThemedText>
          ) : (
            equipos.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.card}>
                <Image source={{ uri: item.imagen_url }} style={styles.equipoImagen} />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <ThemedText type="smallBold" style={{ flex: 1 }}>
                      {item.nombre}
                    </ThemedText>
                    <View
                      style={[
                        styles.dispBadge,
                        { backgroundColor: item.disponible ? '#DCFCE7' : '#FEE2E2' },
                      ]}>
                      <Text
                        style={{
                          color: item.disponible ? '#166534' : '#991B1B',
                          fontWeight: '700',
                          fontSize: 12,
                        }}>
                        {item.disponible ? 'Disponible' : 'No Disponible'}
                      </Text>
                    </View>
                  </View>

                  <ThemedText type="small" themeColor="textSecondary">
                    {item.descripcion}
                  </ThemedText>

                  <Pressable
                    disabled={!item.disponible}
                    onPress={() => solicitarEquipo(item)}
                    style={[
                      styles.solicitarBtn,
                      !item.disponible && styles.solicitarBtnDisabled,
                    ]}>
                    <Text style={styles.solicitarBtnText}>
                      {item.disponible ? 'Solicitar Prestamo' : 'En prestamo activo'}
                    </Text>
                  </Pressable>
                </View>
              </ThemedView>
            ))
          )}

          {/* 3. Mis Prestamos Vinculados al Usuario */}
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">
              Mis Solicitudes y Prestamos ({misPrestamos.length})
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Estados: Pendiente, Aprobado, Rechazado, Devuelto
            </ThemedText>
          </View>

          {misPrestamos.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                Aun no tienes solicitudes de prestamo registradas.
              </ThemedText>
            </ThemedView>
          ) : (
            misPrestamos.map((p) => (
              <ThemedView key={p.id} type="backgroundElement" style={styles.card}>
                <View style={styles.cardInfo}>
                  <ThemedText type="smallBold">
                    {p.equipos?.nombre ?? `Equipo #${p.equipo_id}`}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Fecha prestamo: {p.fecha_prestamo} | Fecha devolucion: {p.fecha_devolucion}
                  </ThemedText>
                </View>
                <View style={[styles.estadoBadge, { backgroundColor: colorEstado(p.estado) }]}>
                  <Text style={styles.estadoBadgeText}>{p.estado}</Text>
                </View>
              </ThemedView>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal para Editar Perfil y Foto del Estudiante */}
      <Modal
        visible={modalPerfilVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalPerfilVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="subtitle">Editar Perfil</ThemedText>

            <View style={styles.previewContainer}>
              <Image
                source={{
                  uri: editFotoUrl.trim().startsWith('http')
                    ? editFotoUrl.trim()
                    : AVATAR_POR_DEFECTO,
                }}
                style={styles.foto}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {editFotoUrl.trim().startsWith('http')
                  ? 'Foto personalizada'
                  : 'Sin foto de perfil (por defecto)'}
              </ThemedText>
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Nombre completo</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={editNombre}
                onChangeText={setEditNombre}
                placeholder="Nombre completo"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Carnet universitario</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={editCarnet}
                onChangeText={setEditCarnet}
                placeholder="Carnet"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">Carrera</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={editCarrera}
                onChangeText={setEditCarrera}
                placeholder="Carrera"
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">URL Foto de perfil (Opcional)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={editFotoUrl}
                onChangeText={setEditFotoUrl}
                placeholder="Pega un link http... o deja vacio para quitar foto"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <Pressable disabled={guardandoPerfil} onPress={guardarCambiosPerfil}>
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="small" style={styles.saveButtonText}>
                  {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                </ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable onPress={() => setModalPerfilVisible(false)}>
              <View style={styles.cancelButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </View>
            </Pressable>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  listContent: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  perfilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    flexWrap: 'wrap',
  },
  foto: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#CBD5E1',
  },
  perfilInfo: {
    flex: 1,
    minWidth: 200,
    gap: 2,
  },
  rolBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 4,
  },
  rolBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  perfilBotones: {
    gap: 8,
  },
  editarPerfilBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    marginTop: Spacing.two,
    gap: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    flexWrap: 'wrap',
  },
  equipoImagen: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  cardInfo: {
    flex: 1,
    minWidth: 200,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dispBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  solicitarBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  solicitarBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  solicitarBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  estadoBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  estadoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  previewContainer: {
    alignItems: 'center',
    gap: 4,
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
  cancelButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
