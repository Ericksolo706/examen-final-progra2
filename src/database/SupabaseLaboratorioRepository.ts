import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Equipo,
  EstadoPrestamo,
  NuevoEquipo,
  Prestamo,
  ReporteEquipo,
} from '../models/Laboratorio';
import type { ILaboratorioRepository } from './ILaboratorioRepository';

// Patron Singleton para la configuracion de dias de prestamo
export class ConfigService {
  private static instancia: ConfigService | null = null;
  public diasPrestamo: number = 3;

  private constructor() {}

  static getInstance(): ConfigService {
    if (ConfigService.instancia === null) {
      ConfigService.instancia = new ConfigService();
    }
    return ConfigService.instancia;
  }
}

// Clase abstracta para validar reglas del prestamo
abstract class ReglaBase {
  public descripcion: string;

  constructor(descripcion: string) {
    this.descripcion = descripcion;
  }

  abstract puedeCambiarEstado(actual: EstadoPrestamo, nuevo: EstadoPrestamo): boolean;
}

class ReglaEstadoPrestamo extends ReglaBase {
  constructor() {
    super('Validacion de flujo de estados del prestamo');
  }

  puedeCambiarEstado(actual: EstadoPrestamo, nuevo: EstadoPrestamo): boolean {
    if (actual === 'Pendiente' && (nuevo === 'Aprobado' || nuevo === 'Rechazado')) {
      return true;
    }
    if (actual === 'Aprobado' && nuevo === 'Devuelto') {
      return true;
    }
    return false;
  }
}

export const IMAGEN_EQUIPO_POR_DEFECTO =
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400';

const EQUIPOS_STORAGE_KEY = 'equipos_lab_v2';

const EQUIPOS_BASE: Equipo[] = [
  {
    id: 1,
    nombre: 'Osciloscopio Digital',
    descripcion: 'Osciloscopio de 2 canales para laboratorio de electronica',
    imagen_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
    disponible: true,
  },
  {
    id: 2,
    nombre: 'Kit Arduino Mega',
    descripcion: 'Placa Arduino Mega con sensores y cables para practicas',
    imagen_url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=400',
    disponible: true,
  },
  {
    id: 3,
    nombre: 'Raspberry Pi 5',
    descripcion: 'Mini computadora para practicas de redes y sistemas',
    imagen_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400',
    disponible: true,
  },
  {
    id: 4,
    nombre: 'Multimetro Digital Fluke',
    descripcion: 'Medidor de voltaje, corriente y continuidad',
    imagen_url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400',
    disponible: true,
  },
];

export class SupabaseLaboratorioRepository implements ILaboratorioRepository {
  private regla = new ReglaEstadoPrestamo();
  private config = ConfigService.getInstance();

  constructor(private cliente: SupabaseClient) {}

  private async obtenerEquiposRespaldo(): Promise<Equipo[]> {
    const guardado = await AsyncStorage.getItem(EQUIPOS_STORAGE_KEY);
    if (!guardado) {
      await AsyncStorage.setItem(EQUIPOS_STORAGE_KEY, JSON.stringify(EQUIPOS_BASE));
      return EQUIPOS_BASE;
    }
    return JSON.parse(guardado) as Equipo[];
  }

  private async obtenerPrestamosRespaldo(): Promise<Prestamo[]> {
    const guardado = await AsyncStorage.getItem('prestamos_lab');
    return guardado ? (JSON.parse(guardado) as Prestamo[]) : [];
  }

  async obtenerEquipos(): Promise<Equipo[]> {
    const { data, error } = await this.cliente.from('equipos').select('*').order('id');
    if (!error && data && data.length > 0) {
      return data as Equipo[];
    }
    return this.obtenerEquiposRespaldo();
  }

  async crearEquipo(datos: NuevoEquipo): Promise<void> {
    const equipoConImagen: NuevoEquipo = {
      ...datos,
      imagen_url:
        datos.imagen_url.trim() !== '' ? datos.imagen_url.trim() : IMAGEN_EQUIPO_POR_DEFECTO,
    };

    const { error } = await this.cliente.from('equipos').insert(equipoConImagen);
    if (!error) return;

    const actuales = await this.obtenerEquiposRespaldo();
    const nuevo: Equipo = { id: actuales.length + 1, ...equipoConImagen };
    await AsyncStorage.setItem(EQUIPOS_STORAGE_KEY, JSON.stringify([...actuales, nuevo]));
  }

