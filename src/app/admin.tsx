import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EstadoPrestamo, Prestamo, ReporteEquipo } from '@/models/Laboratorio';
import type { UsuarioSesion } from '@/models/UsuarioSesion';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
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
import { authRepo, labRepo } from '.';

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

export default function AdminScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [adminSesion, setAdminSesion] = useState<UsuarioSesion | null>(null);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [reporte, setReporte] = useState<ReporteEquipo[]>([]);
  const [filtro, setFiltro] = useState<'Todos' | 'Pendiente' | 'Aprobado' | 'Devuelto'>('Todos');
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const sesion = await authRepo.obtenerSesion();
      // Validacion de seguridad por Rol: solo usuarios con rol Administrador pueden usar el panel
      if (!sesion || sesion.rol !== 'Administrador') {
        setAdminSesion(null);
        setLoading(false);
        return;
      }
      setAdminSesion(sesion);

      const [listaPrestamos, listaReporte] = await Promise.all([
        labRepo.obtenerPrestamos(),
        labRepo.obtenerReporteMasSolicitados(),
      ]);
      setPrestamos(listaPrestamos);
      setReporte(listaReporte);
    } catch (err) {
      mostrarMensaje(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const actualizarEstado = async (p: Prestamo, nuevoEstado: EstadoPrestamo) => {
    try {
      await labRepo.cambiarEstadoPrestamo(p.id, p.equipo_id, p.estado, nuevoEstado);
      cargarDatos();
    } catch (err) {
      mostrarMensaje(err instanceof Error ? err.message : String(err));
    }
  };

  const guardarEquipo = async () => {
    if (!nombre.trim() || !descripcion.trim()) {
      mostrarMensaje('El nombre y la descripcion son obligatorios');
      return;
    }

    try {
      await labRepo.crearEquipo({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        imagen_url:
          imagenUrl.trim() ||
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
        disponible: true,
      });
      setModalVisible(false);
      setNombre('');
      setDescripcion('');
      setImagenUrl('');
      cargarDatos();
    } catch (err) {
      mostrarMensaje(err instanceof Error ? err.message : String(err));
    }
  };

  // Si no tiene rol Administrador, bloqueamos el panel y pedimos iniciar sesion como Admin
  if (!loading && !adminSesion) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView type="backgroundElement" style={styles.restrictedCard}>
            <ThemedText type="subtitle">Acceso Restringido</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
              Esta seccion es exclusiva para usuarios con rol Administrador.
            </ThemedText>
            <Pressable
              style={[styles.editButton, { backgroundColor: '#4F46E5' }]}
              onPress={() => router.replace('/login')}>
              <Text style={styles.deleteButtonText}>Ir a Iniciar Sesion como Administrador</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={() => router.replace('/')}>
              <ThemedText type="small" themeColor="textSecondary">
                Volver a Vista de Estudiante
              </ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const prestamosFiltrados = prestamos.filter((item) =>
    filtro === 'Todos' ? true : item.estado === filtro,
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.listContent}>
          <ThemedView type="backgroundElement" style={styles.adminHeaderCard}>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="subtitle">Panel de Control - Administrador</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Sesion activa: {adminSesion?.nombre} ({adminSesion?.correo})
              </ThemedText>
            </View>
            <View style={styles.cardActions}>
              <Pressable onPress={() => setModalVisible(true)}>
                <ThemedView type="backgroundSelected" style={styles.newProductButton}>
                  <ThemedText type="small" style={styles.editButtonText}>
                    + Nuevo equipo
                  </ThemedText>
                </ThemedView>
              </Pressable>
              <Pressable onPress={() => router.push('/')}>
                <ThemedView style={styles.newProductButton}>
                  <ThemedText type="small">Ver Catalogo</ThemedText>
                </ThemedView>
              </Pressable>
            </View>
          </ThemedView>

          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">
              Solicitudes e Historial de Prestamos ({prestamosFiltrados.length})
            </ThemedText>
            <View style={styles.filterRow}>
              {(['Todos', 'Pendiente', 'Aprobado', 'Devuelto'] as const).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFiltro(f)}
                  style={[styles.filterBtn, filtro === f && styles.filterBtnActive]}>
                  <Text
                    style={[
                      styles.filterBtnText,
                      filtro === f && styles.filterBtnTextActive,
                    ]}>
                    {f === 'Aprobado' ? 'Prestamos Activos' : f}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {loading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Cargando prestamos...
            </ThemedText>
          ) : prestamosFiltrados.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" themeColor="textSecondary">
                No hay registros de prestamos en este filtro.
              </ThemedText>
            </ThemedView>
          ) : (
            prestamosFiltrados.map((item) => (
              <ThemedView key={item.id} type="backgroundElement" style={styles.card}>
                <View style={styles.cardInfo}>
                  <View style={styles.rowBetween}>
                    <ThemedText type="smallBold">
                      {item.equipos?.nombre ?? `Equipo #${item.equipo_id}`}
                    </ThemedText>
                    <View
                      style={[
                        styles.estadoBadge,
                        { backgroundColor: colorEstado(item.estado) },
                      ]}>
                      <Text style={styles.deleteButtonText}>{item.estado}</Text>
                    </View>
                  </View>

                  <ThemedText type="small">
                    Estudiante: {item.perfiles?.nombre_completo ?? item.usuario_id}{' '}
                    {item.perfiles?.carnet ? `(${item.perfiles.carnet})` : ''}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Prestamo: {item.fecha_prestamo} | Devolucion: {item.fecha_devolucion}
                  </ThemedText>
                </View>

                <View style={styles.cardActions}>
                  {item.estado === 'Pendiente' && (
                    <>
                      <Pressable onPress={() => actualizarEstado(item, 'Aprobado')}>
                        <View style={[styles.editButton, { backgroundColor: '#10B981' }]}>
                          <Text style={styles.deleteButtonText}>Aprobar</Text>
                        </View>
                      </Pressable>

                      <Pressable onPress={() => actualizarEstado(item, 'Rechazado')}>
                        <View style={styles.deleteButton}>
                          <Text style={styles.deleteButtonText}>Rechazar</Text>
                        </View>
                      </Pressable>
                    </>
                  )}

                  {item.estado === 'Aprobado' && (
                    <Pressable onPress={() => actualizarEstado(item, 'Devuelto')}>
                      <View style={[styles.editButton, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.deleteButtonText}>Marcar Devuelto</Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </ThemedView>
            ))
          )}

          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Reporte de Equipos Mas Solicitados</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Equipos ordenados de mayor a menor segun numero de prestamos solicitados
            </ThemedText>
          </View>

          {reporte.map((item, idx) => (
            <ThemedView key={item.equipo_id} type="backgroundElement" style={styles.card}>
              <View style={styles.cardInfo}>
                <ThemedText type="smallBold">
                  #{idx + 1} - {item.nombre}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Total de solicitudes registradas: {item.total_solicitudes}
                </ThemedText>
              </View>
              <View style={[styles.estadoBadge, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.deleteButtonText}>{item.total_solicitudes} solic.</Text>
              </View>
            </ThemedView>
          ))}
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="subtitle">Nuevo equipo</ThemedText>

            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText type="smallBold">Nombre</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Osciloscopio"
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText type="smallBold">Descripcion</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Descripcion del equipo"
              />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.field}>
              <ThemedText type="smallBold">URL Imagen</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                value={imagenUrl}
                onChangeText={setImagenUrl}
                placeholder="https://..."
              />
            </ThemedView>

            <Pressable onPress={guardarEquipo}>
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                <ThemedText type="small" style={styles.saveButtonText}>
                  Guardar equipo
                </ThemedText>
              </ThemedView>
            </Pressable>

            <Pressable onPress={() => setModalVisible(false)}>
              <ThemedView style={styles.cancelButton}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </ThemedView>
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
  restrictedCard: {
    marginTop: Spacing.five,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  adminHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    marginTop: Spacing.two,
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  newProductButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  listContent: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingBottom: Spacing.four,
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
  cardInfo: {
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  editButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  editButtonText: {
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  estadoBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    alignSelf: 'stretch',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  field: {
    gap: Spacing.two,
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
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