  async solicitarPrestamo(usuarioId: string, equipoId: number): Promise<void> {
    const hoy = new Date();
    const devolucion = new Date();
    devolucion.setDate(hoy.getDate() + this.config.diasPrestamo);

    const fecha_prestamo = hoy.toISOString().split('T')[0];
    const fecha_devolucion = devolucion.toISOString().split('T')[0];

    const { error } = await this.cliente.from('prestamos').insert({
      usuario_id: usuarioId,
      equipo_id: equipoId,
      fecha_prestamo,
      fecha_devolucion,
      estado: 'Pendiente',
    });

    if (!error) return;

    const equipos = await this.obtenerEquiposRespaldo();
    const equipo = equipos.find((e) => e.id === equipoId);
    if (equipo && !equipo.disponible) {
      throw new Error('El equipo no esta disponible para prestamo');
    }

    const sesionStr = await AsyncStorage.getItem('perfil_actual');
    const sesion = sesionStr ? JSON.parse(sesionStr) : null;

    const actuales = await this.obtenerPrestamosRespaldo();
    const nuevo: Prestamo = {
      id: actuales.length + 1,
      usuario_id: usuarioId,
      equipo_id: equipoId,
      fecha_prestamo,
      fecha_devolucion,
      estado: 'Pendiente',
      perfiles: sesion
        ? {
            nombre_completo: sesion.nombre,
            carnet: sesion.carnet,
            carrera: sesion.carrera,
            correo: sesion.correo,
          }
        : undefined,
      equipos: equipo
        ? {
            nombre: equipo.nombre,
            imagen_url: equipo.imagen_url,
            disponible: equipo.disponible,
          }
        : undefined,
    };

    await AsyncStorage.setItem('prestamos_lab', JSON.stringify([nuevo, ...actuales]));
  }

  async obtenerPrestamosUsuario(usuarioId: string): Promise<Prestamo[]> {
    const { data, error } = await this.cliente
      .from('prestamos')
      .select('*, equipos(nombre, imagen_url, disponible)')
      .eq('usuario_id', usuarioId)
      .order('id', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as Prestamo[];
    }
    const locales = await this.obtenerPrestamosRespaldo();
    return locales.filter((p) => p.usuario_id === usuarioId);
  }

  async obtenerPrestamos(): Promise<Prestamo[]> {
    const { data, error } = await this.cliente
      .from('prestamos')
      .select('*, perfiles(nombre_completo, carnet, carrera, correo), equipos(nombre, imagen_url, disponible)')
      .order('id', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as Prestamo[];
    }
    return this.obtenerPrestamosRespaldo();
  }

  async cambiarEstadoPrestamo(
    prestamoId: number,
    equipoId: number,
    estadoActual: EstadoPrestamo,
    nuevoEstado: EstadoPrestamo,
  ): Promise<void> {
    if (!this.regla.puedeCambiarEstado(estadoActual, nuevoEstado)) {
      throw new Error(`No se puede cambiar el estado de ${estadoActual} a ${nuevoEstado}`);
    }

    const { error } = await this.cliente
      .from('prestamos')
      .update({ estado: nuevoEstado })
      .eq('id', prestamoId);

    if (!error) {
      if (nuevoEstado === 'Aprobado') {
        await this.cliente.from('equipos').update({ disponible: false }).eq('id', equipoId);
      } else if (nuevoEstado === 'Devuelto') {
        await this.cliente.from('equipos').update({ disponible: true }).eq('id', equipoId);
      }
    }

    const prestamos = await this.obtenerPrestamosRespaldo();
    const actualizados = prestamos.map((p) =>
      p.id === prestamoId ? { ...p, estado: nuevoEstado } : p,
    );
    await AsyncStorage.setItem('prestamos_lab', JSON.stringify(actualizados));

    const equipos = await this.obtenerEquiposRespaldo();
    const equiposAct = equipos.map((e) => {
      if (e.id !== equipoId) return e;
      if (nuevoEstado === 'Aprobado') return { ...e, disponible: false };
      if (nuevoEstado === 'Devuelto') return { ...e, disponible: true };
      return e;
    });
    await AsyncStorage.setItem(EQUIPOS_STORAGE_KEY, JSON.stringify(equiposAct));
  }

  async obtenerReporteMasSolicitados(): Promise<ReporteEquipo[]> {
    const equipos = await this.obtenerEquipos();
    const prestamos = await this.obtenerPrestamos();

    const lista: ReporteEquipo[] = equipos.map((equipo) => {
      const cantidad = prestamos.filter((p) => p.equipo_id === equipo.id).length;
      return {
        equipo_id: equipo.id,
        nombre: equipo.nombre,
        total_solicitudes: cantidad,
      };
    });

    return lista.sort((a, b) => b.total_solicitudes - a.total_solicitudes);
  }
}
